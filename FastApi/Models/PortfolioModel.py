from pydantic import BaseModel, Field
from Models.AssetModel import AssetModel

class PortfolioModel(BaseModel):
    """Structured response to represent a portfolio with its details."""

    portfolio: list[AssetModel] = None

    stockpick_reason: str = Field(description="A brief reason for each stock pick in the portfolio.")