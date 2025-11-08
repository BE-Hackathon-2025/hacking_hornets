import os
import sys
from pydantic import Field
from pydantic_ai import Agent, Tool
from dotenv import load_dotenv
import yfinance as yf
import chromadb
from datetime import datetime
from typing import List, Dict, Optional
import subprocess

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
def gen_update_portfolio(update_type: str):
    @Tool
    def gen_update_portfolio(
    portfolio: List[Dict] = Field(description="List of stock tickers in the user's portfolio"),
    update_type: str = Field(description="Type of update: 'news' for recent news, 'historical' for historical analysis")) -> str:
        """
        Updates the portfolio based on recent news or historical analysis.
        """

        if update_type == "news":
            results = ""
            for stock in portfolio:
                ticker = yf.Ticker(stock["symbol"])
                news = ticker.news[:2] if hasattr(ticker, "news") else []
                headlines = [n.get("title", "") for n in news]
                news_summary = "; ".join(headlines) if headlines else "No recent news."
                results = results + f"{stock['symbol']}: Price ${price}. News: {news_summary}"
        else:
            pass
        return None


    agent = Agent(
        'openai:gpt-4',
        tools=[gen_update_portfolio],
        system_prompt='You are a finanacial assistant that helps users find stocks based on their descriptions and queries.',
    )
    query = {"portfolio": test_portfolio, "update_type": update_type}

    return agent.run_sync(query).output