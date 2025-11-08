# main.py
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from models import PortfolioRequest
import os
from dotenv import load_dotenv

from stock_picker.main import stock_finder
from gen_update_portfolio.main import gen_update_portfolio

# Load environment variables
load_dotenv()
    
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

@app.get("/stock_finder")
def stock_finder_endpoint(query: str):
    try:
        result = stock_finder(query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/gen_update_portfolio")
def update_portfolio_endpoint(update_type: str):
    return {"update_type": update_type}

@app.get("/update_portfolio")
def update_portfolio(ticker: str, amount: int):
    return {"ticker": ticker, "amount": amount}