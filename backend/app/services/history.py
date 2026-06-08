import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.forecast import Forecast
from app.models.forecast_history import ForecastHistory


TRACKED_FIELDS = [
    'client_name', 'deal_value', 'probability',
    'margin', 'expected_close_date', 'stage', 'notes'
]


def record_history(
    db: Session,
    forecast: Forecast,
    change_type: str,
    changed_by_id: int,
    old_data: dict = None,
):
    changed_fields = None
    if old_data and change_type == 'updated':
        changes = []
        for field in TRACKED_FIELDS:
            old_val = str(old_data.get(field, ''))
            new_val = str(getattr(forecast, field, ''))
            if old_val != new_val:
                changes.append(field)
        changed_fields = json.dumps(changes)

    entry = ForecastHistory(
        recorded_at=datetime.utcnow(),
        forecast_id=forecast.id,
        user_id=forecast.user_id,
        changed_by_id=changed_by_id,
        client_name=forecast.client_name,
        deal_value=forecast.deal_value,
        probability=forecast.probability,
        margin=forecast.margin,
        expected_close_date=forecast.expected_close_date,
        stage=forecast.stage,
        notes=forecast.notes,
        change_type=change_type,
        changed_fields=changed_fields,
    )
    db.add(entry)