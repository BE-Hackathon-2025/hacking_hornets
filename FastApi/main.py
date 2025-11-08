# main.py
from fastapi import FastAPI, HTTPException, Depends
from models import PortfolioRequest

from stock_picker.main import stock_finder
from gen_update_portfolio.main import gen_update_portfolio
    
app = FastAPI()

@app.get("/stock_finder")
def stock_finder_endpoint(query: str):
    return stock_finder(query)

@app.get("/gen_update_portfolio")
def update_portfolio_endpoint(update_type: str):
    return {"update_type": update_type}

@app.get("/update_portfolio")
def update_portfolio(ticker: str, amount: int):
    return {"ticker": ticker, "amount": amount}