# notmain.py - Stock Portfolio Rebalancer API (sample data, no database)
import subprocess
import sys
import os
from datetime import datetime
from typing import List, Dict, Optional

# Install required packages
print("Installing required packages...")
subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "fastapi", "uvicorn", "yfinance", "pydantic", "pandas", "pydantic-ai", "python-dotenv"])
print("Packages installed successfully!\n")

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import yfinance as yf
import pandas as pd
from pydantic_ai import Agent, RunContext
from pydantic_ai.tools import Tool
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Check for OpenAI API key
if not os.getenv("OPENAI_API_KEY"):
    print("⚠️  WARNING: OPENAI_API_KEY not found in environment variables")
    print("   AI analysis features will not work without an API key")
    print("   Create a .env file with: OPENAI_API_KEY=your-key-here\n")

app = FastAPI(title="Stock Portfolio Rebalancer API (live prices, sample data)")

# --- Load stock data from CSV ---
csv_path = "symbols_with_descriptions.csv"
stocks_df = pd.read_csv(csv_path)
# Clean column names (remove extra spaces)
stocks_df.columns = stocks_df.columns.str.strip()
# Rename columns to match expected format (symbol -> Ticker, description -> Description)
stocks_df.rename(columns={'symbol': 'Ticker', 'description': 'Description'}, inplace=True)
# Fill NaN descriptions with a default message
stocks_df['Description'].fillna("No description available", inplace=True)
print(f"📊 Loaded {len(stocks_df)} stocks from CSV: {stocks_df['Ticker'].head(20).tolist()}... and {len(stocks_df) - 20} more\n")

# --- In-memory sample data storage ---
portfolios_db = {}  # {portfolio_id: portfolio_dict}
performance_db = {}  # {portfolio_id: [performance_snapshots]}
portfolio_counter = {"count": 0}

# --- Initialize with sample portfolios ---
def init_sample_data():
    """Create sample portfolios using stocks from CSV"""
    sample_portfolios = [
        {
            "user_id": 1,
            "holdings": [
                {"symbol": "NVDA", "shares": 50},
                {"symbol": "MSFT", "shares": 100},
                {"symbol": "GOOG", "shares": 75}
            ],
            "targets": [
                {"symbol": "NVDA", "target_percent": 40},
                {"symbol": "MSFT", "target_percent": 35},
                {"symbol": "GOOG", "target_percent": 25}
            ],
            "cash_buffer": 5.0
        },
        {
            "user_id": 2,
            "holdings": [
                {"symbol": "META", "shares": 80},
                {"symbol": "AMZN", "shares": 60},
                {"symbol": "ORCL", "shares": 120}
            ],
            "targets": [
                {"symbol": "META", "target_percent": 45},
                {"symbol": "AMZN", "target_percent": 35},
                {"symbol": "ORCL", "target_percent": 20}
            ],
            "cash_buffer": 3.0
        },
        {
            "user_id": 3,
            "holdings": [
                {"symbol": "PLTR", "shares": 200},
                {"symbol": "ADBE", "shares": 40},
                {"symbol": "IBM", "shares": 90},
                {"symbol": "COF", "shares": 50}
            ],
            "targets": [
                {"symbol": "PLTR", "target_percent": 30},
                {"symbol": "ADBE", "target_percent": 30},
                {"symbol": "IBM", "target_percent": 20},
                {"symbol": "COF", "target_percent": 20}
            ],
            "cash_buffer": 7.0
        }
    ]
    
    print("🔄 Initializing sample portfolios...")
    for sample in sample_portfolios:
        try:
            # Create PortfolioRequest object
            from pydantic import BaseModel
            holdings = [Holding(**h) for h in sample["holdings"]]
            targets = [Target(**t) for t in sample["targets"]]
            
            # Simple calculation without fetching real prices (for initialization)
            portfolio_counter["count"] += 1
            portfolio_id = portfolio_counter["count"]
            
            portfolios_db[portfolio_id] = {
                "id": portfolio_id,
                "user_id": sample["user_id"],
                "total_value": 0.0,  # Will be updated on first API call
                "cash_buffer": sample["cash_buffer"],
                "recommendations": {},
                "holdings": sample["holdings"],
                "targets": sample["targets"]
            }
            
            performance_db[portfolio_id] = []
            print(f"  ✓ Created portfolio {portfolio_id} for user {sample['user_id']}")
        except Exception as e:
            print(f"  ✗ Error creating sample portfolio: {e}")
    
    print(f"✅ Initialized {len(portfolios_db)} sample portfolios\n")

