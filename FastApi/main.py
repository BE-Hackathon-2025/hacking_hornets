# main.py
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
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

# Agent A: For users with no portfolios (new users)
@app.post("/agent_a")
async def agent_a(request: AgentRequest):
    """
    Agent A handles queries from users with no existing portfolios.
    Returns portfolio recommendations for new investors.
    """
    try:
        # TODO: Implement your actual agent_a logic here
        # This is a placeholder that returns example portfolio recommendations
        
        response = f"""Based on your query: "{request.query}"

I recommend starting with a diversified portfolio focusing on stable growth and AI technology:

AgentRunResult(output=PortfolioModel(portfolio=[AssetModel(name='Apple Inc', symbol='AAPL', shares=10, avgPrice=175.50), AssetModel(name='Microsoft Corporation', symbol='MSFT', shares=8, avgPrice=380.25), AssetModel(name='NVIDIA Corporation', symbol='NVDA', shares=5, avgPrice=495.75)]))

These stocks provide a balanced mix of established tech companies with strong AI initiatives."""
        
        return response
    except Exception as e:
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
async def agent_b(request: AgentRequest):
    """
    Agent B handles queries from users with existing portfolios.
    Analyzes current holdings and provides optimization recommendations.
    """
    try:
        # TODO: Implement your actual agent_b logic here
        # This is a placeholder that returns portfolio optimization recommendations
        
        portfolio_summary = ""
        if request.portfolio:
            portfolio_summary = f"\n\nCurrent Portfolio Analysis:\n"
            for holding in request.portfolio:
                portfolio_summary += f"- {holding.get('symbol', 'N/A')}: {holding.get('shares', 0)} shares\n"
        
        response = f"""Based on your query: "{request.query}"{portfolio_summary}

After analyzing your current holdings and market conditions, I recommend the following portfolio adjustments:

AgentRunResult(output=PortfolioModel(portfolio=[AssetModel(name='Tesla Inc', symbol='TSLA', shares=15, avgPrice=242.80), AssetModel(name='Amazon.com Inc', symbol='AMZN', shares=12, avgPrice=178.35), AssetModel(name='Alphabet Inc', symbol='GOOGL', shares=20, avgPrice=142.65)]))

These additions will enhance your portfolio diversification and exposure to high-growth sectors."""
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))