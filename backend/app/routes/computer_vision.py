"""Completed derived CV recordings only; never accepts raw media or landmarks."""
from datetime import timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.atm_scenario_session import AtmScenarioSession
from app.models.bill_scenario_session import BillScenarioSession
from app.models.computer_vision_session import ComputerVisionSample, ComputerVisionSession
from app.schemas.computer_vision import ComputerVisionSessionCreate, ComputerVisionSessionSaved
from app.services.atm_analytics_service import resolve_analytics_actor

class ComputerVisionRoute(APIRoute):
    def get_route_handler(self):
        original = super().get_route_handler()

        async def validated(request):
            try:
                return await original(request)
            except RequestValidationError as error:
                # Do not echo untrusted media/landmarks or non-JSON float values
                # in validation responses. Keep standard error locations/messages.
                return JSONResponse(status_code=422, content={"detail": [
                    {key: item[key] for key in ("loc", "msg", "type")} for item in error.errors()
                ]})
        return validated


router = APIRouter(prefix="/api/computer-vision-sessions", tags=["Computer vision recordings"], route_class=ComputerVisionRoute)


def actor(db: Session = Depends(get_db), authorization: str | None = Header(default=None),
          guest_token: str | None = Header(default=None, alias="X-Guest-Session-Token")):
    # Reuse authentication, not the separate guest progress-consent flag.
    return resolve_analytics_actor(db, authorization, guest_token)


def owned_by(record, owner):
    return record.user_id == owner.user.id if owner.user else record.guest_session_id == owner.guest.id


def duplicate_result(record, payload, owner, db):
    if not owned_by(record, owner) or record.scenario_key != payload.scenario_key:
        raise HTTPException(409, "This recording identifier is already in use.")
    count = db.scalar(select(func.count()).select_from(ComputerVisionSample).where(ComputerVisionSample.session_id == record.id))
    return ComputerVisionSessionSaved(session_id=record.public_id, saved=False, sample_count=count)


@router.post("", response_model=ComputerVisionSessionSaved)
def save_session(payload: ComputerVisionSessionCreate, db: Session = Depends(get_db), owner=Depends(actor)):
    if not payload.consent:
        raise HTTPException(403, "Computer vision recording consent is required.")
    public_id = str(payload.client_session_id)
    existing = db.scalar(select(ComputerVisionSession).where(ComputerVisionSession.public_id == public_id))
    if existing:
        return duplicate_result(existing, payload, owner, db)

    attempt = None
    if payload.scenario_session_id:
        model = AtmScenarioSession if payload.scenario_key == "atm-withdrawal" else BillScenarioSession
        attempt = db.scalar(select(model).where(model.public_id == str(payload.scenario_session_id)))
        if attempt is None or not owned_by(attempt, owner):
            raise HTTPException(404, "Scenario attempt not found.")

    record = ComputerVisionSession(
        public_id=public_id, user_id=owner.user.id if owner.user else None,
        guest_session_id=owner.guest.id if owner.guest else None,
        scenario_key=payload.scenario_key, consent_given=True,
        atm_session_id=attempt.id if attempt and payload.scenario_key == "atm-withdrawal" else None,
        bill_session_id=attempt.id if attempt and payload.scenario_key == "online-bill-payment" else None,
        started_at=payload.started_at.astimezone(timezone.utc), ended_at=payload.ended_at.astimezone(timezone.utc),
        duration_ms=payload.duration_ms,
    )
    try:
        db.add(record)
        db.flush()
        db.add_all([ComputerVisionSample(session_id=record.id, timestamp_ms=sample.timestamp,
                    yaw=sample.yaw, pitch=sample.pitch, roll=sample.roll,
                    estimated_eye_direction=sample.estimated_eye_direction,
                    is_user_interacting=sample.is_user_interacting) for sample in payload.samples])
        db.commit()
    except IntegrityError:
        db.rollback()
        # A concurrent retry may have won the unique public-id insert.
        existing = db.scalar(select(ComputerVisionSession).where(ComputerVisionSession.public_id == public_id))
        if existing:
            return duplicate_result(existing, payload, owner, db)
        raise
    return ComputerVisionSessionSaved(session_id=public_id, saved=True, sample_count=len(payload.samples))
