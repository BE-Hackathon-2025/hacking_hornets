from typing import Dict, List, Optional
import nest_asyncio
from pydantic import BaseModel, Field
from pydantic_ai import Agent, ModelRetry, RunContext, Tool
from pydantic_ai.models.openai import OpenAIModel
from dotenv import load_dotenv
import os
import chromadb

from Models.AssetModel import AssetModel
from Models.InputModel_a import InputModel
from Models.PortfolioModel import PortfolioModel
from Models.StockSuggestionModel import StockSuggestionModel

#from utils.markdown import to_markdown

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
def stock_search(query: str = Field(description="words related to the query that would categorize its stock description")) -> List[AssetModel]:
    """
    Picks the best stocks based on the user's query by searching through a database of stock symbols and descriptions.
    """
    client = chromadb.PersistentClient(path="/Users/mannyfowler/Desktop/besmart code/chroma_db")  # Use the same path as when you created it
    collection = client.get_collection("test_collection2")
    q_results = collection.query(
        query_texts=[query], 
        n_results= 3 
    )
    return StockSuggestionModel(**q_results)

agent = Agent(
    model='openai:gpt-4',
    output_type=PortfolioModel,
    deps_type=InputModel,
    tools=[stock_search],
    system_prompt="You are a finanacial assistant that helps users find stocks based on their descriptions and queries.",
)



# Example usage of basic agent
response = agent.run_sync("I want to add AI stocks to my portfolio. Rebalance my portfolio accordingly.")
print(response)