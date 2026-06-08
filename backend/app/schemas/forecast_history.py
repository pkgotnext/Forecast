from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel
from app.models.forecast import ForecastStage


class ForecastHistoryOut(BaseModel):
    id: int
    recorded_at: datetime
    forecast_id: Optional[int]
    user_id: Optional[int]
    client_name: str
    deal_value: Decimal
    probability: int
    margin: Optional[Decimal]
    expected_close_date: date
    stage: ForecastStage
    notes: Optional[str]
    change_type: str
    changed_fields: Optional[str]
    changed_by_id: Optional[int]

    user_full_name: Optional[str] = None
    changed_by_name: Optional[str] = None

    class Config:
        from_attributes = True