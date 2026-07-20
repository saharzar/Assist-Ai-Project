from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import Select, false, select
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.database import get_db
from app.models.atm_scenario_session import AtmScenarioSession
from app.models.guest_session import GuestSession
from app.models.user import User
from app.schemas.atm_analytics import (
    AtmAdminSessionRead,
    AtmAnalyticsSummary,
    AtmSessionEventCreate,
    AtmSessionFinish,
    AtmSessionRead,
    AtmSessionStart,
    AtmSessionStartResponse,
)
from app.services.atm_analytics_service import (
    create_atm_session,
    finish_atm_session,
    get_owned_session,
    record_atm_event,
    resolve_analytics_actor,
    terminate_atm_session,
)

router = APIRouter(tags=["ATM analytics"])


def _session_read(session: AtmScenarioSession) -> AtmSessionRead:
    return AtmSessionRead(
        session_id=session.public_id,
        completion_status=session.completion_status,
        success=session.success,
        duration_seconds=session.duration_seconds,
        incorrect_user_pin_count=session.incorrect_user_pin_count,
        simulated_system_error_count=session.simulated_system_error_count,
        total_pin_submission_count=session.total_pin_submission_count,
        retry_count=session.retry_count,
        final_step_reached=session.final_step_reached,
        first_pin_was_correct=session.first_pin_was_correct,
        identity_verification_attempt_count=session.identity_verification_attempt_count,
        incorrect_identity_verification_count=session.incorrect_identity_verification_count,
        identity_verification_succeeded=session.identity_verification_succeeded,
        returned_to_pin_after_verification=session.returned_to_pin_after_verification,
        security_terminated=session.security_terminated,
        termination_reason=session.termination_reason,
    )


@router.post("/api/atm-sessions/start", response_model=AtmSessionStartResponse)
def start_atm_session(
    payload: AtmSessionStart,
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
    guest_token: str | None = Header(default=None, alias="X-Guest-Session-Token"),
) -> AtmSessionStartResponse:
    actor = resolve_analytics_actor(db, authorization, guest_token)
    session = create_atm_session(
        db, actor, payload.scenario_type, payload.selected_language.lower()
    )
    return AtmSessionStartResponse(
        tracking_enabled=session is not None,
        session_id=session.public_id if session else None,
    )


@router.post("/api/atm-sessions/{session_id}/events", response_model=AtmSessionRead)
def add_atm_session_event(
    session_id: str,
    payload: AtmSessionEventCreate,
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
    guest_token: str | None = Header(default=None, alias="X-Guest-Session-Token"),
) -> AtmSessionRead:
    actor = resolve_analytics_actor(db, authorization, guest_token)
    session = get_owned_session(db, session_id, actor)
    return _session_read(record_atm_event(db, session, payload))


@router.post("/api/atm-sessions/{session_id}/complete", response_model=AtmSessionRead)
def complete_atm_session(
    session_id: str,
    payload: AtmSessionFinish,
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
    guest_token: str | None = Header(default=None, alias="X-Guest-Session-Token"),
) -> AtmSessionRead:
    actor = resolve_analytics_actor(db, authorization, guest_token)
    session = get_owned_session(db, session_id, actor)
    return _session_read(finish_atm_session(db, session, payload.final_step_reached, success=True))


@router.post("/api/atm-sessions/{session_id}/abandon", response_model=AtmSessionRead)
def abandon_atm_session(
    session_id: str,
    payload: AtmSessionFinish,
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
    guest_token: str | None = Header(default=None, alias="X-Guest-Session-Token"),
) -> AtmSessionRead:
    actor = resolve_analytics_actor(db, authorization, guest_token)
    session = get_owned_session(db, session_id, actor)
    return _session_read(finish_atm_session(db, session, payload.final_step_reached, success=False))

@router.post("/api/atm-sessions/{session_id}/terminate", response_model=AtmSessionRead)
def terminate_security_session(
    session_id: str,
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
    guest_token: str | None = Header(default=None, alias="X-Guest-Session-Token"),
) -> AtmSessionRead:
    actor = resolve_analytics_actor(db, authorization, guest_token)
    session = get_owned_session(db, session_id, actor)
    return _session_read(terminate_atm_session(db, session))


def _filtered_sessions_query(
    *,
    date_from: date | None,
    date_to: date | None,
    actor_type: str,
    completion_status: str,
    user_name: str | None,
    language: str | None,
    stt_provider: str | None,
) -> Select:
    query = select(AtmScenarioSession).outerjoin(User, AtmScenarioSession.user_id == User.id)
    if date_from:
        query = query.where(
            AtmScenarioSession.started_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc)
        )
    if date_to:
        query = query.where(
            AtmScenarioSession.started_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc)
        )
    if actor_type == "registered":
        query = query.where(AtmScenarioSession.user_id.is_not(None))
    elif actor_type == "guest":
        query = query.where(AtmScenarioSession.guest_session_id.is_not(None))
    if completion_status != "all":
        query = query.where(AtmScenarioSession.completion_status == completion_status)
    if user_name:
        query = query.where(User.full_name.ilike(f"%{user_name.strip()}%"))
    if language:
        query = query.where(AtmScenarioSession.selected_language == language.lower())
    if stt_provider:
        query = query.where(AtmScenarioSession.stt_provider == stt_provider.lower())
    return query


