"""Bill practice analytics. Never accepts credentials or card details."""
from datetime import datetime, time, timezone
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.database import get_db
from app.models.bill_scenario_session import BillScenarioEvent, BillScenarioSession
from app.models.guest_session import GuestSession
from app.models.user import User
from app.routes.atm_analytics import _analytics_filters
from app.services.atm_analytics_service import resolve_analytics_actor

router = APIRouter(tags=["Bill payment analytics"])
Step = Literal["login", "bill-selection", "bill-details", "card-payment", "success"]


class Start(BaseModel):
    model_config = ConfigDict(extra="forbid")
    selected_language: Literal["en", "es", "de", "tr", "pt", "fr"]


class Event(BaseModel):
    model_config = ConfigDict(extra="forbid")
    client_event_id: UUID
    event_type: Literal["progress", "login_success", "login_failed", "validation_error", "payment_success", "back_navigation"]
    step: Step
    bill_type: Literal["electricity", "natural-gas", "water", "internet"] | None = None


class Finish(BaseModel):
    model_config = ConfigDict(extra="forbid")
    final_step_reached: Step
    reason: Literal["exit", "inactivity_timeout", "login_locked"] = "exit"
    pending_events: list[Event] = Field(default_factory=list, max_length=500)


def actor(db: Session = Depends(get_db), authorization: str | None = Header(default=None),
          guest_token: str | None = Header(default=None, alias="X-Guest-Session-Token")):
    return resolve_analytics_actor(db, authorization, guest_token)


def owned(session_id: str, db: Session = Depends(get_db), owner=Depends(actor)):
    query = select(BillScenarioSession).where(BillScenarioSession.public_id == session_id)
    query = query.where(BillScenarioSession.user_id == owner.user.id) if owner.user else query.where(BillScenarioSession.guest_session_id == owner.guest.id)
    session = db.scalar(query.with_for_update())
    if session is None or not owner.tracking_enabled:
        raise HTTPException(404, "Bill session not found.")
    return session


@router.post("/api/bill-sessions/start")
def start(payload: Start, db: Session = Depends(get_db), owner=Depends(actor)):
    if not owner.tracking_enabled:
        return {"tracking_enabled": False, "session_id": None}
    session = BillScenarioSession(public_id=str(uuid4()), user_id=owner.user.id if owner.user else None,
        guest_session_id=owner.guest.id if owner.guest else None, started_at=datetime.now(timezone.utc),
        selected_language=payload.selected_language)
    db.add(session)
    db.commit()
    return {"tracking_enabled": True, "session_id": session.public_id}


@router.post("/api/bill-sessions/{session_id}/events")
def record(payload: Event, session=Depends(owned), db: Session = Depends(get_db)):
    result = record_event(payload, session, db)
    db.commit()
    return result


def record_event(payload: Event, session: BillScenarioSession, db: Session):
    if session.completion_status != "in_progress":
        return {"recorded": False}
    duplicate = db.scalar(select(BillScenarioEvent.id).where(
        BillScenarioEvent.session_id == session.id, BillScenarioEvent.client_event_id == str(payload.client_event_id)))
    if duplicate:
        return {"recorded": False}
    if payload.event_type == "payment_success" and not payload.bill_type:
        raise HTTPException(422, "A paid bill type is required.")

    session.final_step_reached = payload.step
    if payload.event_type in ("login_success", "login_failed"):
        session.login_attempt_count += 1
        session.incorrect_login_count += payload.event_type == "login_failed"
    elif payload.event_type == "validation_error":
        session.payment_attempt_count += 1
        session.validation_error_count += 1
    elif payload.event_type == "payment_success":
        already_paid = db.scalar(select(BillScenarioEvent.id).where(
            BillScenarioEvent.session_id == session.id, BillScenarioEvent.event_type == "payment_success",
            BillScenarioEvent.bill_type == payload.bill_type))
        if not already_paid:
            session.payment_attempt_count += 1
            session.paid_bill_count += 1
            session.success = True
    elif payload.event_type == "back_navigation":
        session.back_navigation_count += 1
    db.add(BillScenarioEvent(session_id=session.id, client_event_id=str(payload.client_event_id),
        event_type=payload.event_type, step=payload.step, bill_type=payload.bill_type))
    db.flush()
    return {"recorded": True}


@router.post("/api/bill-sessions/{session_id}/finish")
def finish(payload: Finish, session=Depends(owned), db: Session = Depends(get_db)):
    if session.completion_status == "in_progress":
        for pending in payload.pending_events:
            record_event(pending, session, db)
        now = datetime.now(timezone.utc)
        session.completed_at = now
        started = session.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        session.duration_seconds = max(0, int((now - started).total_seconds()))
        session.final_step_reached = payload.final_step_reached
        session.termination_reason = payload.reason
        session.security_terminated = payload.reason == "login_locked"
        session.completion_status = "completed" if session.success or session.security_terminated else "abandoned"
        db.commit()
    return {"completion_status": session.completion_status}


def rows(db, query):
    result = []
    for session, user, guest in db.execute(query):
        row = {column.name: getattr(session, column.name) for column in BillScenarioSession.__table__.columns
               if column.name not in ("id", "user_id", "guest_session_id", "public_id")}
        row.update(session_id=session.public_id, actor_type="registered" if session.user_id else "guest",
            actor_reference=str(session.user_id) if session.user_id else guest.analytics_guest_id,
            display_name=user.full_name if user else "Guest")
        # SQLite drops timezone metadata; API timestamps always represent UTC.
        for key in ("started_at", "completed_at"):
            if row[key] is not None:
                row[key] = row[key].replace(tzinfo=timezone.utc) if row[key].tzinfo is None else row[key].astimezone(timezone.utc)
        result.append(row)
    return result


def base_query():
    return select(BillScenarioSession, User, GuestSession).outerjoin(User, BillScenarioSession.user_id == User.id).outerjoin(GuestSession, BillScenarioSession.guest_session_id == GuestSession.id)


@router.get("/api/admin/bill-analytics/sessions")
def sessions(filters: dict = Depends(_analytics_filters), db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    query = base_query()
    if filters["date_from"]:
        query = query.where(BillScenarioSession.started_at >= datetime.combine(filters["date_from"], time.min, tzinfo=timezone.utc))
    if filters["date_to"]:
        query = query.where(BillScenarioSession.started_at <= datetime.combine(filters["date_to"], time.max, tzinfo=timezone.utc))
    if filters["actor_type"] == "registered":
        query = query.where(BillScenarioSession.user_id.is_not(None))
    elif filters["actor_type"] == "guest":
        query = query.where(BillScenarioSession.guest_session_id.is_not(None))
    if filters["completion_status"] != "all":
        query = query.where(BillScenarioSession.completion_status == filters["completion_status"])
    if filters["user_name"]:
        query = query.where(User.full_name.ilike(f"%{filters['user_name'].strip()}%"))
    if filters["language"]:
        query = query.where(BillScenarioSession.selected_language == filters["language"].lower())
    return rows(db, query.order_by(BillScenarioSession.started_at.desc()))


@router.get("/api/admin/bill-analytics/actors/{actor_type}/{actor_reference}")
def history(actor_type: Literal["registered", "guest"], actor_reference: str,
            db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    query = base_query()
    if actor_type == "registered":
        if not actor_reference.isdigit():
            raise HTTPException(422, "Invalid user reference.")
        query = query.where(BillScenarioSession.user_id == int(actor_reference))
    else:
        query = query.where(GuestSession.analytics_guest_id == actor_reference)
    return rows(db, query.order_by(BillScenarioSession.started_at.desc()))
