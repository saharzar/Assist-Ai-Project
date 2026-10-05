"""Admin inspection of saved derived samples; no camera or recording changes."""
from datetime import timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.database import get_db
from app.services.computer_vision_summary import summarize_samples
from app.models import AtmScenarioSession, BillScenarioSession, ComputerVisionSample, ComputerVisionSession, User
from app.schemas.admin_computer_vision import (
    ComputerVisionSampleRead, ComputerVisionSessionDetail, ComputerVisionSessionList, ComputerVisionSessionRead,
)

router = APIRouter(prefix="/api/admin/computer-vision-sessions", tags=["admin"],
                   dependencies=[Depends(get_current_admin)])
preview_router = APIRouter(prefix="/api/admin/computer-vision-preview", tags=["admin"],
                           dependencies=[Depends(get_current_admin)])


@preview_router.get("")
def authorize_local_preview():
    # Authorization only: no frames, landmarks or tracking values cross this endpoint.
    return {"allowed": True}


def metadata_query():
    counts = (select(ComputerVisionSample.session_id, func.count().label("sample_count"))
              .group_by(ComputerVisionSample.session_id).subquery())
    return (select(ComputerVisionSession, User.full_name, AtmScenarioSession.public_id,
                   BillScenarioSession.public_id, func.coalesce(counts.c.sample_count, 0))
            .outerjoin(User, User.id == ComputerVisionSession.user_id)
            .outerjoin(AtmScenarioSession, AtmScenarioSession.id == ComputerVisionSession.atm_session_id)
            .outerjoin(BillScenarioSession, BillScenarioSession.id == ComputerVisionSession.bill_session_id)
            .outerjoin(counts, counts.c.session_id == ComputerVisionSession.id))


def metadata(row):
    record, name, atm_attempt, bill_attempt, count = row
    return ComputerVisionSessionRead(
        session_id=record.public_id, actor_type="registered" if record.user_id else "guest",
        actor_reference=str(record.user_id if record.user_id else record.guest_session_id),
        display_name=name, scenario_key=record.scenario_key,
        scenario_session_id=atm_attempt or bill_attempt,
        started_at=record.started_at.replace(tzinfo=timezone.utc) if record.started_at.tzinfo is None else record.started_at,
        ended_at=record.ended_at.replace(tzinfo=timezone.utc) if record.ended_at.tzinfo is None else record.ended_at,
        duration_ms=record.duration_ms, sample_count=count,
    )


@router.get("", response_model=ComputerVisionSessionList)
def list_sessions(page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100),
                  scenario_key: str | None = Query(None, max_length=64),
                  db: Session = Depends(get_db)):
    query = metadata_query()
    count_query = select(func.count()).select_from(ComputerVisionSession)
    if scenario_key is not None:
        query = query.where(ComputerVisionSession.scenario_key == scenario_key)
        count_query = count_query.where(ComputerVisionSession.scenario_key == scenario_key)
    rows = db.execute(query.order_by(ComputerVisionSession.started_at.desc(), ComputerVisionSession.id.desc())
                      .offset((page - 1) * page_size).limit(page_size)).all()
    return ComputerVisionSessionList(items=[metadata(row) for row in rows],
                                    total=db.scalar(count_query),
                                    page=page, page_size=page_size)


@router.get("/{session_id}", response_model=ComputerVisionSessionDetail)
def session_detail(session_id: UUID, page: int = Query(1, ge=1), page_size: int = Query(100, ge=1, le=500),
                   db: Session = Depends(get_db)):
    row = db.execute(metadata_query().where(ComputerVisionSession.public_id == str(session_id))).first()
    if row is None:
        raise HTTPException(404, "Computer vision session not found.")
    samples = db.scalars(select(ComputerVisionSample).where(ComputerVisionSample.session_id == row[0].id)
                         .order_by(ComputerVisionSample.timestamp_ms).offset((page - 1) * page_size).limit(page_size)).all()
    # Summary covers the full saved session, independent of the visible sample page.
    summary_rows = db.execute(select(ComputerVisionSample.yaw, ComputerVisionSample.pitch, ComputerVisionSample.roll,
                                    ComputerVisionSample.estimated_eye_direction, ComputerVisionSample.is_user_interacting)
                              .where(ComputerVisionSample.session_id == row[0].id)
                              .order_by(ComputerVisionSample.timestamp_ms)).all()
    return ComputerVisionSessionDetail(session=metadata(row), summary=summarize_samples(summary_rows), page=page, page_size=page_size,
        samples=[ComputerVisionSampleRead(timestamp=sample.timestamp_ms, yaw=sample.yaw,
                 pitch=sample.pitch, roll=sample.roll, estimatedEyeDirection=sample.estimated_eye_direction,
                 isUserInteracting=sample.is_user_interacting) for sample in samples])