def _admin_session_rows(db: Session, query: Select) -> list[AtmAdminSessionRead]:
    sessions = list(db.scalars(query.order_by(AtmScenarioSession.started_at.desc())).all())
    user_ids = {item.user_id for item in sessions if item.user_id is not None}
    guest_ids = {item.guest_session_id for item in sessions if item.guest_session_id is not None}
    users = {item.id: item for item in db.scalars(select(User).where(User.id.in_(user_ids))).all()} if user_ids else {}
    guests = {
        item.id: item
        for item in db.scalars(select(GuestSession).where(GuestSession.id.in_(guest_ids))).all()
    } if guest_ids else {}

    rows: list[AtmAdminSessionRead] = []
    for item in sessions:
        if item.user_id is not None:
            actor = users.get(item.user_id)
            actor_type = "registered"
            actor_reference = str(item.user_id)
            display_name = actor.full_name if actor else "Deleted user"
        else:
            guest = guests.get(item.guest_session_id)
            actor_type = "guest"
            actor_reference = guest.analytics_guest_id if guest and guest.analytics_guest_id else "unknown"
            display_name = "Guest"
        rows.append(
            AtmAdminSessionRead(
                session_id=item.public_id,
                actor_type=actor_type,
                actor_reference=actor_reference,
                display_name=display_name,
                scenario_type=item.scenario_type,
                started_at=item.started_at,
                completed_at=item.completed_at,
                duration_seconds=item.duration_seconds,
                incorrect_user_pin_count=item.incorrect_user_pin_count,
                simulated_system_error_count=item.simulated_system_error_count,
                total_pin_submission_count=item.total_pin_submission_count,
                retry_count=item.retry_count,
                completion_status=item.completion_status,
                success=item.success,
                selected_language=item.selected_language,
                stt_provider=item.stt_provider,
                used_voice_input=item.used_voice_input,
                used_keyboard_input=item.used_keyboard_input,
                final_step_reached=item.final_step_reached,
                first_pin_was_correct=item.first_pin_was_correct,
                identity_verification_attempt_count=item.identity_verification_attempt_count,
                incorrect_identity_verification_count=item.incorrect_identity_verification_count,
                identity_verification_succeeded=item.identity_verification_succeeded,
                returned_to_pin_after_verification=item.returned_to_pin_after_verification,
                security_terminated=item.security_terminated,
                termination_reason=item.termination_reason,
            )
        )
    return rows


def _analytics_filters(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    actor_type: str = Query(default="all", pattern="^(all|registered|guest)$"),
    completion_status: str = Query(default="all", pattern="^(all|in_progress|completed|abandoned)$"),
    user_name: str | None = Query(default=None, max_length=255),
    language: str | None = Query(default=None, max_length=8),
    stt_provider: str | None = Query(default=None, max_length=32),
) -> dict:
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The start date must be before the end date.",
        )
    return {
        "date_from": date_from,
        "date_to": date_to,
        "actor_type": actor_type,
        "completion_status": completion_status,
        "user_name": user_name,
        "language": language,
        "stt_provider": stt_provider,
    }


@router.get("/admin/atm-analytics/summary", response_model=AtmAnalyticsSummary)
def get_atm_analytics_summary(
    filters: dict = Depends(_analytics_filters),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> AtmAnalyticsSummary:
    sessions = list(db.scalars(_filtered_sessions_query(**filters)).all())
    total = len(sessions)
    successful = sum(item.success for item in sessions)
    abandoned = sum(item.completion_status == "abandoned" for item in sessions)
    completed_durations = [item.duration_seconds for item in sessions if item.duration_seconds is not None]

    def average(values: list[int]) -> float:
        return round(sum(values) / len(values), 1) if values else 0.0

    return AtmAnalyticsSummary(
        total_sessions=total,
        successful_sessions=successful,
        abandoned_sessions=abandoned,
        in_progress_sessions=sum(item.completion_status == "in_progress" for item in sessions),
        success_rate=round((successful / total) * 100, 1) if total else 0.0,
        average_completion_seconds=average(completed_durations),
        average_incorrect_pin_attempts=average([item.incorrect_user_pin_count for item in sessions]),
        average_retries=average([item.retry_count for item in sessions]),
        registered_user_sessions=sum(item.user_id is not None for item in sessions),
        consenting_guest_sessions=sum(item.guest_session_id is not None for item in sessions),
        unsuccessful_sessions=sum(item.completion_status == "completed" and not item.success for item in sessions),
        security_terminated_sessions=sum(item.security_terminated for item in sessions),
        average_pin_attempts=average([item.total_pin_submission_count for item in sessions]),
        average_verification_attempts=average([item.identity_verification_attempt_count for item in sessions]),
        returned_to_pin_sessions=sum(item.returned_to_pin_after_verification for item in sessions),
        correct_first_pin_sessions=sum(item.first_pin_was_correct is True for item in sessions),
        incorrect_first_pin_sessions=sum(item.first_pin_was_correct is False for item in sessions),
    )


@router.get("/admin/atm-analytics/sessions", response_model=list[AtmAdminSessionRead])
def list_atm_analytics_sessions(
    filters: dict = Depends(_analytics_filters),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> list[AtmAdminSessionRead]:
    return _admin_session_rows(db, _filtered_sessions_query(**filters).limit(500))


@router.get(
    "/admin/atm-analytics/actors/{actor_type}/{actor_reference}",
    response_model=list[AtmAdminSessionRead],
)
def list_actor_atm_sessions(
    actor_type: str,
    actor_reference: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> list[AtmAdminSessionRead]:
    query = select(AtmScenarioSession)
    if actor_type == "registered" and actor_reference.isdigit():
        query = query.where(AtmScenarioSession.user_id == int(actor_reference))
    elif actor_type == "guest":
        query = query.join(GuestSession).where(GuestSession.analytics_guest_id == actor_reference)
    else:
        query = query.where(false())
    return _admin_session_rows(db, query)