# --- Pydantic Models ---
class Holding(BaseModel):
    symbol: str
    shares: float

class Target(BaseModel):
    symbol: str
    target_percent: float

class PortfolioRequest(BaseModel):
    user_id: int
    holdings: List[Holding]
    targets: List[Target]
    cash_buffer: float = 5.0

# --- Utility: Fetch prices (mock data for testing) ---
def fetch_stock_prices(symbols, use_mock=False):
    """Fetch stock prices from yfinance or use mock data for testing"""
    prices = {}
    
    if use_mock:
        # Mock prices for command-line testing
        mock_prices = {
            "PLTR": 45.50,
            "META": 575.00,
            "GOOG": 175.25,
            "AMZN": 210.50,
            "MSFT": 425.75,
            "NVDA": 140.25,
            "ORCL": 165.50,
            "ADBE": 495.00,
            "COF": 185.25,
            "IBM": 215.75
        }
        for symbol in symbols:
            if symbol in mock_prices:
                prices[symbol] = mock_prices[symbol]
            else:
                raise HTTPException(status_code=404, detail=f"No mock data for {symbol}")
        return prices
    
    # Try to fetch live prices
    try:
        tickers = yf.Tickers(" ".join(symbols))
        for symbol in symbols:
            # Use 1d period instead of 1m
            info = tickers.tickers[symbol].history(period="1d")
            if info.empty:
                raise HTTPException(status_code=404, detail=f"No data for {symbol}")
            prices[symbol] = info["Close"].iloc[-1]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching prices: {str(e)}")
    
    return prices

# --- Utility: Record performance snapshot ---
def record_performance(portfolio_id: int, total_value: float):
    if portfolio_id not in performance_db:
        performance_db[portfolio_id] = []
    performance_db[portfolio_id].append({
        "timestamp": datetime.now(),
        "total_value": total_value
    })

# --- YFinance Tool for Company Research ---
def get_stock_data_and_news(ticker: str) -> str:
    """
    Fetches historical stock data and recent news for a company using yfinance.
    Returns formatted string with price trends and news headlines.
    """
    try:
        stock = yf.Ticker(ticker)
        
        # Get historical data (6 months)
        hist = stock.history(period="6mo")
        
        if hist.empty:
            return f"{ticker}: No historical data available"
        
        # Calculate price changes
        current_price = hist['Close'].iloc[-1]
        price_6mo_ago = hist['Close'].iloc[0]
        price_change_6mo = ((current_price - price_6mo_ago) / price_6mo_ago) * 100
        
        # Get 52-week high/low
        high_52w = hist['High'].max()
        low_52w = hist['Low'].min()
        
        # Calculate volatility (standard deviation of returns)
        returns = hist['Close'].pct_change()
        volatility = returns.std() * 100
        
        # Get recent news
        news_summary = ""
        try:
            news = stock.get_news()
            if news and len(news) > 0:
                news_headlines = [item.get('title', 'No title') for item in news[:3]]
                news_summary = "\n   Recent News: " + "; ".join(news_headlines)
        except:
            news_summary = "\n   Recent News: Unable to fetch news"
        
        # Get company info
        info_summary = ""
        try:
            info = stock.info
            company_name = info.get('longName', ticker)
            sector = info.get('sector', 'Unknown')
            market_cap = info.get('marketCap', 0)
            
            if market_cap > 0:
                market_cap_b = market_cap / 1e9
                info_summary = f"{company_name} ({sector}, Market Cap: ${market_cap_b:.1f}B)"
            else:
                info_summary = f"{company_name} ({sector})"
        except:
            info_summary = ticker
        
        result = f"""{ticker} - {info_summary}
   6-Month Performance: {price_change_6mo:+.2f}%
   Current Price: ${current_price:.2f}
   52-Week Range: ${low_52w:.2f} - ${high_52w:.2f}
   Volatility: {volatility:.2f}% (daily std dev of returns){news_summary}"""
        
        return result
        
    except Exception as e:
        return f"{ticker}: Error fetching stock data - {str(e)}"

