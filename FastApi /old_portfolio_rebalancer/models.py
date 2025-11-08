# models.py
from pydantic import BaseModel, Field
from typing import List, Optional

class StockHolding(BaseModel):
    symbol: str
    shares: float = Field(..., gt=0)

class TargetAllocation(BaseModel):
    symbol: str
    target_percent: float = Field(..., ge=0, le=100)

class PortfolioRequest(BaseModel):
    user_id: Optional[int] = None
    holdings: List[StockHolding]
    targets: List[TargetAllocation]
    cash_buffer: Optional[float] = 0
