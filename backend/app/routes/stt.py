import json
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.stt import SttRecognitionResponse, SttUsageRequest, SttUsageResponse
from app.services.speech_provider_manager import (
    find_processed_request,
    handle_provider_failure,
    record_request_result,
    resolve_provider,
)
from app.services.stt_service import (
    get_or_create_stt_usage,
    get_stt_usage_snapshot,
    recognize_stt_with_usage,
    record_stt_seconds,
)

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
    speech_request_id: UUID | None = Header(default=None, alias="X-Speech-Request-ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SttRecognitionResponse | Response:
    content_type = request.headers.get("content-type", "")
    if not content_type.startswith("audio/wav"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Audio must be sent as WAV.",
        )

    request_id = str(speech_request_id or uuid4())
    processed = find_processed_request(db, request_id, "stt")
    if processed and processed.outcome == "success" and processed.result_payload:
        stored = json.loads(processed.result_payload)
        usage = get_stt_usage_snapshot(db, current_user.id)
        db.commit()
        return SttRecognitionResponse(
            transcript=stored.get("transcript", ""),
            detected_language=stored.get("detected_language"),
            confidence=stored.get("confidence"),
            stt_limit_seconds=usage.limit_seconds,
            stt_used_seconds=usage.used_seconds,
            stt_remaining_seconds=usage.remaining_seconds,
            stt_reset_date=usage.reset_date,
        )

    decision = resolve_provider(db, "stt")
    db.commit()
    if decision.provider == "browser":
        record_request_result(db, request_id, "stt", "browser", "success")
        return Response(
            status_code=status.HTTP_204_NO_CONTENT,
            headers={"X-Speech-Provider": "browser", "X-Speech-Status": decision.status},
        )

    audio = await request.body()
    try:
        result = recognize_stt_with_usage(db, current_user.id, audio, language, mode)
    except HTTPException as exc:
        if exc.status_code not in {
            status.HTTP_502_BAD_GATEWAY,
            status.HTTP_503_SERVICE_UNAVAILABLE,
            status.HTTP_504_GATEWAY_TIMEOUT,
        }:
            raise
        handle_provider_failure(db, request_id, "stt", str(exc.detail))
        return Response(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=json.dumps({"detail": "Azure STT is unavailable. Browser STT will be used on the next attempt."}),
            media_type="application/json",
            headers={"X-Speech-Provider": "browser", "X-Speech-Status": "unavailable"},
        )

    result_payload = json.dumps(
        {
            "transcript": result.transcript,
            "detected_language": result.detected_language,
            "confidence": result.confidence,
        }
    )
    record_request_result(
        db,
        request_id,
        "stt",
        "azure",
        "success",
        audio_seconds_used=result.audio_seconds_charged,
        result_payload=result_payload,
    )
    return SttRecognitionResponse(
        transcript=result.transcript,
        detected_language=result.detected_language,
        confidence=result.confidence,
        stt_limit_seconds=result.limit_seconds,
        stt_used_seconds=result.used_seconds,
        stt_remaining_seconds=result.remaining_seconds,
        stt_reset_date=result.reset_date,
    )
