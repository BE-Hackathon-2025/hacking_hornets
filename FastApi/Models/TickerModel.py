from pydantic import BaseModel, Field
from Models.AssetModel import AssetModel

class TickerModel(BaseModel):
    """Structured response to represent ticker for stock"""

    symbol: str = Field(description="The ticker symbol of the asset.")