# main.py
from fastapi import FastAPI, HTTPException, Depends
from models import PortfolioRequest

from stock_picker.main import stock_finder
    
app = FastAPI()

@app.get("/stock_finder")
def stock_finder_endpoint(query: str):
    return stock_finder(query)