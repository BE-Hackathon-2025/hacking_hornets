from pydantic import BaseModel, Field
from Models.CategoryModel import CategoryModel

class InputModel(BaseModel):
    """Structured input model for portfolio updates."""
    Stock_categories: list[CategoryModel] = None