from pydantic import BaseModel, Field

class AssetModel(BaseModel):
    """Structured response to represent an asset with its details."""

    name: str = Field(description="The name of the asset.")
    symbol: str = Field(description="The ticker symbol of the asset.")
    shares: int = Field(description="The number of shares owned.")
    avgPrice: float = Field(description="The average price at which the shares were purchased.")