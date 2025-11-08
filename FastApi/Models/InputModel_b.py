from pydantic import BaseModel, Field
from Models.CategoryModel import CategoryModel

class InputModel(BaseModel):
    """Structured input model for portfolio updates."""
    Stock_categories: list[CategoryModel] = None
    Check_news: bool = Field(description="Flag to indicate if checking the news is required.")
    Check_history: bool = Field(description="Flag to indicate if checking historical data is required.")
    