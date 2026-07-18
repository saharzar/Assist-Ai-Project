from dataclasses import dataclass
from datetime import datetime, timezone
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_user_from_access_token
from app.models.atm_scenario_session import AtmScenarioEvent, AtmScenarioSession
from app.models.guest_session import GuestSession
from app.models.user import User
from app.schemas.atm_analytics import AtmSessionEventCreate


@dataclass(frozen=True)
class AnalyticsActor:
    user: User | None = None
    guest: GuestSession | None = None

    @property
    def tracking_enabled(self) -> bool:
        return self.user is not None or bool(self.guest and self.guest.save_progress)


def resolve_analytics_actor(
    db: Session,
    authorization: str | None,
    guest_token: str | None,
) -> AnalyticsActor:
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header.")
        return AnalyticsActor(user=get_user_from_access_token(token, db))

    if guest_token:
        guest = db.scalar(
            select(GuestSession).where(GuestSession.guest_session_token == guest_token)
        )
        if guest is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid guest session.")
        return AnalyticsActor(guest=guest)

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login or guest mode is required.")


def create_atm_session(
    db: Session,
    actor: AnalyticsActor,
    scenario_type: str,
    selected_language: str,
) -> AtmScenarioSession | None:
    # A guest's consent is checked before adding any analytics row to the database.
    if not actor.tracking_enabled:
        return None

    now = datetime.now(timezone.utc)
    session = AtmScenarioSession(
        public_id=str(uuid.uuid4()),
        user_id=actor.user.id if actor.user else None,
        guest_session_id=actor.guest.id if actor.guest else None,
        scenario_type=scenario_type,
        selected_language=selected_language,
        started_at=now,
        final_step_reached="welcome",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_owned_session(
    db: Session,
    public_id: str,
    actor: AnalyticsActor,
    *,
    for_update: bool = False,
) -> AtmScenarioSession:
    query = select(AtmScenarioSession).where(AtmScenarioSession.public_id == public_id)
    if actor.user:
        query = query.where(AtmScenarioSession.user_id == actor.user.id)
    elif actor.guest:
        query = query.where(AtmScenarioSession.guest_session_id == actor.guest.id)
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ATM session not found.")
    if for_update:
        query = query.with_for_update()

    session = db.scalar(query)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ATM session not found.")
    return session


def record_atm_event(
    db: Session,
    session: AtmScenarioSession,
    payload: AtmSessionEventCreate,
) -> AtmScenarioSession:
    locked_session = db.scalar(
        select(AtmScenarioSession)
        .where(AtmScenarioSession.id == session.id)
        .with_for_update()
    )
    if locked_session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ATM session not found.")

    existing_event = db.scalar(
        select(AtmScenarioEvent).where(
            AtmScenarioEvent.client_event_id == str(payload.client_event_id)
        )
    )
    if existing_event:
        return locked_session
    if locked_session.completion_status != "in_progress":
        return locked_session

    event_outcome = payload.pin_outcome if payload.event_type == "pin_submission" else payload.input_mode

    if payload.event_type == "pin_submission":
        if locked_session.total_pin_submission_count == 0:
            # The practice intentionally simulates a system fault on the first full submission.
            pin_outcome = "simulated_system_error"
        elif payload.pin_outcome == "simulated_system_error":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The simulated system error can only occur on the first PIN submission.",
            )
        else:
            pin_outcome = payload.pin_outcome
        event_outcome = pin_outcome
        event = AtmScenarioEvent(
            session_id=locked_session.id,
            client_event_id=str(payload.client_event_id),
            event_type=payload.event_type,
            event_outcome=event_outcome,
        )
        db.add(event)
        locked_session.total_pin_submission_count += 1
        locked_session.retry_count = max(0, locked_session.total_pin_submission_count - 1)
        if pin_outcome == "incorrect":
            locked_session.incorrect_user_pin_count += 1
        elif pin_outcome == "simulated_system_error":
            locked_session.simulated_system_error_count += 1
    else:
        db.add(
            AtmScenarioEvent(
                session_id=locked_session.id,
                client_event_id=str(payload.client_event_id),
                event_type=payload.event_type,
                event_outcome=event_outcome,
            )
        )
    if payload.input_mode == "voice":
        locked_session.used_voice_input = True
        locked_session.stt_provider = payload.stt_provider or locked_session.stt_provider
    elif payload.input_mode == "keyboard":
        locked_session.used_keyboard_input = True
    if payload.final_step_reached:
        locked_session.final_step_reached = payload.final_step_reached

    db.commit()
    db.refresh(locked_session)
    return locked_session


def finish_atm_session(
    db: Session,
    session: AtmScenarioSession,
    final_step: str,
    *,
    success: bool,
) -> AtmScenarioSession:
    locked_session = db.scalar(
        select(AtmScenarioSession)
        .where(AtmScenarioSession.id == session.id)
        .with_for_update()
    )
    if locked_session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ATM session not found.")
    if locked_session.completion_status != "in_progress":
        return locked_session

    if success:
        successful_pin = db.scalar(
            select(AtmScenarioEvent.id).where(
                AtmScenarioEvent.session_id == locked_session.id,
                AtmScenarioEvent.event_type == "pin_submission",
                AtmScenarioEvent.event_outcome == "success",
            )
        )
        if successful_pin is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A successful PIN submission is required before completion.",
            )

    now = datetime.now(timezone.utc)
    started_at = locked_session.started_at
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    locked_session.completed_at = now
    locked_session.duration_seconds = max(0, round((now - started_at).total_seconds()))
    locked_session.completion_status = "completed" if success else "abandoned"
    locked_session.success = success
    locked_session.final_step_reached = final_step
    db.commit()
    db.refresh(locked_session)
    return locked_session
