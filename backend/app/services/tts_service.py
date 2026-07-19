from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from hashlib import sha256
from pathlib import Path
import re

import azure.cognitiveservices.speech as speechsdk
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.tts_audio_cache import TtsAudioCache
from app.models.tts_usage import UserTtsUsage
from app.services.soniox_service import synthesize_soniox_tts

AZURE_TTS_VOICES = {
    "en": "en-US-JennyNeural",
    "es": "es-ES-ElviraNeural",
    "de": "de-DE-KatjaNeural",
    "tr": "tr-TR-EmelNeural",
    "pt": "pt-PT-RaquelNeural",
    "fr": "fr-FR-DeniseNeural",
}


@dataclass(frozen=True)
class TtsReservation:
    characters_used: int
    remaining_characters: int
    limit_characters: int


@dataclass(frozen=True)
class TtsUsageSnapshot:
    used_characters: int
    remaining_characters: int
    limit_characters: int
    reset_date: date


@dataclass(frozen=True)
class CachedTtsAudio:
    audio: bytes
    content_type: str
    character_count: int


@dataclass(frozen=True)
class TtsAudioResult:
    audio: bytes
    content_type: str
    characters_charged: int
    remaining_characters: int
    limit_characters: int
    reset_date: date
    cache_status: str


def get_azure_voice_for_language(language: str) -> str:
    settings = get_settings()
    return AZURE_TTS_VOICES.get(language, settings.tts_default_voice)


def get_tts_cache_key(text: str, language: str, voice: str) -> str:
    return sha256(f"{language}|{voice}|{text}".encode("utf-8")).hexdigest()


def get_tts_cache_dir() -> Path:
    settings = get_settings()
    cache_dir = Path(settings.tts_cache_dir)
    if not cache_dir.is_absolute():
        cache_dir = Path.cwd() / cache_dir
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir


def get_cached_tts_audio(db: Session, text: str, language: str, voice: str) -> CachedTtsAudio | None:
    cache_key = get_tts_cache_key(text, language, voice)
    cached = db.scalar(select(TtsAudioCache).where(TtsAudioCache.cache_key == cache_key))
    if cached is None:
        return None

    path = Path(cached.file_path)
    if not path.is_absolute():
        path = Path.cwd() / path
    if not path.exists():
        return None

    cached.last_accessed_at = datetime.now(timezone.utc)
    db.commit()
    return CachedTtsAudio(
        audio=path.read_bytes(),
        content_type=cached.content_type,
        character_count=cached.character_count,
    )


def save_tts_audio_cache(db: Session, text: str, language: str, voice: str, audio: bytes) -> None:
    cache_key = get_tts_cache_key(text, language, voice)
    cache_dir = get_tts_cache_dir()
    audio_path = cache_dir / f"{cache_key}.mp3"
    audio_path.write_bytes(audio)

    now = datetime.now(timezone.utc)
    cached = TtsAudioCache(
        cache_key=cache_key,
        text_hash=sha256(text.encode("utf-8")).hexdigest(),
        language=language,
        voice=voice,
        text=text,
        file_path=str(audio_path),
        content_type="audio/mpeg",
        character_count=len(text),
        created_at=now,
        updated_at=now,
        last_accessed_at=now,
    )
    try:
        db.add(cached)
        db.commit()
    except IntegrityError:
        db.rollback()


NAME_CONFIRMATION_PATTERNS = [
    (
        "I heard your name as ",
        ". Please confirm if that is correct.",
    ),
    (
        "Escuche tu nombre como ",
        ". Confirma si es correcto.",
    ),
    (
        "Ich habe deinen Namen als ",
        " gehoert. Bitte bestaetige, ob das richtig ist.",
    ),
    (
        "Adını ",
        " olarak duydum. Lütfen doğru olup olmadığını onayla.",
    ),
    (
        "Ouvi seu nome como ",
        ". Confirme se esta correto.",
    ),
    (
        "J'ai entendu ton nom comme ",
        ". Confirme si c'est correct.",
    ),
]


def split_text_for_segment_cache(text: str) -> list[str]:
    segments = [text]

    for prefix, suffix in NAME_CONFIRMATION_PATTERNS:
        if text.startswith(prefix) and text.endswith(suffix):
            dynamic_name = text[len(prefix) : len(text) - len(suffix)]
            segments = [prefix, dynamic_name, suffix]
            break

    split_segments: list[str] = []
    for segment in segments:
        split_segments.extend(part for part in re.split(r"(\d{4}\.?)", segment) if part)

    return split_segments


def synthesize_speech_to_mp3(text: str, language: str = "en") -> bytes:
    settings = get_settings()
    if not settings.azure_speech_key or not settings.azure_speech_region:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Azure Speech is not configured.",
        )

    speech_config = speechsdk.SpeechConfig(
        subscription=settings.azure_speech_key,
        region=settings.azure_speech_region,
    )
    speech_config.speech_synthesis_voice_name = get_azure_voice_for_language(language)
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3,
    )

    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)
    result = synthesizer.speak_text_async(text).get()

    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        return bytes(result.audio_data)

    cancellation = speechsdk.CancellationDetails(result)
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Azure Speech failed: {cancellation.reason}",
    )


def get_next_weekly_reset_date() -> date:
    return datetime.now(timezone.utc).date() + timedelta(days=7)


