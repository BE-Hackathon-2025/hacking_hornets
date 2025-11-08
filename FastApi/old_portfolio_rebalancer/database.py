# database.py
from sqlalchemy import create_engine, Column, Integer, String, Float, JSON, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

DATABASE_URL = "sqlite:///./portfolio.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

class Portfolio(Base):
    __tablename__ = "portfolios"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    total_value = Column(Float)
    cash_buffer = Column(Float)
    recommendations = Column(JSON)
    performances = relationship("PortfolioPerformance", back_populates="portfolio")

class PortfolioPerformance(Base):
    __tablename__ = "portfolio_performance"
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"))
    total_value = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    portfolio = relationship("Portfolio", back_populates="performances")

def init_db():
    Base.metadata.create_all(bind=engine)
