from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.tts import TtsRequest, TtsUsageResponse
from app.services.tts_service import (
    get_or_create_tts_usage,
    synthesize_tts_with_cache,
)

router = APIRouter(prefix="/api/tts", tags=["tts"])


@router.get("/usage", response_model=TtsUsageResponse)
def get_tts_usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TtsUsageResponse:
    usage = get_or_create_tts_usage(db, current_user.id)
    db.commit()
    return TtsUsageResponse(
        tts_limit_characters=usage.tts_limit_characters,
        tts_used_characters=usage.tts_used_characters,
        tts_remaining_characters=usage.tts_limit_characters - usage.tts_used_characters,
    )


@router.post("")
def create_tts_audio(
    payload: TtsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    settings = get_settings()
    text = payload.text.strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Text to speak is required.",
        )

    character_count = len(text)
    if character_count > settings.tts_max_request_characters:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Text must be {settings.tts_max_request_characters} characters or fewer.",
        )

    tts_result = synthesize_tts_with_cache(db, current_user.id, text, payload.language)

    return Response(
        content=tts_result.audio,
        media_type=tts_result.content_type,
        headers={
            "X-TTS-Remaining-Characters": str(tts_result.remaining_characters),
            "X-TTS-Used-Characters": str(tts_result.characters_charged),
            "X-TTS-Limit-Characters": str(tts_result.limit_characters),
            "X-TTS-Language": payload.language,
            "X-TTS-Cache": tts_result.cache_status,
        },
    )
