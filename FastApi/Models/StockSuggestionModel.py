from pydantic import BaseModel, Field
from Models.TickerModel import TickerModel

class StockSuggestionModel(BaseModel):
    """Structured response to represent stock suggestions."""

    suggestions: list[TickerModel] = None