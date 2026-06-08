import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Numeric, Float,
    DateTime, Date, ForeignKey, Enum, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class ForecastStage(str, enum.Enum):
    PROSPECTING = "prospecting"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"


class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    client_name = Column(String(255), nullable=False)
    deal_value = Column(Numeric(12, 2), nullable=False)
    probability = Column(Integer, nullable=False)  # 0-100
    expected_close_date = Column(Date, nullable=False)
    stage = Column(Enum(ForecastStage), nullable=False, default=ForecastStage.PROSPECTING)
    notes = Column(Text, nullable=True)
    project_name = Column(String(255), nullable=True)
    margin = Column(Numeric(12, 2), nullable=True)
    wdrozenie = Column(String(3), nullable=True, default='nie')
    producent = Column(String(255), nullable=True)
    data_faktury = Column(String(50), nullable=True)
    data_platnosci = Column(String(50), nullable=True)
    architektura = Column(Text, nullable=True)
    recurring_group_id = Column(String(36), nullable=True, index=True)

    user = relationship("User", back_populates="forecasts")