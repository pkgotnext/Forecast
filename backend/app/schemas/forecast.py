from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.forecast import ForecastStage


class ForecastBase(BaseModel):
    client_name: str = Field(..., min_length=1, max_length=255)
    deal_value: Decimal = Field(..., gt=0, decimal_places=2)
    probability: int = Field(..., ge=0, le=100)
    expected_close_date: date
    stage: ForecastStage = ForecastStage.PROSPECTING
    notes: Optional[str] = None
    project_name: Optional[str] = None
    margin: Optional[Decimal] = Field(None, ge=0)
    wdrozenie: Optional[str] = 'nie'
    producent: Optional[str] = None
    data_faktury: Optional[str] = None
    data_platnosci: Optional[str] = None
    architektura: Optional[str] = None
    recurring_group_id: Optional[str] = None


class ForecastCreate(ForecastBase):
    pass


class ForecastUpdate(BaseModel):
    client_name: Optional[str] = Field(None, min_length=1, max_length=255)
    deal_value: Optional[Decimal] = Field(None, gt=0)
    probability: Optional[int] = Field(None, ge=0, le=100)
    expected_close_date: Optional[date] = None
    stage: Optional[ForecastStage] = None
    notes: Optional[str] = None
    project_name: Optional[str] = None
    margin: Optional[Decimal] = Field(None, ge=0)
    wdrozenie: Optional[str] = None
    producent: Optional[str] = None
    data_faktury: Optional[str] = None
    data_platnosci: Optional[str] = None
    architektura: Optional[str] = None


class ForecastOut(ForecastBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    user_full_name: Optional[str] = None
    user_email: Optional[str] = None
    weighted_margin: Optional[Decimal] = None

    class Config:
        from_attributes = True


class ForecastListResponse(BaseModel):
    items: List[ForecastOut]
    total: int
    page: int
    page_size: int


class ForecastStats(BaseModel):
    total_deals: int
    total_value: Decimal
    weighted_value: Decimal
    by_stage: dict