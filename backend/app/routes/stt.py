from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.stt import SttRecognitionResponse, SttUsageRequest, SttUsageResponse
from app.services.stt_service import get_or_create_stt_usage, recognize_stt_with_usage, record_stt_seconds

router = APIRouter(prefix="/api/stt", tags=["stt"])


@router.get("/usage", response_model=SttUsageResponse)
def get_stt_usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SttUsageResponse:
    usage = get_or_create_stt_usage(db, current_user.id)
    db.commit()
    return SttUsageResponse(
        stt_limit_seconds=usage.stt_limit_seconds,
        stt_used_seconds=usage.stt_used_seconds,
        stt_remaining_seconds=usage.stt_limit_seconds - usage.stt_used_seconds,
        stt_reset_date=usage.stt_reset_date,
    )


@router.post("/usage", response_model=SttUsageResponse)
def create_stt_usage(
    payload: SttUsageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SttUsageResponse:
    usage = record_stt_seconds(db, current_user.id, payload.seconds)
    return SttUsageResponse(
        stt_limit_seconds=usage.limit_seconds,
        stt_used_seconds=usage.used_seconds,
        stt_remaining_seconds=usage.remaining_seconds,
        stt_reset_date=usage.reset_date,
    )


@router.post("", response_model=SttRecognitionResponse)
async def create_stt_transcript(
    request: Request,
    language: str = Query(default="en", pattern="^(en|es|de|tr|pt|fr)$"),
    mode: str = Query(default="name", pattern="^(name|pin)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SttRecognitionResponse:
    content_type = request.headers.get("content-type", "")
    if not content_type.startswith("audio/wav"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Audio must be sent as WAV.",
        )

    audio = await request.body()
    result = recognize_stt_with_usage(db, current_user.id, audio, language, mode)
    return SttRecognitionResponse(
        transcript=result.transcript,
        detected_language=result.detected_language,
        confidence=result.confidence,
        stt_limit_seconds=result.limit_seconds,
        stt_used_seconds=result.used_seconds,
        stt_remaining_seconds=result.remaining_seconds,
        stt_reset_date=result.reset_date,
    )
