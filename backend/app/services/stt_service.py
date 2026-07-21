from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
import gc
from io import BytesIO
import json
import math
from pathlib import Path
from tempfile import NamedTemporaryFile
import unicodedata
import wave

import azure.cognitiveservices.speech as speechsdk
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.stt_usage import UserSttUsage
from app.services.quota_period_service import archive_usage
from app.services.user_quota_notification_service import notify_threshold
from app.services.quota_defaults_service import get_quota_defaults


@dataclass(frozen=True)
class SttUsageSnapshot:
    used_seconds: int
    remaining_seconds: int
    limit_seconds: int
    reset_date: date


@dataclass(frozen=True)
class SttRecognitionResult:
    transcript: str
    detected_language: str | None
    confidence: float | None
    used_seconds: int
    remaining_seconds: int
    limit_seconds: int
    reset_date: date
    audio_seconds_charged: int


@dataclass(frozen=True)
class SttTranscriptResult:
    transcript: str
    detected_language: str | None = None
    confidence: float | None = None


AZURE_STT_LOCALES = {
    "en": "en-US",
    "es": "es-ES",
    "de": "de-DE",
    "tr": "tr-TR",
    "pt": "pt-PT",
    "fr": "fr-FR",
}

AZURE_NAME_LANGUAGE_CANDIDATES = tuple(AZURE_STT_LOCALES.values())

MIN_NAME_CONFIDENCE = 0.35


def get_azure_stt_locale(language: str) -> str:
    return AZURE_STT_LOCALES.get(language, "en-US")


def normalize_name_for_matching(value: str) -> str:
    without_marks = "".join(
        character
        for character in unicodedata.normalize("NFKD", value)
        if not unicodedata.combining(character)
    )
    return "".join(
        character.lower()
        for character in without_marks
        if character.isalnum() or character.isspace()
    ).strip()


def is_supported_name_text(value: str) -> bool:
    has_letter = False
    for character in value.strip():
        if character.isalpha():
            has_letter = True
            if not unicodedata.name(character, "").startswith("LATIN"):
                return False
        elif not (character.isspace() or character in "-'\u2019"):
            return False
    return has_letter


def get_ordered_name_locales(language: str) -> list[str]:
    preferred = get_azure_stt_locale(language)
    return [preferred, *(locale for locale in AZURE_NAME_LANGUAGE_CANDIDATES if locale != preferred)]


def get_auto_detect_name_locales(language: str) -> list[str]:
    # Azure recognize-once language identification accepts at most four candidates.
    return get_ordered_name_locales(language)[:4]


def get_azure_json_result(result: speechsdk.SpeechRecognitionResult) -> dict:
    raw_json = result.properties.get(
        speechsdk.PropertyId.SpeechServiceResponse_JsonResult,
    )
    if not raw_json:
        return {}
    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def get_best_transcript_and_confidence(result: speechsdk.SpeechRecognitionResult) -> tuple[str, float | None]:
    parsed = get_azure_json_result(result)
    alternatives = parsed.get("NBest")
    if isinstance(alternatives, list) and alternatives:
        best = alternatives[0]
        if isinstance(best, dict):
            transcript = str(best.get("Display") or best.get("Lexical") or result.text or "").strip()
            confidence = best.get("Confidence")
            return transcript, float(confidence) if isinstance(confidence, (int, float)) else None

    return result.text.strip(), None


def get_detected_language(result: speechsdk.SpeechRecognitionResult, fallback_language: str) -> str:
    detected = result.properties.get(
        speechsdk.PropertyId.SpeechServiceConnection_AutoDetectSourceLanguageResult,
    )
    return detected or fallback_language


def get_cancellation_message(result: speechsdk.SpeechRecognitionResult) -> str:
    cancellation = speechsdk.CancellationDetails(result)
    error_details = getattr(cancellation, "error_details", "") or ""
    if error_details:
        return f"{cancellation.reason}: {error_details}"
    return str(cancellation.reason)


def is_reliable_name_result(result: SttTranscriptResult) -> bool:
    if not normalize_name_for_matching(result.transcript) or not is_supported_name_text(result.transcript):
        return False
    return result.confidence is None or result.confidence >= MIN_NAME_CONFIDENCE


def choose_best_name_result(results: list[SttTranscriptResult]) -> SttTranscriptResult:
    reliable_results = [result for result in results if is_reliable_name_result(result)]
    if not reliable_results:
        return SttTranscriptResult("")
    return max(
        reliable_results,
        key=lambda result: result.confidence if result.confidence is not None else 0.5,
    )


def get_next_weekly_reset_date() -> date:
    return datetime.now(timezone.utc).date() + timedelta(days=7)


