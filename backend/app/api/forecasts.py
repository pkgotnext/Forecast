import csv
import io
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_management
from app.models.forecast import Forecast, ForecastStage
from app.models.user import User, UserRole
from app.schemas.forecast import (
    ForecastCreate, ForecastUpdate, ForecastOut,
    ForecastListResponse, ForecastStats
)
from app.services.history import record_history

router = APIRouter(prefix="/forecasts", tags=["forecasts"])

STAGE_LABELS = {
    'prospecting': 'Prospecting',
    'proposal': 'Proposal',
    'negotiation': 'Negocjacje',
    'closed_won': 'Wygrany',
    'closed_lost': 'Przegrany',
}


def _enrich(f: Forecast) -> ForecastOut:
    out = ForecastOut.model_validate(f)
    if f.user:
        out.user_full_name = f.user.full_name
        out.user_email = f.user.email
    if f.margin is not None:
        out.weighted_margin = Decimal(str(f.margin)) * Decimal(str(f.probability)) / 100
    return out


@router.post("", response_model=ForecastOut, status_code=status.HTTP_201_CREATED)
def create_forecast(
    payload: ForecastCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.MANAGEMENT:
        raise HTTPException(status_code=403, detail="Management cannot create forecasts")

    forecast = Forecast(**payload.model_dump(), user_id=current_user.id)
    db.add(forecast)
    db.commit()
    db.refresh(forecast)
    record_history(db, forecast, 'created', current_user.id)
    db.commit()
    return _enrich(forecast)


@router.post("/recurring", status_code=status.HTTP_201_CREATED)
def create_recurring_forecast(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.MANAGEMENT:
        raise HTTPException(status_code=403, detail="Management cannot create forecasts")

    import uuid
    from datetime import date

    client_name = payload.get("client_name")
    if not client_name:
        raise HTTPException(status_code=422, detail="client_name jest wymagany")

    try:
        total_value = float(payload.get("total_value", 0))
        total_margin = float(payload.get("total_margin", 0)) if payload.get("total_margin") else None
        probability = int(payload.get("probability", 50))
    except (TypeError, ValueError) as e:
        raise HTTPException(status_code=422, detail=f"Nieprawidłowe wartości numeryczne: {e}")

    stage = payload.get("stage", "prospecting")
    notes = payload.get("notes", "")
    project_name = payload.get("project_name", "")
    open_quarter = payload.get("open_quarter")
    close_quarter = payload.get("close_quarter")

    if not open_quarter or not close_quarter:
        raise HTTPException(status_code=422, detail="open_quarter i close_quarter są wymagane")

    def parse_quarter(q):
        parts = q.split(" ")
        qnum = int(parts[0].replace("Q", ""))
        year = int(parts[1])
        return year * 4 + qnum - 1

    def quarter_to_date(q):
        parts = q.split(" ")
        qnum = int(parts[0].replace("Q", ""))
        year = int(parts[1])
        last_month = qnum * 3
        last_day = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][last_month - 1]
        return date(year, last_month, last_day)

    def index_to_quarter(idx):
        year = idx // 4
        qnum = idx % 4 + 1
        return f"Q{qnum} {year}"

    open_idx = parse_quarter(open_quarter)
    close_idx = parse_quarter(close_quarter)

    if close_idx < open_idx:
        raise HTTPException(status_code=400, detail="Kwartał zamknięcia musi być po kwartale otwarcia")

    num_quarters = close_idx - open_idx + 1
    value_per_quarter = round(total_value / num_quarters, 2)
    margin_per_quarter = round(total_margin / num_quarters, 2) if total_margin else None

    group_id = str(uuid.uuid4())

    created = []
    for i in range(num_quarters):
        q_label = index_to_quarter(open_idx + i)
        q_date = quarter_to_date(q_label)
        forecast = Forecast(
            user_id=current_user.id,
            client_name=client_name,
            project_name=project_name,
            deal_value=value_per_quarter,
            margin=margin_per_quarter,
            probability=probability,
            expected_close_date=q_date,
            stage=ForecastStage(stage),
            notes=f"[Rekurencyjny {i+1}/{num_quarters}] {notes}".strip(),
            recurring_group_id=group_id,
            wdrozenie=payload.get("wdrozenie", "nie"),
            producent=payload.get("producent"),
            data_faktury=payload.get("data_faktury"),
            data_platnosci=payload.get("data_platnosci"),
            architektura=payload.get("architektura"),
        )
        db.add(forecast)
        db.flush()
        record_history(db, forecast, 'created', current_user.id)
        created.append(forecast)

    db.commit()
    return {
        "created": len(created),
        "value_per_quarter": value_per_quarter,
        "quarters": num_quarters,
        "recurring_group_id": group_id,
    }


@router.delete("/recurring/group", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring_group(
    group_id: str = Query(..., alias="group_id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Forecast).filter(Forecast.recurring_group_id == group_id)

    if current_user.role == UserRole.SALES:
        query = query.filter(Forecast.user_id == current_user.id)

    forecasts = query.all()

    if not forecasts:
        raise HTTPException(status_code=404, detail="Grupa nie znaleziona")

    for f in forecasts:
        record_history(db, f, 'deleted', current_user.id)
    db.commit()

    for f in forecasts:
        db.delete(f)
    db.commit()

@router.put("/recurring/group/{group_id}", status_code=status.HTTP_200_OK)
def update_recurring_group(
    group_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Forecast).filter(Forecast.recurring_group_id == group_id)
    if current_user.role == UserRole.SALES:
        query = query.filter(Forecast.user_id == current_user.id)

    forecasts = query.all()
    if not forecasts:
        raise HTTPException(status_code=404, detail="Grupa nie znaleziona")

    allowed_fields = ['stage', 'probability', 'wdrozenie', 'producent',
                      'data_faktury', 'data_platnosci', 'architektura', 'client_name', 'project_name']

    for f in forecasts:
        old_data = {field: getattr(f, field) for field in [
            'client_name', 'deal_value', 'probability', 'margin', 'expected_close_date', 'stage', 'notes'
        ]}
        for field in allowed_fields:
            if field in payload and payload[field] is not None:
                setattr(f, field, payload[field])
        record_history(db, f, 'updated', current_user.id, old_data)

    db.commit()
    return {"updated": len(forecasts)}

@router.get("/my", response_model=ForecastListResponse)
def get_my_forecasts(
    stage: Optional[ForecastStage] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("expected_close_date", regex="^(expected_close_date|deal_value|probability|created_at|client_name|margin)$"),
    sort_dir: str = Query("asc", regex="^(asc|desc)$"),
    recurring: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Forecast).filter(Forecast.user_id == current_user.id)
    if stage:
        query = query.filter(Forecast.stage == stage)
    if recurring is True:
        query = query.filter(Forecast.recurring_group_id.isnot(None))
    if recurring is False:
        query = query.filter(Forecast.recurring_group_id.is_(None))

    sort_col = getattr(Forecast, sort_by)
    query = query.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return ForecastListResponse(
        items=[_enrich(f) for f in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/my/stats", response_model=ForecastStats)
def get_my_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import date
    today = date.today()
    forecasts = db.query(Forecast).filter(
        Forecast.user_id == current_user.id,
        Forecast.expected_close_date >= today,
        Forecast.stage.notin_([ForecastStage.CLOSED_LOST])
    ).all()
    return _compute_stats(forecasts)


@router.get("/management/stats", response_model=ForecastStats)
def get_all_stats(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management),
):
    query = db.query(Forecast)
    if user_id:
        query = query.filter(Forecast.user_id == user_id)
    forecasts = query.all()
    return _compute_stats(forecasts)


@router.get("/management/export/xml")
def export_xml(
    user_id: Optional[int] = None,
    stage: Optional[ForecastStage] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management),
):
    query = db.query(Forecast)
    if user_id:
        query = query.filter(Forecast.user_id == user_id)
    if stage:
        query = query.filter(Forecast.stage == stage)
    if date_from:
        query = query.filter(Forecast.expected_close_date >= date_from)
    if date_to:
        query = query.filter(Forecast.expected_close_date <= date_to)

    forecasts = query.order_by(Forecast.expected_close_date).all()

    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<forecasts>']
    for f in forecasts:
        kwartal = 'Q' + str((f.expected_close_date.month - 1) // 3 + 1) + ' ' + str(f.expected_close_date.year)
        lines.append('  <forecast>')
        lines.append(f'    <id>{f.id}</id>')
        lines.append(f'    <handlowiec>{f.user.full_name if f.user else ""}</handlowiec>')
        lines.append(f'    <email>{f.user.email if f.user else ""}</email>')
        lines.append(f'    <klient>{f.client_name}</klient>')
        lines.append(f'    <nazwa_projektu>{f.project_name or ""}</nazwa_projektu>')
        lines.append(f'    <wartosc_pln>{float(f.deal_value)}</wartosc_pln>')
        lines.append(f'    <prawdopodobienstwo>{f.probability}</prawdopodobienstwo>')
        lines.append(f'    <wartosc_wazona>{round(float(f.deal_value) * f.probability / 100, 2)}</wartosc_wazona>')
        lines.append(f'    <marza_pln>{float(f.margin) if f.margin else 0}</marza_pln>')
        lines.append(f'    <marza_wazona>{round(float(f.margin) * f.probability / 100, 2) if f.margin else 0}</marza_wazona>')
        lines.append(f'    <kwartal>{kwartal}</kwartal>')
        lines.append(f'    <etap>{STAGE_LABELS.get(f.stage.value, f.stage.value)}</etap>')
        lines.append(f'    <notatki>{f.notes or ""}</notatki>')
        lines.append(f'    <rekurencyjny>{"tak" if f.recurring_group_id else "nie"}</rekurencyjny>')
        lines.append(f'    <wdrozenie>{f.wdrozenie or "nie"}</wdrozenie>')
        lines.append(f'    <producent>{f.producent or ""}</producent>')
        lines.append(f'    <data_faktury>{f.data_faktury or ""}</data_faktury>')
        lines.append(f'    <data_platnosci>{f.data_platnosci or ""}</data_platnosci>')
        lines.append(f'    <architektura>{f.architektura or ""}</architektura>')
        lines.append(f'    <utworzono>{f.created_at.isoformat()}</utworzono>')
        lines.append(f'    <zaktualizowano>{f.updated_at.isoformat()}</zaktualizowano>')
        lines.append('  </forecast>')
    lines.append('</forecasts>')

    content = '\n'.join(lines)
    return StreamingResponse(
        iter([content]),
        media_type="application/xml",
        headers={"Content-Disposition": "attachment; filename=forecasts.xml"},
    )


@router.get("/management/history")
def get_all_history(
    user_id: Optional[int] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management),
):
    from app.models.forecast_history import ForecastHistory
    query = db.query(ForecastHistory)
    if user_id:
        query = query.filter(ForecastHistory.user_id == user_id)

    history = query.order_by(ForecastHistory.recorded_at.desc()).limit(limit).all()

    result = []
    for h in history:
        item = {
            "id": h.id,
            "recorded_at": h.recorded_at.isoformat(),
            "forecast_id": h.forecast_id,
            "change_type": h.change_type,
            "changed_fields": h.changed_fields,
            "client_name": h.client_name,
            "deal_value": float(h.deal_value),
            "probability": h.probability,
            "margin": float(h.margin) if h.margin else None,
            "stage": h.stage.value,
        }
        if h.user_id:
            owner = db.query(User).filter(User.id == h.user_id).first()
            item["user_full_name"] = owner.full_name if owner else None
        if h.changed_by_id:
            author = db.query(User).filter(User.id == h.changed_by_id).first()
            item["changed_by_name"] = author.full_name if author else None
        result.append(item)

    return result


@router.get("", response_model=ForecastListResponse)
def get_all_forecasts(
    user_id: Optional[int] = None,
    stage: Optional[ForecastStage] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    sort_by: str = Query("expected_close_date", regex="^(expected_close_date|deal_value|probability|created_at|client_name|margin)$"),
    sort_dir: str = Query("asc", regex="^(asc|desc)$"),
    recurring: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management),
):
    query = db.query(Forecast)

    if user_id:
        query = query.filter(Forecast.user_id == user_id)
    if stage:
        query = query.filter(Forecast.stage == stage)
    if recurring is True:
        query = query.filter(Forecast.recurring_group_id.isnot(None))
    if recurring is False:
        query = query.filter(Forecast.recurring_group_id.is_(None))
    if date_from:
        query = query.filter(Forecast.expected_close_date >= date_from)
    if date_to:
        query = query.filter(Forecast.expected_close_date <= date_to)

    sort_col = getattr(Forecast, sort_by)
    query = query.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return ForecastListResponse(
        items=[_enrich(f) for f in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{forecast_id}/history")
def get_forecast_history(
    forecast_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.forecast_history import ForecastHistory
    forecast = db.query(Forecast).filter(Forecast.id == forecast_id).first()
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")
    if current_user.role == UserRole.SALES and forecast.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    history = db.query(ForecastHistory).filter(
        ForecastHistory.forecast_id == forecast_id
    ).order_by(ForecastHistory.recorded_at.desc()).all()

    result = []
    for h in history:
        item = {
            "id": h.id,
            "recorded_at": h.recorded_at.isoformat(),
            "change_type": h.change_type,
            "changed_fields": h.changed_fields,
            "client_name": h.client_name,
            "deal_value": float(h.deal_value),
            "probability": h.probability,
            "margin": float(h.margin) if h.margin else None,
            "expected_close_date": h.expected_close_date.isoformat(),
            "stage": h.stage.value,
            "notes": h.notes,
        }
        if h.changed_by_id:
            author = db.query(User).filter(User.id == h.changed_by_id).first()
            item["changed_by_name"] = author.full_name if author else None
        result.append(item)

    return result


@router.get("/{forecast_id}", response_model=ForecastOut)
def get_forecast(
    forecast_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    forecast = db.query(Forecast).filter(Forecast.id == forecast_id).first()
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")

    if current_user.role == UserRole.SALES and forecast.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return _enrich(forecast)


@router.put("/{forecast_id}", response_model=ForecastOut)
def update_forecast(
    forecast_id: int,
    payload: ForecastUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    forecast = db.query(Forecast).filter(Forecast.id == forecast_id).first()
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")

    if forecast.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    old_data = {field: getattr(forecast, field) for field in [
        'client_name', 'deal_value', 'probability',
        'margin', 'expected_close_date', 'stage', 'notes'
    ]}

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(forecast, field, value)

    db.commit()
    db.refresh(forecast)
    record_history(db, forecast, 'updated', current_user.id, old_data)
    db.commit()
    return _enrich(forecast)


@router.delete("/{forecast_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_forecast(
    forecast_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    forecast = db.query(Forecast).filter(Forecast.id == forecast_id).first()
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")

    if forecast.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    record_history(db, forecast, 'deleted', current_user.id)
    db.commit()
    db.delete(forecast)
    db.commit()


def _compute_stats(forecasts: list) -> ForecastStats:
    by_stage = {s.value: 0 for s in ForecastStage}
    total_value = Decimal("0")
    weighted_value = Decimal("0")

    for f in forecasts:
        by_stage[f.stage.value] += 1
        total_value += Decimal(str(f.deal_value))
        weighted_value += Decimal(str(f.deal_value)) * Decimal(str(f.probability)) / 100

    return ForecastStats(
        total_deals=len(forecasts),
        total_value=total_value,
        weighted_value=weighted_value,
        by_stage=by_stage,
    )