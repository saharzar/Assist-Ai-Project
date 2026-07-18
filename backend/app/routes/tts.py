from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.tts import TtsRequest, TtsUsageResponse
from app.services.tts_service import (
    get_azure_voice_for_language,
    get_cached_tts_audio,
    get_or_create_tts_usage,
    synthesize_tts_with_cache,
)
from app.services.speech_provider_manager import (
    handle_provider_failure,
    record_request_result,
    resolve_provider,
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
        tts_reset_date=usage.tts_reset_date,
    )


@router.post("")
def create_tts_audio(
    payload: TtsRequest,
    speech_request_id: UUID | None = Header(default=None, alias="X-Speech-Request-ID"),
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

    request_id = str(speech_request_id or uuid4())
    decision = resolve_provider(db, "tts")
    db.commit()
    if decision.provider == "browser":
        record_request_result(db, request_id, "tts", "browser", "success")
        return Response(
            status_code=status.HTTP_204_NO_CONTENT,
            headers={
                "X-Speech-Provider": "browser",
                "X-Speech-Status": decision.status,
            },
        )

    voice = get_azure_voice_for_language(payload.language)
    cached_audio = get_cached_tts_audio(db, text, payload.language, voice)
    if cached_audio is not None:
        usage = get_or_create_tts_usage(db, current_user.id)
        record_request_result(
            db,
            request_id,
            "tts",
            "azure",
            "cached",
            was_cached=True,
        )
        return Response(
            content=cached_audio.audio,
            media_type=cached_audio.content_type,
            headers={
                "X-Speech-Provider": "azure-cache",
                "X-TTS-Remaining-Characters": str(usage.tts_limit_characters - usage.tts_used_characters),
                "X-TTS-Used-Characters": "0",
                "X-TTS-Limit-Characters": str(usage.tts_limit_characters),
                "X-TTS-Reset-Date": usage.tts_reset_date.isoformat() if usage.tts_reset_date else "",
                "X-TTS-Language": payload.language,
                "X-TTS-Cache": "HIT",
            },
        )

    try:
        tts_result = synthesize_tts_with_cache(db, current_user.id, text, payload.language)
    except HTTPException as exc:
        if exc.status_code not in {
            status.HTTP_502_BAD_GATEWAY,
            status.HTTP_503_SERVICE_UNAVAILABLE,
            status.HTTP_504_GATEWAY_TIMEOUT,
        }:
            raise
        handle_provider_failure(db, request_id, "tts", str(exc.detail))
        return Response(
            status_code=status.HTTP_204_NO_CONTENT,
            headers={"X-Speech-Provider": "browser", "X-Speech-Status": "unavailable"},
        )

    record_request_result(
        db,
        request_id,
        "tts",
        "azure",
        "success",
        characters_used=tts_result.characters_charged,
        was_cached=tts_result.cache_status in {"HIT", "PARTIAL"},
    )

    return Response(
        content=tts_result.audio,
        media_type=tts_result.content_type,
        headers={
            "X-Speech-Provider": "azure",
            "X-TTS-Remaining-Characters": str(tts_result.remaining_characters),
            "X-TTS-Used-Characters": str(tts_result.characters_charged),
            "X-TTS-Limit-Characters": str(tts_result.limit_characters),
            "X-TTS-Reset-Date": tts_result.reset_date.isoformat(),
            "X-TTS-Language": payload.language,
            "X-TTS-Cache": tts_result.cache_status,
        },
    )
