# main.py
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import os
from dotenv import load_dotenv
from openai import OpenAI
import yfinance as yf
from textblob import TextBlob
import chromadb
from pydantic_ai import Agent, Tool, RunContext

# Import models
from Models.InputModel_a import InputModel as InputModel_a
from Models.InputModel_b import InputModel as InputModel_b
from Models.PortfolioModel import PortfolioModel as PortfolioModelClass
from Models.AssetModel import AssetModel as AssetModelClass
from Models.StockSuggestionModel import StockSuggestionModel

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Tool for agent_a: Search stocks from ChromaDB
@Tool
def stock_search(query: str = Field(description="words related to the query that would categorize its stock description")) -> dict:
    """
    Picks the best stocks based on the user's query by searching through a database of stock symbols and descriptions.
    """
    try:
        chroma_client = chromadb.PersistentClient(path="./stock_picker/chroma_db")
        collection = chroma_client.get_collection("test_collection2")
        q_results = collection.query(
            query_texts=[query], 
            n_results=5
        )
        return q_results
    except Exception as e:
        print(f"Error in stock_search: {e}")
        return {"documents": [], "metadatas": [], "ids": []}

# Tool for agent_b: Check news for portfolio stocks
@Tool  
def check_news_portfolio(ctx: RunContext[InputModel_b]) -> dict:
    """
    Tool to check news related to the portfolio stocks to suggest adjustments based on sentiment.
    """
    try:
        # Access portfolio from global variable (set in endpoint)
        portfolio = getattr(check_news_portfolio, 'portfolio_data', [])
        suggestions = []
        
        for stock in portfolio:
            ticker = yf.Ticker(stock["symbol"])
            news = ticker.news[:3] if hasattr(ticker, "news") and ticker.news else []
            headlines = [n.get("title", "") for n in news]
            
            if headlines:
                sentiments = [TextBlob(headline).sentiment.polarity for headline in headlines]
                avg_sentiment = sum(sentiments) / len(sentiments)
            else:
                avg_sentiment = 0
            
            if avg_sentiment > 0.3:
                action = "increase"
            elif avg_sentiment < -0.3:
                action = "decrease"
            else:
                action = "hold"
            
            suggestions.append({
                "symbol": stock["symbol"],
                "name": stock["name"],
                "shares": stock["shares"],
                "suggested_action": action,
                "sentiment_score": round(avg_sentiment, 2),
                "recent_news": headlines if headlines else ["No recent news."]
            })
        
        return {"adjusted_portfolio": suggestions}
    except Exception as e:
        print(f"Error in check_news_portfolio: {e}")
        return {"adjusted_portfolio": []}

# Tool for agent_b: Check historical data
@Tool
def check_historical_portfolio(ctx: RunContext[InputModel_b]) -> dict:
    """
    Tool to check historical data related to the portfolio stocks to suggest adjustments.
    """
    try:
        # Access portfolio from global variable (set in endpoint)
        portfolio = getattr(check_historical_portfolio, 'portfolio_data', [])
        suggestions = []
        
        for stock in portfolio:
            ticker = yf.Ticker(stock["symbol"])
            hist = ticker.history(period="1y")
            avg_close = hist["Close"].mean() if not hist.empty else None
            
            if avg_close and avg_close > stock["avgPrice"] * 1.05:
                action = "increase"
            elif avg_close and avg_close < stock["avgPrice"] * 0.95:
                action = "decrease"
            else:
                action = "hold"
            
            suggestions.append({
                "symbol": stock["symbol"],
                "name": stock["name"],
                "shares": stock["shares"],
                "suggested_action": action,
                "avg_close": round(avg_close, 2) if avg_close else "N/A"
            })
        
        return {"adjusted_portfolio": suggestions}
    except Exception as e:
        print(f"Error in check_historical_portfolio: {e}")
        return {"adjusted_portfolio": []}

# Create Agent A (for new portfolios)
agent_a = Agent(
    model='openai:gpt-4',
    output_type=PortfolioModelClass,
    deps_type=InputModel_a,
    tools=[stock_search],
    system_prompt="""You are a financial assistant that helps users create new stock portfolios based on their investment goals and preferences.

Use the stock_search tool to find relevant stocks matching the user's query. The tool will return stock symbols, names, and descriptions from a curated database.

Your task:
1. Understand the user's investment preferences from their query
2. Use stock_search to find relevant stocks
3. Select 3-7 diverse stocks from the search results
4. Assign appropriate share quantities based on a $10,000-15,000 budget
5. Use current market prices (estimate if needed)
6. Return a PortfolioModel with the recommended stocks

Focus on diversification and matching the user's stated interests."""
)

# Create Agent B (for portfolio rebalancing)
agent_b = Agent(
    model='openai:gpt-4',
    output_type=PortfolioModelClass,
    deps_type=InputModel_b,
    tools=[check_news_portfolio, check_historical_portfolio],
    system_prompt="""You are a financial assistant that helps users rebalance their existing stock portfolios.

You have access to:
- check_news_portfolio: Analyzes recent news sentiment for portfolio stocks
- check_historical_portfolio: Checks 1-year price performance vs purchase price

Your task:
1. Understand the user's rebalancing goals from their query
2. Use the tools to analyze current portfolio holdings
3. Based on news sentiment, price performance, and user's goals, suggest adjustments
4. You can increase/decrease existing positions or add new stocks
5. Return a complete PortfolioModel with all holdings (adjusted and new)

Consider the user's specific request (e.g., "add AI stocks", "reduce risk") when rebalancing."""
)
    
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add global exception handler to ensure CORS headers are always present
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Models for agent requests
class AssetModel(BaseModel):
    name: str
    symbol: str
    shares: int
    avgPrice: float