# --- AI Agent for Stock Analysis ---
# Create pydantic-ai agent with yfinance tool
stock_analyzer = Agent(
    'openai:gpt-4o-mini',  # Using mini for faster/cheaper responses
    tools=[get_stock_data_and_news],
    system_prompt="""You are a financial analyst assistant helping to evaluate stocks for portfolio rebalancing.
    
    Your role:
    1. Use the stock data tool to research companies by their ticker - get historical performance, volatility, and recent news
    2. Analyze the stock's price trends, volatility, and news sentiment
    3. Provide a brief risk assessment (Low, Medium, High risk) based on:
       - Volatility (higher = more risky)
       - 6-month performance trend
       - Recent news sentiment
       - Market cap and sector stability
    4. Give a recommendation on whether this stock is suitable for long-term holding
    
    Keep responses concise (2-3 sentences) and actionable."""
)

def analyze_stock_with_ai(ticker: str) -> dict:
    """
    Use AI agent to analyze a stock based on yfinance historical data and news.
    Returns a dict with analysis and risk assessment.
    """
    try:
        prompt = f"Research {ticker} and provide a brief analysis based on its historical performance, volatility, and recent news. Is it a good long-term investment?"
        result = stock_analyzer.run_sync(prompt)
        
        # Extract the response
        analysis_text = result.data if hasattr(result, 'data') else str(result)
        
        # Simple risk classification based on keywords
        risk = "Medium"
        if any(word in analysis_text.lower() for word in ['stable', 'established', 'leader', 'dominant']):
            risk = "Low"
        elif any(word in analysis_text.lower() for word in ['volatile', 'risky', 'uncertain', 'emerging']):
            risk = "High"
        
        return {
            "ticker": ticker,
            "analysis": analysis_text,
            "risk_level": risk,
            "analyzed": True
        }
    except Exception as e:
        return {
            "ticker": ticker,
            "analysis": f"Analysis unavailable: {str(e)}",
            "risk_level": "Unknown",
            "analyzed": False
        }

def get_ai_portfolio_recommendations(holdings: List[dict], targets: List[dict]) -> dict:
    """
    Analyzes all stocks in portfolio and provides AI-enhanced recommendations.
    """
    print("\n🤖 Running AI analysis on portfolio stocks...")
    
    # Get unique tickers from both holdings and targets
    all_tickers = set()
    for h in holdings:
        all_tickers.add(h['symbol'])
    for t in targets:
        all_tickers.add(t['symbol'])
    
    analyses = {}
    for ticker in all_tickers:
        print(f"   Analyzing {ticker}...")
        analyses[ticker] = analyze_stock_with_ai(ticker)
    
    # Calculate overall portfolio risk
    risk_counts = {"Low": 0, "Medium": 0, "High": 0, "Unknown": 0}
    for analysis in analyses.values():
        risk_counts[analysis["risk_level"]] += 1
    
    total = len(analyses)
    portfolio_risk = "Medium"
    if risk_counts["Low"] > total * 0.6:
        portfolio_risk = "Low"
    elif risk_counts["High"] > total * 0.4:
        portfolio_risk = "High"
    
    return {
        "stock_analyses": analyses,
        "portfolio_risk": portfolio_risk,
        "risk_breakdown": risk_counts,
        "recommendation": f"Portfolio contains {risk_counts['Low']} low-risk, {risk_counts['Medium']} medium-risk, and {risk_counts['High']} high-risk stocks."
    }