def reset_stt_usage_if_due(db: Session, usage: UserSttUsage) -> None:
    today = datetime.now(timezone.utc).date()
    if usage.stt_reset_date is None:
        usage.period_start = today
        usage.stt_reset_date = today + (timedelta(days=30) if usage.period_type == "monthly" else timedelta(days=7))
        return

    if usage.stt_reset_date <= today:
        archive_usage(db, usage.user_id, usage.period_start, usage.stt_reset_date, stt_used=usage.stt_used_seconds)
        usage.stt_used_seconds = 0
        usage.extra_seconds = 0
        usage.period_start = today
        usage.stt_reset_date = today + (timedelta(days=30) if usage.period_type == "monthly" else timedelta(days=7))
        usage.updated_at = datetime.now(timezone.utc)


def get_or_create_stt_usage(db: Session, user_id: int) -> UserSttUsage:
    settings = get_settings()
    usage = db.scalar(
        select(UserSttUsage)
        .where(UserSttUsage.user_id == user_id)
        .with_for_update(),
    )
    if usage is not None:
        reset_stt_usage_if_due(db, usage)
        return usage

    defaults = get_quota_defaults(db)
    usage = UserSttUsage(
        user_id=user_id,
        stt_limit_seconds=defaults.stt_limit_seconds,
        stt_used_seconds=0,
        stt_reset_date=get_next_weekly_reset_date(),
        period_type=defaults.period_type,
        period_start=datetime.now(timezone.utc).date(),
    )
    db.add(usage)
    db.flush()
    return usage


def get_stt_usage_snapshot(db: Session, user_id: int) -> SttUsageSnapshot:
    usage = get_or_create_stt_usage(db, user_id)
    limit = usage.stt_limit_seconds + usage.extra_seconds
    remaining = max(0, limit - usage.stt_used_seconds)
    return SttUsageSnapshot(
        used_seconds=usage.stt_used_seconds,
        remaining_seconds=remaining,
        limit_seconds=limit,
        reset_date=usage.stt_reset_date or get_next_weekly_reset_date(),
    )


def record_stt_seconds(db: Session, user_id: int, seconds: int) -> SttUsageSnapshot:
    try:
        usage = get_or_create_stt_usage(db, user_id)
        if not usage.enabled:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Speech access is disabled for this account.")
        limit = usage.stt_limit_seconds + usage.extra_seconds
        remaining = limit - usage.stt_used_seconds
        if remaining < seconds:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You have reached your current speech allowance. Continue with keyboard input or request additional access.",
            )

        charged_seconds = seconds
        usage.stt_used_seconds += charged_seconds
        usage.updated_at = datetime.now(timezone.utc)
        notify_threshold(db, user_id, "stt", usage.stt_used_seconds, limit, str(usage.period_start))
        db.commit()
        db.refresh(usage)

        return SttUsageSnapshot(
            used_seconds=usage.stt_used_seconds,
            remaining_seconds=limit - usage.stt_used_seconds,
            limit_seconds=limit,
            reset_date=usage.stt_reset_date or get_next_weekly_reset_date(),
        )
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="STT usage is being updated. Please try again.",
        ) from exc


def parse_recognition_result(
    result: speechsdk.SpeechRecognitionResult,
    mode: str,
    detected_language: str,
) -> SttTranscriptResult | None:
    if result.reason == speechsdk.ResultReason.RecognizedSpeech:
        transcript, confidence = get_best_transcript_and_confidence(result)
        if mode == "name":
            if not normalize_name_for_matching(transcript) or not is_supported_name_text(transcript):
                return SttTranscriptResult("", detected_language, confidence)
            if confidence is not None and confidence < MIN_NAME_CONFIDENCE:
                return SttTranscriptResult("", detected_language, confidence)
        return SttTranscriptResult(transcript, detected_language, confidence)

    if result.reason == speechsdk.ResultReason.NoMatch:
        return SttTranscriptResult("", detected_language, None)

    return None


def recognize_once_with_language(
    speech_config: speechsdk.SpeechConfig,
    audio_config: speechsdk.audio.AudioConfig,
    language: str,
    mode: str,
) -> SttTranscriptResult | None:
    speech_config.speech_recognition_language = language
    recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config,
        audio_config=audio_config,
    )
    result = recognizer.recognize_once_async().get()
    parsed_result = parse_recognition_result(result, mode, language)
    recognizer = None
    gc.collect()
    if parsed_result is not None:
        return parsed_result

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Azure Speech recognition failed: {get_cancellation_message(result)}",
    )


