from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from pydantic_ai import Agent, Tool
from dotenv import load_dotenv
import os
import chromadb
import yfinance as yf
from textblob import TextBlob
import asyncio
from concurrent.futures import ThreadPoolExecutor

load_dotenv()

executor = ThreadPoolExecutor(max_workers=1)

class AssetModel(BaseModel):
    """Structured response to represent an asset with its details."""
    name: str = Field(description="The name of the asset.")
    symbol: str = Field(description="The ticker symbol of the asset.")
    shares: int = Field(description="The number of shares owned.")
    avgPrice: float = Field(description="The average price at which the shares were purchased.")

class PortfolioModel(BaseModel):
    """Structured response to represent a portfolio with its details."""
    portfolio: List[AssetModel] = Field(default_factory=list)
    stockpick_reason: str = Field(description="A brief reason for each stock pick in the portfolio.")

class StockSuggestion(BaseModel):
    """Stock suggestion from search."""
    ids: List[List[str]] = Field(default_factory=list)
    documents: List[List[str]] = Field(default_factory=list)
    metadatas: List[List[Dict]] = Field(default_factory=list)

def stock_search_tool(query: str) -> str:
    """
    Picks the best stocks based on the user's query by searching through a database of stock symbols and descriptions.
    """
    try:
        current_dir = os.path.dirname(__file__)
        db_path = os.path.join(current_dir, "stock_picker", "chroma_db")
        client = chromadb.PersistentClient(path=db_path)
        collection = client.get_collection("test_collection2")
        q_results = collection.query(
            query_texts=[query], 
            n_results=5
        )
        
        if q_results and "ids" in q_results and q_results["ids"]:
            results_str = "\n".join(
                f"- {ticker}" for ticker in q_results["ids"][0]
            )
            return f"Top matching stocks for '{query}':\n{results_str}"
        else:
            return "No matching stocks found for your query."
    except Exception as e:
        return f"Error searching stocks: {str(e)}"

def check_news_sentiment(portfolio: List[Dict]) -> str:
    """
    Tool to check news sentiment for portfolio stocks and suggest actions.
    """
    try:
        suggestions = []
        for stock in portfolio:
            ticker = yf.Ticker(stock["symbol"])
            try:
                news = ticker.news[:3] if hasattr(ticker, "news") else []
                headlines = [n.get("title", "") for n in news]
            except:
                headlines = []
            
            if headlines:
                sentiments = [TextBlob(headline).sentiment.polarity for headline in headlines]
                avg_sentiment = sum(sentiments) / len(sentiments)
            else:
                avg_sentiment = 0
            
            if avg_sentiment > 0.3:
                action = "increase (positive news sentiment)"
            elif avg_sentiment < -0.3:
                action = "decrease (negative news sentiment)"
            else:
                action = "hold (neutral news)"
            
            suggestions.append(
                f"- {stock['symbol']} ({stock['name']}): {action} | Sentiment: {round(avg_sentiment, 2)}"
            )
        
        return "News sentiment analysis:\n" + "\n".join(suggestions)
    except Exception as e:
        return f"Error checking news: {str(e)}"

def check_historical_performance(portfolio: List[Dict]) -> str:
    """
    Tool to check historical data for portfolio stocks and suggest actions.
    """
    try:
        suggestions = []
        for stock in portfolio:
            ticker = yf.Ticker(stock["symbol"])
            try:
                hist = ticker.history(period="1y")
                avg_close = hist["Close"].mean() if not hist.empty else None
            except:
                avg_close = None
            
            if avg_close and avg_close > stock["avgPrice"] * 1.05:
                action = "strong performer (increase position)"
            elif avg_close and avg_close < stock["avgPrice"] * 0.95:
                action = "underperformer (consider reducing)"
            else:
                action = "stable (hold position)"
            
            suggestions.append(
                f"- {stock['symbol']}: {action} | Avg 1Y: ${round(avg_close, 2) if avg_close else 'N/A'} vs Buy: ${stock['avgPrice']}"
            )
        
        return "Historical performance analysis:\n" + "\n".join(suggestions)
    except Exception as e:
        return f"Error checking historical data: {str(e)}"