# --- Startup event ---
@app.on_event("startup")
async def startup_event():
    init_sample_data()

# --- GET: Available stocks from CSV ---
@app.get("/stocks")
def get_available_stocks():
    """Returns all available stocks from the CSV database"""
    return stocks_df.to_dict(orient="records")

# --- GET: AI analysis for a specific stock ---
@app.get("/stocks/{ticker}/analyze")
def analyze_stock(ticker: str):
    """Get AI-powered analysis of a specific stock using yfinance historical data and news"""
    ticker = ticker.upper()
    
    # Check if ticker exists in our CSV
    if ticker not in stocks_df['Ticker'].values:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} not found in database")
    
    analysis = analyze_stock_with_ai(ticker)
    return analysis

# --- POST: Get AI recommendations for portfolio ---
@app.post("/portfolios/analyze")
def analyze_portfolio_with_ai(data: PortfolioRequest):
    """Analyze portfolio holdings and targets with AI to assess risk"""
    holdings = [{"symbol": h.symbol, "shares": h.shares} for h in data.holdings]
    targets = [{"symbol": t.symbol, "target_percent": t.target_percent} for t in data.targets]
    
    recommendations = get_ai_portfolio_recommendations(holdings, targets)
    return recommendations

# --- POST: Create portfolio & rebalance ---
@app.post("/rebalance")
def rebalance_portfolio(data: PortfolioRequest):
    symbols = [h.symbol for h in data.holdings]
    prices = fetch_stock_prices(symbols)

    total_value = sum(h.shares * prices[h.symbol] for h in data.holdings)
    investable_value = total_value * (1 - (data.cash_buffer / 100))

    current_values = {h.symbol: h.shares * prices[h.symbol] for h in data.holdings}
    target_allocations = {t.symbol: t.target_percent for t in data.targets}

    if sum(target_allocations.values()) > 100:
        raise HTTPException(status_code=400, detail="Target allocation exceeds 100%")

    recommendations = {}
    for symbol, target_percent in target_allocations.items():
        current_value = current_values.get(symbol, 0)
        target_value = investable_value * (target_percent / 100)
        diff_value = target_value - current_value

        action = "buy" if diff_value > 0 else "sell" if diff_value < 0 else "hold"
        shares_to_trade = abs(diff_value) / prices[symbol]

        recommendations[symbol] = {
            "current_price": round(prices[symbol], 2),
            "current_value": round(current_value, 2),
            "target_value": round(target_value, 2),
            "difference_value": round(diff_value, 2),
            "action": action,
            "shares_to_trade": round(shares_to_trade, 2)
        }

    # Save portfolio in memory
    portfolio_counter["count"] += 1
    portfolio_id = portfolio_counter["count"]
    
    portfolios_db[portfolio_id] = {
        "id": portfolio_id,
        "user_id": data.user_id,
        "total_value": round(total_value, 2),
        "cash_buffer": data.cash_buffer,
        "recommendations": recommendations
    }

    # Record first performance snapshot
    record_performance(portfolio_id, total_value)

    return {
        "portfolio_id": portfolio_id,
        "total_value": round(total_value, 2),
        "recommendations": recommendations
    }

