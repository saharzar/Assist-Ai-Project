import json
from datetime import date
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_speech_actor
from app.database import get_db
from app.models.user import User
from app.models.guest_session import GuestSession
from app.schemas.stt import SttRecognitionResponse, SttUsageRequest, SttUsageResponse
from app.services.speech_provider_manager import (
    find_processed_request,
    get_provider_chain,
    mark_provider_failure,
    log_provider_event,
    is_quota_failure,
    record_request_result,
)
from app.services.stt_service import (
    get_or_create_stt_usage,
    get_stt_usage_snapshot,
    recognize_stt_with_usage,
    record_stt_seconds,
    get_wav_duration_seconds,
    SttUsageSnapshot,
)
from app.services.soniox_service import SonioxProviderError, recognize_soniox_stt

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
    response: Response,
    language: str = Query(default="en", pattern="^(en|es|de|tr|pt|fr)$"),
    mode: str = Query(default="name", pattern="^(name|pin)$"),
    speech_request_id: UUID | None = Header(default=None, alias="X-Speech-Request-ID"),
    browser_speech_supported: bool | None = Header(default=None, alias="X-Browser-Speech-Supported"),
    current_user: User | GuestSession = Depends(get_speech_actor),
    db: Session = Depends(get_db),
) -> SttRecognitionResponse | Response:
    content_type = request.headers.get("content-type", "")
    if not content_type.startswith("audio/wav"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Audio must be sent as WAV.",
        )

    request_id = str(speech_request_id or uuid4())
    user_id = current_user.id if isinstance(current_user, User) else None
    processed = find_processed_request(db, request_id, "stt")
    if processed and processed.outcome == "success" and processed.result_payload:
        stored = json.loads(processed.result_payload)
        usage = get_stt_usage_snapshot(db, user_id) if user_id is not None else None
        db.commit()
        response.headers["X-Speech-Provider"] = processed.provider
        return SttRecognitionResponse(
            transcript=stored.get("transcript", ""),
            detected_language=stored.get("detected_language"),
            confidence=stored.get("confidence"),
            stt_limit_seconds=usage.limit_seconds if usage else 0,
            stt_used_seconds=usage.used_seconds if usage else 0,
            stt_remaining_seconds=usage.remaining_seconds if usage else 0,
            stt_reset_date=usage.reset_date if usage else date.today(),
        )

    decisions = get_provider_chain(db, "stt", browser_supported=browser_speech_supported)
    db.commit()
    audio = await request.body()
    last_error: HTTPException | None = None
    for index, decision in enumerate(decisions):
        if decision.provider == "browser":
            record_request_result(db, request_id, "stt", "browser", "success")
            return Response(status_code=204, headers={"X-Speech-Provider": "browser", "X-Speech-Status": decision.status})
        try:
            if decision.provider == "soniox":
                seconds = get_wav_duration_seconds(audio)
                transcript = recognize_soniox_stt(audio, request_id)
                usage = record_stt_seconds(db, user_id, seconds) if user_id is not None else SttUsageSnapshot(0, 0, 0, date.today())
                detected_language = None
                confidence = None
            else:
                result = recognize_stt_with_usage(db, user_id, audio, language, mode)
                seconds = result.audio_seconds_charged
                transcript = result.transcript
                detected_language = result.detected_language
                confidence = result.confidence
                usage = result
        except HTTPException as exc:
            if exc.status_code not in {502, 503, 504}:
                raise
            last_error = exc
            mark_provider_failure(
                db, decision.provider, "stt", str(exc.detail),
                quota_error=(isinstance(exc, SonioxProviderError) and exc.quota_error) or is_quota_failure(exc.detail),
            )
            if index + 1 < len(decisions):
                log_provider_event(db, "stt", "automatic_provider_switch", "Provider request failed.", previous_provider=decision.provider, new_provider=decisions[index + 1].provider, provider_key=decision.provider)
            db.commit()
            continue

        result_payload = json.dumps({"transcript": transcript, "detected_language": detected_language, "confidence": confidence})
        record_request_result(db, request_id, "stt", decision.provider, "success", audio_seconds_used=seconds, result_payload=result_payload)
        response.headers["X-Speech-Provider"] = decision.provider
        return SttRecognitionResponse(
            transcript=transcript, detected_language=detected_language, confidence=confidence,
            stt_limit_seconds=usage.limit_seconds, stt_used_seconds=usage.used_seconds,
            stt_remaining_seconds=usage.remaining_seconds, stt_reset_date=usage.reset_date,
        )
    raise last_error or HTTPException(status_code=503, detail="No STT provider is available on this device.")