def reset_tts_usage_if_due(usage: UserTtsUsage) -> None:
    today = datetime.now(timezone.utc).date()
    if usage.tts_reset_date is None:
        usage.tts_reset_date = today + timedelta(days=7)
        return

    if usage.tts_reset_date <= today:
        usage.tts_used_characters = 0
        usage.tts_reset_date = today + timedelta(days=7)
        usage.updated_at = datetime.now(timezone.utc)


def get_or_create_tts_usage(db: Session, user_id: int) -> UserTtsUsage:
    settings = get_settings()
    usage = db.scalar(
        select(UserTtsUsage)
        .where(UserTtsUsage.user_id == user_id)
        .with_for_update(),
    )
    if usage is not None:
        reset_tts_usage_if_due(usage)
        return usage

    usage = UserTtsUsage(
        user_id=user_id,
        tts_limit_characters=settings.tts_default_limit_characters,
        tts_used_characters=0,
        tts_reset_date=get_next_weekly_reset_date(),
    )
    db.add(usage)
    db.flush()
    return usage


def get_tts_usage_snapshot(db: Session, user_id: int) -> TtsUsageSnapshot:
    usage = get_or_create_tts_usage(db, user_id)
    remaining = usage.tts_limit_characters - usage.tts_used_characters
    return TtsUsageSnapshot(
        used_characters=usage.tts_used_characters,
        remaining_characters=remaining,
        limit_characters=usage.tts_limit_characters,
        reset_date=usage.tts_reset_date or get_next_weekly_reset_date(),
    )


def reserve_tts_characters(db: Session, user_id: int, character_count: int) -> TtsReservation:
    try:
        usage = get_or_create_tts_usage(db, user_id)

        remaining = usage.tts_limit_characters - usage.tts_used_characters
        if remaining < character_count:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="TTS credit limit reached",
            )

        usage.tts_used_characters += character_count
        usage.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(usage)

        return TtsReservation(
            characters_used=character_count,
            remaining_characters=usage.tts_limit_characters - usage.tts_used_characters,
            limit_characters=usage.tts_limit_characters,
        )
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="TTS usage is being updated. Please try again.",
        ) from exc


def refund_tts_characters(db: Session, user_id: int, character_count: int) -> None:
    usage = db.scalar(
        select(UserTtsUsage)
        .where(UserTtsUsage.user_id == user_id)
        .with_for_update(),
    )
    if usage is None:
        db.rollback()
        return

    usage.tts_used_characters = max(0, usage.tts_used_characters - character_count)
    usage.updated_at = datetime.now(timezone.utc)
    db.commit()


def synthesize_tts_with_cache(
    db: Session,
    user_id: int | None,
    text: str,
    language: str,
    *,
    provider: str = "azure",
    request_id: str = "assist-ai-tts",
    cache_voice: str | None = None,
) -> TtsAudioResult:
    voice = cache_voice or get_azure_voice_for_language(language)
    full_cached_audio = get_cached_tts_audio(db, text, language, voice)
    if full_cached_audio is not None:
        usage = get_tts_usage_snapshot(db, user_id) if user_id is not None else TtsUsageSnapshot(0, 0, 0, get_next_weekly_reset_date())
        db.commit()
        return TtsAudioResult(
            audio=full_cached_audio.audio,
            content_type=full_cached_audio.content_type,
            characters_charged=0,
            remaining_characters=usage.remaining_characters,
            limit_characters=usage.limit_characters,
            reset_date=usage.reset_date,
            cache_status="HIT",
        )

    audio_parts: list[bytes] = []
    characters_charged = 0
    cache_hits = 0
    cache_misses = 0

    for segment_index, segment in enumerate(split_text_for_segment_cache(text)):
        cached_segment = get_cached_tts_audio(db, segment, language, voice)
        if cached_segment is not None:
            audio_parts.append(cached_segment.audio)
            cache_hits += 1
            continue

        reservation = reserve_tts_characters(db, user_id, len(segment)) if user_id is not None else TtsReservation(len(segment), 0, 0)
        try:
            if provider == "soniox":
                segment_audio = synthesize_soniox_tts(segment, language, f"{request_id}-{segment_index}")
            else:
                segment_audio = synthesize_speech_to_mp3(segment, language)
        except Exception:
            if user_id is not None:
                refund_tts_characters(db, user_id, reservation.characters_used)
            raise

        save_tts_audio_cache(db, segment, language, voice, segment_audio)
        audio_parts.append(segment_audio)
        characters_charged += reservation.characters_used
        cache_misses += 1

    audio = b"".join(audio_parts)
    save_tts_audio_cache(db, text, language, voice, audio)
    usage = get_tts_usage_snapshot(db, user_id) if user_id is not None else TtsUsageSnapshot(0, 0, 0, get_next_weekly_reset_date())
    db.commit()

    if cache_misses == 0:
        cache_status = "HIT"
    elif cache_hits > 0:
        cache_status = "PARTIAL"
    else:
        cache_status = "MISS"

    return TtsAudioResult(
        audio=audio,
        content_type="audio/mpeg",
        characters_charged=characters_charged,
        remaining_characters=usage.remaining_characters,
        limit_characters=usage.limit_characters,
        reset_date=usage.reset_date,
        cache_status=cache_status,
    )
