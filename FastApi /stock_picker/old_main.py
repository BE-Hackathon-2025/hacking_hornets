import os
import sys
import wikipedia
from pydantic import Field
from pydantic_ai import Agent, Tool
from dotenv import load_dotenv
import yfinance as yf
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import chromadb

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")

csv_path = "CSV for the group - Sheet1.csv"
stocks_df = pd.read_csv(csv_path)

@Tool
def pick_best_stock(query: str = Field(description="words related to the query that would categorize its stock description")) -> str:
    """
    Picks the best stocks based on the user's query by querying the collection.
    """
    client = chromadb.PersistentClient(path="/Users/mannyfowler/Desktop/besmart code/chroma_db")  # Use the same path as when you created it
    collection = client.get_collection("test_collection2")
    q_results = collection.query(
        query_texts=[query], 
        n_results= 3 
    )

    #print(q_results)
    if q_results and "ids" in q_results and q_results["ids"]:
        results_str = "\n".join(
            f"{i+1}. {ticker}" for i, ticker in enumerate(q_results["ids"][0])
        )
        return f"Top matching stocks for '{query}':\n{results_str}"
    else:
        return "No matching stocks found for your query."


agent = Agent(
    'openai:gpt-4',
    tools=[pick_best_stock],
    system_prompt='You are a finanacial assistant that helps users find stocks based on their descriptions and queries.',
)

result = agent.run_sync('What are some good technology stocks to invest in?')

print(result.output if hasattr(result, "output") else result)
