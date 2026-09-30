from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from io import BytesIO
import math
import wave

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

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
