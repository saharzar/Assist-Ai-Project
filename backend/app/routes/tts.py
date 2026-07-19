from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_current_user, get_speech_actor
from app.database import get_db
from app.models.user import User
from app.models.guest_session import GuestSession
from app.schemas.tts import TtsRequest, TtsUsageResponse
from app.services.tts_service import (
    get_azure_voice_for_language,
    get_cached_tts_audio,
    get_or_create_tts_usage,
    synthesize_tts_with_cache,
    reserve_tts_characters,
)
from app.services.soniox_service import get_soniox_tts_cache_voice
from app.services.speech_provider_manager import (
    get_provider_chain,
    mark_provider_failure,
    log_provider_event,
    is_quota_failure,
    record_request_result,
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
        tts_limit_characters=usage.tts_limit_characters + usage.extra_characters,
        tts_used_characters=usage.tts_used_characters,
        tts_remaining_characters=max(0, usage.tts_limit_characters + usage.extra_characters - usage.tts_used_characters),
        tts_reset_date=usage.tts_reset_date,
    )


@router.post("")
def create_tts_audio(
    payload: TtsRequest,
    speech_request_id: UUID | None = Header(default=None, alias="X-Speech-Request-ID"),
    browser_speech_supported: bool | None = Header(default=None, alias="X-Browser-Speech-Supported"),
    current_user: User | GuestSession = Depends(get_speech_actor),
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
    user_id = current_user.id if isinstance(current_user, User) else None
    decisions = get_provider_chain(db, "tts", browser_supported=browser_speech_supported)
    db.commit()
    last_error: HTTPException | None = None
    for index, decision in enumerate(decisions):
        if decision.provider == "browser":
            if user_id is not None and settings.count_browser_usage_against_user_quota:
                reserve_tts_characters(db, user_id, character_count)
            record_request_result(db, request_id, "tts", "browser", "success")
            return Response(status_code=204, headers={"X-Speech-Provider": "browser", "X-Speech-Status": decision.status})

        voice = (
            get_soniox_tts_cache_voice()
            if decision.provider == "soniox"
            else get_azure_voice_for_language(payload.language)
        )
        cached_audio = get_cached_tts_audio(db, text, payload.language, voice)
        if cached_audio is not None:
            usage = get_or_create_tts_usage(db, user_id) if user_id is not None else None
            record_request_result(db, request_id, "tts", decision.provider, "cached", was_cached=True)
            return Response(content=cached_audio.audio, media_type=cached_audio.content_type, headers={
                "X-Speech-Provider": f"{decision.provider}-cache", "X-TTS-Remaining-Characters": str(max(0, usage.tts_limit_characters + usage.extra_characters - usage.tts_used_characters)) if usage else "0",
                "X-TTS-Used-Characters": "0", "X-TTS-Limit-Characters": str(usage.tts_limit_characters + usage.extra_characters) if usage else "0",
                "X-TTS-Reset-Date": usage.tts_reset_date.isoformat() if usage and usage.tts_reset_date else "", "X-TTS-Language": payload.language, "X-TTS-Cache": "HIT",
            })
        try:
            tts_result = synthesize_tts_with_cache(
                db,
                user_id,
                text,
                payload.language,
                provider=decision.provider,
                request_id=request_id,
                cache_voice=voice,
            )
        except HTTPException as exc:
            if exc.status_code not in {502, 503, 504}:
                raise
            last_error = exc
            mark_provider_failure(
                db,
                decision.provider,
                "tts",
                str(exc.detail),
                quota_error=bool(getattr(exc, "quota_error", False)) or is_quota_failure(exc.detail),
            )
            if index + 1 < len(decisions):
                log_provider_event(db, "tts", "automatic_provider_switch", "Provider request failed.", previous_provider=decision.provider, new_provider=decisions[index + 1].provider, provider_key=decision.provider)
            db.commit()
            continue
        record_request_result(db, request_id, "tts", decision.provider, "success", characters_used=tts_result.characters_charged, was_cached=tts_result.cache_status in {"HIT", "PARTIAL"})
        return Response(content=tts_result.audio, media_type=tts_result.content_type, headers={
            "X-Speech-Provider": decision.provider, "X-TTS-Remaining-Characters": str(tts_result.remaining_characters),
            "X-TTS-Used-Characters": str(tts_result.characters_charged), "X-TTS-Limit-Characters": str(tts_result.limit_characters),
            "X-TTS-Reset-Date": tts_result.reset_date.isoformat(), "X-TTS-Language": payload.language, "X-TTS-Cache": tts_result.cache_status,
        })
    raise last_error or HTTPException(status_code=503, detail="No TTS provider is available on this device.")