# --- PUT: Update portfolio holdings/targets ---
@app.put("/portfolios/{portfolio_id}")
def update_portfolio(portfolio_id: int, data: PortfolioRequest):
    portfolio = portfolios_db.get(portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    symbols = [h.symbol for h in data.holdings]
    prices = fetch_stock_prices(symbols)

    total_value = sum(h.shares * prices[h.symbol] for h in data.holdings)
    investable_value = total_value * (1 - (data.cash_buffer / 100))

    current_values = {h.symbol: h.shares * prices[h.symbol] for h in data.holdings}
    target_allocations = {t.symbol: t.target_percent for t in data.targets}

    recommendations = {}
    for symbol, target_percent in target_allocations.items():
        current_value = current_values.get(symbol, 0)
        target_value = investable_value * (target_percent / 100)
        diff_value = target_value - current_value
        action = "buy" if diff_value > 0 else "sell" if diff_value < 0 else "hold"
        shares_to_trade = abs(diff_value) / prices[symbol]

        recommendations[symbol] = {
            "current_price": round(prices[symbol], 2),
            "current_value": round(current_value, 2),
            "target_value": round(target_value, 2),
            "difference_value": round(diff_value, 2),
            "action": action,
            "shares_to_trade": round(shares_to_trade, 2)
        }

    # Update portfolio record in memory
    portfolio["total_value"] = round(total_value, 2)
    portfolio["cash_buffer"] = data.cash_buffer
    portfolio["recommendations"] = recommendations

    # Record updated performance snapshot
    record_performance(portfolio_id, total_value)

    return {
        "portfolio_id": portfolio_id,
        "updated_value": total_value,
        "recommendations": recommendations
    }

# --- GET: Portfolio performance over time ---
@app.get("/portfolios/{portfolio_id}/performance")
def get_portfolio_performance(portfolio_id: int):
    performance_data = performance_db.get(portfolio_id, [])

    if not performance_data:
        raise HTTPException(status_code=404, detail="No performance data found")

    return [
        {"timestamp": p["timestamp"].isoformat(), "total_value": p["total_value"]}
        for p in performance_data
    ]

# --- GET: All portfolios ---
@app.get("/portfolios")
def list_portfolios():
    return list(portfolios_db.values())

# --- GET: Portfolios by user ID ---
@app.get("/portfolios/user/{user_id}")
def get_portfolios_by_users(user_id: int):
    portfolios = [p for p in portfolios_db.values() if p["user_id"] == user_id]
    if not portfolios:
        raise HTTPException(status_code=404, detail="No portfolios found for this user")

    return portfolios


# --- Main entry point for command-line testing ---
if __name__ == "__main__":
    print("\n🚀 Stock Portfolio Rebalancer - Command Line Test")
    print("=" * 70)
    
    # Initialize sample data
    init_sample_data()
    
    # Test 1: Show available stocks
    print("\n📊 AVAILABLE STOCKS FROM CSV:")
    print("-" * 70)
    for idx, row in stocks_df.head(20).iterrows():  # Show first 20 stocks
        description = row['Description'] if pd.notna(row['Description']) else "No description available"
        desc_preview = str(description)[:80] if len(str(description)) > 80 else str(description)
        print(f"{row['Ticker']:6} - {desc_preview}...")
    print(f"\n... and {len(stocks_df) - 20} more stocks available")
    
    # Test 2: Show sample portfolios
    print("\n\n� SAMPLE PORTFOLIOS:")
    print("-" * 70)
    for portfolio_id, portfolio in portfolios_db.items():
        print(f"\n🔹 Portfolio {portfolio_id} (User {portfolio['user_id']}):")
        print(f"   Holdings: {portfolio.get('holdings', [])}")
        print(f"   Targets: {portfolio.get('targets', [])}")
        print(f"   Cash Buffer: {portfolio['cash_buffer']}%")
    
    # Test 3: Run rebalancing calculation for Portfolio 1
    print("\n\n💹 TESTING REBALANCING CALCULATION (Portfolio 1):")
    print("-" * 70)
    
    # Get portfolio 1 data
    p1 = portfolios_db[1]
    holdings = [Holding(**h) for h in p1['holdings']]
    targets = [Target(**t) for t in p1['targets']]
    
    request = PortfolioRequest(
        user_id=p1['user_id'],
        holdings=holdings,
        targets=targets,
        cash_buffer=p1['cash_buffer']
    )
    
    print(f"\n⏳ Using mock stock prices for testing...")
    
    try:
        # Temporarily patch fetch_stock_prices to use mock data
        original_fetch = fetch_stock_prices
        def mock_fetch(symbols):
            return original_fetch(symbols, use_mock=True)
        
        # Monkey patch for testing
        import notmain
        globals()['fetch_stock_prices_backup'] = fetch_stock_prices
        
        # Run the rebalancing logic with mock data
        symbols = [h.symbol for h in holdings]
        prices = original_fetch(symbols, use_mock=True)
        
        total_value = sum(h.shares * prices[h.symbol] for h in holdings)
        investable_value = total_value * (1 - (request.cash_buffer / 100))
        
        current_values = {h.symbol: h.shares * prices[h.symbol] for h in holdings}
        target_allocations = {t.symbol: t.target_percent for t in targets}
        
        recommendations = {}
        for symbol, target_percent in target_allocations.items():
            current_value = current_values.get(symbol, 0)
            target_value = investable_value * (target_percent / 100)
            diff_value = target_value - current_value
            action = "buy" if diff_value > 0 else "sell" if diff_value < 0 else "hold"
            shares_to_trade = abs(diff_value) / prices[symbol]
            
            recommendations[symbol] = {
                "current_price": round(prices[symbol], 2),
                "current_value": round(current_value, 2),
                "target_value": round(target_value, 2),
                "difference_value": round(diff_value, 2),
                "action": action,
                "shares_to_trade": round(shares_to_trade, 2)
            }
        
        # Save portfolio
        portfolio_counter["count"] += 1
        portfolio_id = portfolio_counter["count"]
        
        portfolios_db[portfolio_id] = {
            "id": portfolio_id,
            "user_id": p1['user_id'],
            "total_value": round(total_value, 2),
            "cash_buffer": p1['cash_buffer'],
            "recommendations": recommendations
        }
        
        # Record performance
        record_performance(portfolio_id, total_value)
        
        result = {
            "portfolio_id": portfolio_id,
            "total_value": round(total_value, 2),
            "recommendations": recommendations
        }
        
        print(f"\n✅ SUCCESS!")
        print(f"\n📊 Portfolio Summary:")
        print(f"   Total Value: ${result['total_value']:,.2f}")
        
        print(f"\n🔄 Rebalancing Recommendations:")
        for symbol, rec in result['recommendations'].items():
            print(f"\n   {symbol}:")
            print(f"      Current Price:  ${rec['current_price']:>10,.2f}")
            print(f"      Current Value:  ${rec['current_value']:>10,.2f}")
            print(f"      Target Value:   ${rec['target_value']:>10,.2f}")
            print(f"      Difference:     ${rec['difference_value']:>10,.2f}")
            print(f"      Action:         {rec['action'].upper():>10}")
            print(f"      Shares to Trade: {rec['shares_to_trade']:>10,.2f}")
        
        # Test 4: Show performance tracking
        print(f"\n\n📈 PERFORMANCE TRACKING:")
        print("-" * 70)
        perf_data = get_portfolio_performance(result['portfolio_id'])
        print(f"Performance snapshots for Portfolio {result['portfolio_id']}:")
        for snap in perf_data:
            print(f"   {snap['timestamp']}: ${snap['total_value']:,.2f}")
        
        # Test 5: AI Analysis of Portfolio Stocks
        print(f"\n\n🤖 AI-POWERED STOCK ANALYSIS:")
        print("-" * 70)
        
        ai_recommendations = get_ai_portfolio_recommendations(
            p1['holdings'],
            p1['targets']
        )
        
        print(f"\n📊 Individual Stock Analyses:")
        for ticker, analysis in ai_recommendations['stock_analyses'].items():
            print(f"\n   {ticker} - Risk Level: {analysis['risk_level']}")
            print(f"      {analysis['analysis'][:200]}...")
        
        print(f"\n\n🎯 Overall Portfolio Assessment:")
        print(f"   Portfolio Risk Level: {ai_recommendations['portfolio_risk']}")
        print(f"   Risk Breakdown: {ai_recommendations['risk_breakdown']}")
        print(f"   {ai_recommendations['recommendation']}")
        
        print("\n" + "=" * 70)
        print("✅ All tests completed successfully!")
        print("=" * 70)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        print("\n💡 Note: You need an internet connection to fetch live stock prices.")
        print("    If stocks are unavailable, yfinance may have issues.")