from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, ForeignKey, Enum
from app.core.database import Base
from app.models.forecast import ForecastStage


class ForecastHistory(Base):
    __tablename__ = "forecast_history"

    id = Column(Integer, primary_key=True, index=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    forecast_id = Column(Integer, ForeignKey("forecasts.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    client_name = Column(String(255), nullable=False)
    deal_value = Column(Numeric(12, 2), nullable=False)
    probability = Column(Integer, nullable=False)
    margin = Column(Numeric(12, 2), nullable=True)
    expected_close_date = Column(Date, nullable=False)
    stage = Column(Enum(ForecastStage), nullable=False)
    notes = Column(Text, nullable=True)

    change_type = Column(String(50), nullable=False)
    changed_fields = Column(Text, nullable=True)