class PortfolioModel(BaseModel):
    portfolio: List[AssetModel]

class AgentRequest(BaseModel):
    query: str
    portfolio: Optional[List[dict]] = None
    availableCash: Optional[float] = 0.0

# Agent A: For users with no portfolios (new users)
@app.post("/agent_a")
async def agent_a_endpoint(request: AgentRequest):
    """
    Agent A handles queries from users with no existing portfolios.
    Returns portfolio recommendations using ChromaDB stock search.
    """
    try:
        print(f"Agent A query: {request.query}")
        print(f"Agent A available cash: ${request.availableCash}")
        
        # Add budget constraint to system instructions if cash is provided
        budget_instruction = ""
        if request.availableCash and request.availableCash > 0:
            budget_instruction = f"\n\nIMPORTANT BUDGET CONSTRAINT: The user has ${request.availableCash:.2f} available cash. Ensure the total cost of all recommended stocks (shares × avgPrice) does NOT exceed this amount. Calculate carefully and stay within budget."
        
        # Append budget instruction to query
        query_with_budget = request.query + budget_instruction
        
        # Run the agent with the user's query (use async run, not run_sync)
        result = await agent_a.run(query_with_budget, deps=InputModel_a(Stock_categories=[]))
        
        print(f"Agent A result: {result}")
        
        # Access the output data properly
        portfolio_data = result.output
        
        # Format the response to match expected output
        response_text = f"AgentRunResult(output=PortfolioModel(portfolio={portfolio_data.portfolio}))"
        
        return response_text
        
    except Exception as e:
        print(f"Error in agent_a: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# General Finance Q&A: For general finance questions not related to portfolio management
@app.post("/finance_qa")
async def finance_qa(request: AgentRequest):
    """
    Handles general finance questions using OpenAI.
    Strictly focused on financial topics only.
    """
    try:
        # Create a strictly finance-focused system prompt
        system_prompt = """You are InnoVest's Financial Expert AI Assistant, specializing exclusively in finance, investments, and economics.

Your expertise covers:
- Stock market analysis and trends
- Investment strategies and portfolio theory
- Financial instruments (stocks, bonds, ETFs, options, futures)
- Economic indicators and their impact on markets
- Company financial analysis (P/E ratios, earnings, valuations)
- Risk management and diversification
- Retirement planning and savings strategies
- Tax implications of investments
- Market sectors and industry analysis
- Financial news interpretation

CRITICAL GUIDELINES:
1. ONLY answer finance and investment-related questions
2. Keep responses UNDER 3 SENTENCES - be extremely concise and direct
3. No preambles or verbose explanations - get straight to the point
4. If asked about non-financial topics, respond with ONE sentence redirecting to finance
5. Use proper financial terminology but avoid unnecessary jargon
6. Never provide specific buy/sell recommendations without context
7. This is educational information, not financial advice

If the question is not related to finance, respond: "I'm specialized in financial and investment topics. Please ask me questions about stocks, investing, markets, or financial planning."
"""

        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.query}
            ],
            temperature=0.7,
            max_tokens=150  # Reduced to enforce brevity
        )
        
        answer = response.choices[0].message.content
        return answer
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Agent B: For users with existing portfolios
@app.post("/agent_b")
async def agent_b_endpoint(request: AgentRequest):
    """
    Agent B handles queries from users with existing portfolios.
    Analyzes current holdings and provides rebalancing recommendations using news and historical data.
    """
    try:
        print(f"Agent B query: {request.query}")
        print(f"Agent B portfolio: {request.portfolio}")
        print(f"Agent B available cash: ${request.availableCash}")
        
        # Convert portfolio to expected format
        portfolio_data = []
        if request.portfolio:
            for holding in request.portfolio:
                portfolio_data.append({
                    "symbol": holding.get('symbol', ''),
                    "name": holding.get('name', ''),
                    "shares": holding.get('shares', 0),
                    "avgPrice": holding.get('avgPrice', 0)
                })
        
        # Store portfolio data for tools to access
        check_news_portfolio.portfolio_data = portfolio_data
        check_historical_portfolio.portfolio_data = portfolio_data
        
        # Add budget constraint to system instructions if cash is provided
        budget_instruction = ""
        if request.availableCash and request.availableCash > 0:
            budget_instruction = f"\n\nIMPORTANT BUDGET CONSTRAINT: The user has ${request.availableCash:.2f} available cash for NEW purchases. When recommending to BUY new stocks or INCREASE positions, ensure the total additional cost does NOT exceed this amount. Current holdings can be sold or reduced without cash constraints. Calculate carefully."
        
        # Append budget instruction to query
        query_with_budget = request.query + budget_instruction
        
        # Create deps with InputModel_b structure
        deps = InputModel_b(
            Stock_categories=[],
            Check_news=True,
            Check_history=True
        )
        
        # Run the agent with the user's query (use async run, not run_sync)
        result = await agent_b.run(query_with_budget, deps=deps)
        
        print(f"Agent B result: {result}")
        
        # Access the output data properly
        portfolio_result = result.output
        
        # Format the response to match expected output
        response_text = f"AgentRunResult(output=PortfolioModel(portfolio={portfolio_result.portfolio}))"
        
        return response_text
        
    except Exception as e:
        print(f"Error in agent_b: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))