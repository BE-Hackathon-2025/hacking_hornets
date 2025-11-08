from pydantic import BaseModel, Field

class CategoryModel(BaseModel):
    """Structured response to represent a category of a stock"""

    category: str = Field(description="Category of the stock")