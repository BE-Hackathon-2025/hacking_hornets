from typing import Dict, List, Optional
import nest_asyncio
from pydantic import BaseModel, Field
from pydantic_ai import Agent, ModelRetry, RunContext, Tool
from pydantic_ai.models.openai import OpenAIModel
from dotenv import load_dotenv
import os
import chromadb
import yfinance as yf
from textblob import TextBlob

from Models.InputModel_b import InputModel
from Models.PortfolioModel import PortfolioModel

test_portfolio = [
    {
        "avgPrice": 150.5,
        "name": "Apple Inc.",
        "shares": 50,
        "symbol": "AAPL",
    },
    {
        "avgPrice": 320.1,
        "name": "Microsoft Corporation",
        "shares": 30,
        "symbol": "MSFT",
    },
    {
        "avgPrice": 2800.0,
        "name": "Alphabet Inc.",
        "shares": 10,
        "symbol": "GOOGL",
    },
    {
        "avgPrice": 410.2,
        "name": "Tesla Inc.",
        "shares": 15,
        "symbol": "TSLA",
    }
]

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")

nest_asyncio.apply()

@Tool
def check_news_portfolio():
    """
    Tool to check news related to the portfolio to suggest a new adjusted portfolio.
    """
    suggestions = []
    for stock in test_portfolio:
        ticker = yf.Ticker(stock["symbol"])
        news = ticker.news[:3] if hasattr(ticker, "news") else []
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

@Tool
def check_historical_portfolio():
    """
    Tool to check historical data related to the portfolio to suggest a new adjusted portfolio.
    """
    suggestions = []
    for stock in test_portfolio:
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

agent = Agent(
    model='openai:gpt-4',
    output_type=PortfolioModel,
    deps_type=InputModel,
    tools=[check_news_portfolio],
    system_prompt="You are a finanacial assistant that helps users find stocks based on their descriptions and queries.",
)

# Example usage of basic agent
response = agent.run_sync("I want to add AI stocks to my portfolio. Rebalance my portfolio accordingly.")
print(response)