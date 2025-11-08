# main.py
from fastapi import FastAPI, HTTPException, Depends
from models import PortfolioRequest
from database import Portfolio, PortfolioPerformance, SessionLocal, init_db
from sqlalchemy.orm import Session
import yfinance as yf
from datetime import datetime

app = FastAPI(title="Stock Portfolio Rebalancer API (live prices, DB, performance tracking)")

# --- DB dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

init_db()

# --- Utility: Fetch prices ---
def fetch_stock_prices(symbols):
    prices = {}
    tickers = yf.Tickers(" ".join(symbols))
    for symbol in symbols:
        info = tickers.tickers[symbol].history(period="1m")
        if info.empty:
            raise HTTPException(status_code=404, detail=f"No data for {symbol}")
        prices[symbol] = info["Close"].iloc[-1]
    return prices

# --- Utility: Record performance snapshot ---
def record_performance(db: Session, portfolio_id: int, total_value: float):
    perf = PortfolioPerformance(portfolio_id=portfolio_id, total_value=total_value)
    db.add(perf)
    db.commit()

# --- POST: Create portfolio & rebalance ---
@app.post("/rebalance")
def rebalance_portfolio(data: PortfolioRequest, db: Session = Depends(get_db)):
    symbols = [h.symbol for h in data.holdings]
    prices = fetch_stock_prices(symbols)

    total_value = sum(h.shares * prices[h.symbol] for h in data.holdings)
    investable_value = total_value * (1 - (data.cash_buffer / 100))

    current_values = {h.symbol: h.shares * prices[h.symbol] for h in data.holdings}
    target_allocations = {t.symbol: t.target_percent for t in data.targets}

    if sum(target_allocations.values()) > 100:
        raise HTTPException(status_code=400, detail="Target allocation exceeds 100%")

    recommendations = {}
    for symbol, target_percent in target_allocations.items():
        current_value = current_values.get(symbol, 0)
        target_value = investable_value * (target_percent / 100)
        diff_value = target_value - current_value

        action = "buy" if diff_value > 0 else "sell" if diff_value < 0 else "hold"
        shares_to_trade = abs(diff_value) / prices[symbol]

        recommendations[symbol] = {
            "current_price": round(prices[symbol], 2),
            "current_value": round(current_value, 2),
            "target_value": round(target_value, 2),
            "difference_value": round(diff_value, 2),
            "action": action,
            "shares_to_trade": round(shares_to_trade, 2)
        }

    # Save portfolio
    db_portfolio = Portfolio(
        user_id=data.user_id,
        total_value=round(total_value, 2),
        cash_buffer=data.cash_buffer,
        recommendations=recommendations
    )
    db.add(db_portfolio)
    db.commit()
    db.refresh(db_portfolio)

    # Record first performance snapshot
    record_performance(db, db_portfolio.id, total_value)

    return {
        "portfolio_id": db_portfolio.id,
        "total_value": round(total_value, 2),
        "recommendations": recommendations
    }

# --- PUT: Update portfolio holdings/targets ---
@app.put("/portfolios/{portfolio_id}")
def update_portfolio(portfolio_id: int, data: PortfolioRequest, db: Session = Depends(get_db)):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    symbols = [h.symbol for h in data.holdings]
    prices = fetch_stock_prices(symbols)

    total_value = sum(h.shares * prices[h.symbol] for h in data.holdings)
    investable_value = total_value * (1 - (data.cash_buffer / 100))

    current_values = {h.symbol: h.shares * prices[h.symbol] for h in data.holdings}
    target_allocations = {t.symbol: t.target_percent for t in data.targets}

    recommendations = {}
    for symbol, target_percent in target_allocations.items():
        current_value = current_values.get(symbol, 0)
        target_value = investable_value * (target_percent / 100)
        diff_value = target_value - current_value
        action = "buy" if diff_value > 0 else "sell" if diff_value < 0 else "hold"
        shares_to_trade = abs(diff_value) / prices[symbol]

        recommendations[symbol] = {
            "current_price": round(prices[symbol], 2),
            "current_value": round(current_value, 2),
            "target_value": round(target_value, 2),
            "difference_value": round(diff_value, 2),
            "action": action,
            "shares_to_trade": round(shares_to_trade, 2)
        }

    # Update portfolio record
    portfolio.total_value = round(total_value, 2)
    portfolio.cash_buffer = data.cash_buffer
    portfolio.recommendations = recommendations
    db.commit()
    db.refresh(portfolio)

    # Record updated performance snapshot
    record_performance(db, portfolio_id, total_value)

    return {
        "portfolio_id": portfolio_id,
        "updated_value": total_value,
        "recommendations": recommendations
    }

# --- GET: Portfolio performance over time ---
@app.get("/portfolios/{portfolio_id}/performance")
def get_portfolio_performance(portfolio_id: int, db: Session = Depends(get_db)):
    performance_data = db.query(PortfolioPerformance).filter(
        PortfolioPerformance.portfolio_id == portfolio_id
    ).order_by(PortfolioPerformance.timestamp.asc()).all()

    if not performance_data:
        raise HTTPException(status_code=404, detail="No performance data found")

    return [
        {"timestamp": p.timestamp.isoformat(), "total_value": p.total_value}
        for p in performance_data
    ]

# --- GET: All portfolios ---
@app.get("/portfolios")
def list_portfolios(db: Session = Depends(get_db)):
    portfolios = db.query(Portfolio).all()
    return [
        {
            "id": p.id,
            "user_id": p.user_id,
            "total_value": p.total_value,
            "cash_buffer": p.cash_buffer,
            "recommendations": p.recommendations
        }
        for p in portfolios
    ]

# --- GET: Single portfolio by ID ---
@app.get("/portfolios/user/{user_id}")
def get_portfolios_by_users(user_id: int, db: Session = Depends(get_db)):
    portfolios = db.query(Portfolio).filter(Portfolio.user_id == user_id).all()
    if not portfolios:
        raise HTTPException(status_code=404, detail="No portfolios found for this user")

    return [
        {
            "id": p.id,
            "user_id": p.user_id,
            "total_value": p.total_value,
            "cash_buffer": p.cash_buffer,
            "recommendations": p.recommendations
        }
        for p in portfolios
    ]

@app.get("/model_request_{user_id}")
def get_portfolios_by_users(user_id: int, db: Session = Depends(get_db)):
    portfolios = db.query(Portfolio).filter(Portfolio.user_id == user_id).all()
    if not portfolios:
        raise HTTPException(status_code=404, detail="No portfolios found for this user")

    return [
        {
            "id": p.id,
            "user_id": p.user_id,
            "total_value": p.total_value,
            "cash_buffer": p.cash_buffer,
            "recommendations": p.recommendations
        }
        for p in portfolios
    ]