def recognize_name_with_auto_detect(
    speech_config: speechsdk.SpeechConfig,
    audio_config: speechsdk.audio.AudioConfig,
    language: str,
) -> SttTranscriptResult | None:
    auto_detect_config = speechsdk.languageconfig.AutoDetectSourceLanguageConfig(
        languages=get_auto_detect_name_locales(language),
    )
    recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config,
        audio_config=audio_config,
        auto_detect_source_language_config=auto_detect_config,
    )
    result = recognizer.recognize_once_async().get()
    detected_language = get_detected_language(result, "auto")
    parsed_result = parse_recognition_result(result, "name", detected_language)
    recognizer = None
    auto_detect_config = None
    gc.collect()
    return parsed_result


def recognize_name_with_candidates(
    speech_config: speechsdk.SpeechConfig,
    audio_config: speechsdk.audio.AudioConfig,
    language: str,
) -> SttTranscriptResult:
    results: list[SttTranscriptResult] = []
    service_errors: list[str] = []
    for candidate_language in get_ordered_name_locales(language):
        try:
            candidate_result = recognize_once_with_language(
                speech_config,
                audio_config,
                candidate_language,
                "name",
            )
        except HTTPException as exc:
            service_errors.append(str(exc.detail))
            continue

        if candidate_result is not None:
            results.append(candidate_result)

    best_result = choose_best_name_result(results)
    if best_result.transcript:
        return best_result

    if service_errors and not results:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=service_errors[0],
        )

    return SttTranscriptResult("")


def recognize_azure_stt(audio: bytes, language: str, mode: str) -> SttTranscriptResult:
    settings = get_settings()
    if not settings.azure_speech_key or not settings.azure_speech_region:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Azure Speech is not configured.",
        )
    if not audio:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Audio is required.",
        )

    temp_path: Path | None = None
    audio_config: speechsdk.audio.AudioConfig | None = None
    speech_config: speechsdk.SpeechConfig | None = None
    try:
        with NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            temp_file.write(audio)
            temp_path = Path(temp_file.name)

        speech_config = speechsdk.SpeechConfig(
            subscription=settings.azure_speech_key,
            region=settings.azure_speech_region,
        )
        speech_config.output_format = speechsdk.OutputFormat.Detailed
        audio_config = speechsdk.audio.AudioConfig(filename=str(temp_path))

        if mode == "name":
            # UI language is intentionally not used for names. Try Azure automatic
            # language detection first, then fall back to explicit candidate languages.
            auto_detect_result = recognize_name_with_auto_detect(speech_config, audio_config, language)
            if auto_detect_result is not None and is_reliable_name_result(auto_detect_result):
                return auto_detect_result
            return recognize_name_with_candidates(speech_config, audio_config, language)

        return recognize_once_with_language(
            speech_config,
            audio_config,
            get_azure_stt_locale(language),
            "pin",
        ) or SttTranscriptResult("")
    finally:
        audio_config = None
        speech_config = None
        gc.collect()
        if temp_path is not None:
            try:
                temp_path.unlink(missing_ok=True)
            except PermissionError:
                # The Azure SDK can release file handles slightly late on Windows.
                # Cleanup must not turn a completed recognition request into a 500.
                pass


def get_wav_duration_seconds(audio: bytes) -> int:
    try:
        with wave.open(BytesIO(audio), "rb") as wav_file:
            frame_count = wav_file.getnframes()
            frame_rate = wav_file.getframerate()
            if frame_rate <= 0:
                raise wave.Error("Invalid frame rate")
            return max(1, math.ceil(frame_count / frame_rate))
    except wave.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Audio must be a valid WAV file.",
        ) from exc


def recognize_stt_with_usage(
    db: Session,
    user_id: int | None,
    audio: bytes,
    language: str,
    mode: str,
) -> SttRecognitionResult:
    seconds = get_wav_duration_seconds(audio)
    snapshot = get_stt_usage_snapshot(db, user_id) if user_id is not None else SttUsageSnapshot(0, 0, 0, get_next_weekly_reset_date())
    db.commit()
    if user_id is not None and snapshot.remaining_seconds <= 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="STT time limit reached",
        )

    transcript_result = recognize_azure_stt(audio, language, mode)
    usage = record_stt_seconds(db, user_id, seconds) if user_id is not None else snapshot
    return SttRecognitionResult(
        transcript=transcript_result.transcript,
        detected_language=transcript_result.detected_language,
        confidence=transcript_result.confidence,
        used_seconds=usage.used_seconds,
        remaining_seconds=usage.remaining_seconds,
        limit_seconds=usage.limit_seconds,
        reset_date=usage.reset_date,
        audio_seconds_charged=seconds,
    )
