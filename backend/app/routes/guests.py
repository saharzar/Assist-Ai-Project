import secrets
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.guest_session import GuestSession
from app.schemas.auth import GuestSessionCreate, GuestSessionRead

router = APIRouter(prefix="/guests", tags=["guests"])


@router.post("/session", response_model=GuestSessionRead, status_code=status.HTTP_201_CREATED)
def create_guest_session(
    payload: GuestSessionCreate,
    db: Session = Depends(get_db),
) -> GuestSessionRead:
    guest_session = GuestSession(
        guest_session_token=secrets.token_urlsafe(32),
        analytics_guest_id=str(uuid.uuid4()) if payload.save_progress else None,
        save_progress=payload.save_progress,
        preferred_language=payload.preferred_language,
    )
    db.add(guest_session)
    db.commit()
    db.refresh(guest_session)

    return GuestSessionRead(
        guest_session_token=guest_session.guest_session_token,
        save_progress=guest_session.save_progress,
        preferred_language=guest_session.preferred_language,
    )
