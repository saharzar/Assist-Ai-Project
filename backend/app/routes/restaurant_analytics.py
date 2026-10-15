"""Restaurant practice analytics using existing actor/consent conventions."""
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.security import get_current_admin
from app.database import get_db
from app.models.user import User
from app.models.restaurant_scenario_session import RestaurantScenarioEvent, RestaurantScenarioSession
from app.routes.bill_analytics import actor

router = APIRouter(tags=["Restaurant analytics"])
Meal = Literal["pasta", "chicken", "salad", "soup"]
Step = Literal["menu", "alternative", "confirmation", "success"]


class Start(BaseModel):
    model_config = ConfigDict(extra="forbid")
    selected_language: Literal["en", "es", "de", "tr", "pt", "fr"]


class Event(BaseModel):
    model_config = ConfigDict(extra="forbid")
    client_event_id: UUID
    event_type: Literal["meal_selected", "alternative_selected", "menu_reopened", "order_confirmed"]
    meal: Meal | None = None

    @model_validator(mode="after")
    def require_meal(self):
        if (self.event_type != "menu_reopened") != (self.meal is not None):
            raise ValueError("Meal selection is required only for meal events.")
        return self


class Finish(BaseModel):
    model_config = ConfigDict(extra="forbid")
    final_step_reached: Step
    pending_events: list[Event] = Field(default_factory=list, max_length=500)


def owned(session_id: UUID, db: Session = Depends(get_db), owner=Depends(actor)):
    query = select(RestaurantScenarioSession).where(RestaurantScenarioSession.public_id == str(session_id))
    query = query.where(RestaurantScenarioSession.user_id == owner.user.id) if owner.user else query.where(RestaurantScenarioSession.guest_session_id == owner.guest.id)
    session = db.scalar(query.with_for_update())
    if session is None or not owner.tracking_enabled:
        raise HTTPException(404, "Restaurant session not found.")
    return session


@router.post("/api/restaurant-sessions/start")
def start(payload: Start, db: Session = Depends(get_db), owner=Depends(actor)):
    if not owner.tracking_enabled:
        return {"tracking_enabled": False, "session_id": None}
    session = RestaurantScenarioSession(public_id=str(uuid4()), user_id=owner.user.id if owner.user else None,
        guest_session_id=owner.guest.id if owner.guest else None, started_at=datetime.now(timezone.utc), selected_language=payload.selected_language)
    db.add(session)
    db.commit()
    return {"tracking_enabled": True, "session_id": session.public_id}


def record_event(payload: Event, session: RestaurantScenarioSession, db: Session):
    if session.completion_status != "in_progress" or session.success:
        return {"recorded": False}
    if db.scalar(select(RestaurantScenarioEvent.id).where(RestaurantScenarioEvent.session_id == session.id,
            RestaurantScenarioEvent.client_event_id == str(payload.client_event_id))):
        return {"recorded": False}
    step = session.final_step_reached
    if payload.event_type == "meal_selected" and step == "menu":
        session.unavailable_meal = payload.meal
        session.final_step_reached = "alternative"
    elif payload.event_type == "alternative_selected" and step == "alternative" and payload.meal != session.unavailable_meal:
        session.selected_meal = payload.meal
        session.final_step_reached = "confirmation"
    elif payload.event_type == "menu_reopened" and step in ("alternative", "confirmation"):
        session.menu_reopen_count += 1
        session.selected_meal = None
        session.final_step_reached = "alternative"
    elif payload.event_type == "order_confirmed" and step == "confirmation" and payload.meal == session.selected_meal:
        session.success = True
        session.final_step_reached = "success"
    else:
        raise HTTPException(422, "Event does not match the restaurant step.")
    db.add(RestaurantScenarioEvent(session_id=session.id, client_event_id=str(payload.client_event_id), event_type=payload.event_type, meal=payload.meal))
    db.flush()
    return {"recorded": True}


@router.post("/api/restaurant-sessions/{session_id}/events")
def record(payload: Event, session=Depends(owned), db: Session = Depends(get_db)):
    result = record_event(payload, session, db)
    db.commit()
    return result


@router.post("/api/restaurant-sessions/{session_id}/finish")
def finish(payload: Finish, session=Depends(owned), db: Session = Depends(get_db)):
    if session.completion_status == "in_progress":
        for pending in payload.pending_events:
            record_event(pending, session, db)
        now = datetime.now(timezone.utc)
        started = session.started_at.replace(tzinfo=timezone.utc) if session.started_at.tzinfo is None else session.started_at
        session.completed_at = now
        session.duration_seconds = max(0, round((now - started).total_seconds()))
        session.completion_status = "completed" if session.success else "abandoned"
        db.commit()
    return {"completion_status": session.completion_status}


@router.get("/api/admin/restaurant-analytics/sessions", dependencies=[Depends(get_current_admin)])
def list_sessions(page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100), db: Session = Depends(get_db)):
    query = (select(RestaurantScenarioSession, User.full_name).outerjoin(User, User.id == RestaurantScenarioSession.user_id)
             .order_by(RestaurantScenarioSession.started_at.desc(), RestaurantScenarioSession.id.desc()))
    items = []
    for session, name in db.execute(query.offset((page - 1) * page_size).limit(page_size)):
        started = session.started_at.replace(tzinfo=timezone.utc) if session.started_at.tzinfo is None else session.started_at
        items.append(dict(session_id=session.public_id, display_name=name, actor_type="registered" if session.user_id else "guest",
            started_at=started, duration_seconds=session.duration_seconds, completion_status=session.completion_status,
            final_step_reached=session.final_step_reached, unavailable_meal=session.unavailable_meal, selected_meal=session.selected_meal,
            menu_reopen_count=session.menu_reopen_count, selected_language=session.selected_language))
    return dict(items=items, total=db.scalar(select(func.count()).select_from(RestaurantScenarioSession)), page=page, page_size=page_size)