# Create the portfolio agent with all tools
portfolio_agent = Agent(
    model='openai:gpt-4',
    system_prompt="""You are an expert financial advisor AI assistant. You help users manage their investment portfolios by:
    1. Analyzing their current holdings
    2. Suggesting new stocks based on their interests
    3. Checking news sentiment for their stocks
    4. Analyzing historical performance
    5. Providing actionable portfolio rebalancing advice
    
    When users ask for portfolio suggestions or rebalancing:
    - Use stock_search to find relevant stocks based on their interests
    - Use check_news to analyze sentiment for current holdings
    - Use check_historical to check performance metrics
    - Provide specific, actionable recommendations with reasoning
    - Format responses clearly with bullet points
    """,
)

async def run_portfolio_agent_async(query: str, current_portfolio: Optional[List[Dict]] = None) -> str:
    """
    Run the portfolio agent asynchronously with the user's query and current portfolio.
    Uses ThreadPoolExecutor to avoid event loop conflicts.
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, run_portfolio_agent, query, current_portfolio)

def run_portfolio_agent(query: str, current_portfolio: Optional[List[Dict]] = None) -> str:
    """
    Synchronous wrapper that runs the agent without event loop issues.
    Returns the analysis directly without async/await.
    """
    try:
        # Build context message
        context = f"User query: {query}\n\n"
        
        if current_portfolio and len(current_portfolio) > 0:
            context += "Current portfolio:\n"
            for stock in current_portfolio:
                context += f"- {stock['symbol']} ({stock.get('name', 'Unknown')}): {stock['shares']} shares @ ${stock['avgPrice']}\n"
            context += "\n"
        else:
            context += "User has no current portfolio holdings.\n\n"
        
        # Determine which tools to use based on query
        tools_info = ""
        if current_portfolio and len(current_portfolio) > 0:
            if "news" in query.lower() or "sentiment" in query.lower():
                news_analysis = check_news_sentiment(current_portfolio)
                tools_info += f"\n{news_analysis}\n\n"
            
            if "performance" in query.lower() or "historical" in query.lower() or "rebalance" in query.lower():
                hist_analysis = check_historical_performance(current_portfolio)
                tools_info += f"\n{hist_analysis}\n\n"
        
        # Check if user wants to find new stocks
        if any(keyword in query.lower() for keyword in ["find", "add", "suggest", "recommend", "new stocks", "buy"]):
            # Extract stock search query
            stock_results = stock_search_tool(query)
            tools_info += f"\n{stock_results}\n\n"
        
        # Return combined analysis directly (without calling the agent in sync context)
        # This avoids the event loop issue
        response = f"{context}\n{tools_info}\n"
        
        if tools_info:
            response += "\n💡 **Analysis Summary:**\n\n"
            response += "Based on the data above, here are my recommendations:\n\n"
            
            # Add contextual advice based on what data we gathered
            if "news" in query.lower() or "sentiment" in query.lower():
                response += "Review the sentiment scores - stocks with positive sentiment (>0.3) may be good to increase, while negative sentiment (<-0.3) suggests caution.\n\n"
            
            if "performance" in query.lower() or "historical" in query.lower() or "rebalance" in query.lower():
                response += "Check the historical performance - strong performers trading above your buy price are candidates for increasing position, while underperformers may need review.\n\n"
            
            if any(keyword in query.lower() for keyword in ["find", "add", "suggest", "recommend"]):
                response += "The stocks listed above match your search criteria. Research each before investing.\n\n"
        else:
            response += "I can help you analyze your portfolio! Try asking me to:\n"
            response += "- Check news sentiment\n"
            response += "- Analyze historical performance\n"
            response += "- Find new stocks to invest in\n"
        
        return response
        
    except Exception as e:
        return f"Error analyzing portfolio: {str(e)}"
