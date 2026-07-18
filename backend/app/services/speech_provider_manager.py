from dataclasses import dataclass
from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.speech_provider import (
    SpeechProviderEvent,
    SpeechProviderSettings,
    SpeechUsage,
    SpeechUsageRequest,
)
from app.models.user import User
from app.schemas.speech_provider import SpeechProviderSettingsUpdate

VALID_SERVICES = {"tts", "stt"}


@dataclass(frozen=True)
class ProviderDecision:
    service_type: str
    provider: str
    mode: str
    status: str
    usage: SpeechUsage
    limit: int
    reset_date: date


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def billing_period_for(moment: datetime | None = None) -> date:
    current = moment or utc_now()
    return date(current.year, current.month, 1)


def next_billing_period(period: date) -> date:
    if period.month == 12:
        return date(period.year + 1, 1, 1)
    return date(period.year, period.month + 1, 1)


def get_or_create_provider_settings(db: Session) -> SpeechProviderSettings:
    config = get_settings()
    provider_settings = db.get(SpeechProviderSettings, 1)
    if provider_settings is not None:
        return provider_settings
    provider_settings = SpeechProviderSettings(
        id=1,
        tts_mode="automatic",
        stt_mode="automatic",
        azure_tts_monthly_limit=config.azure_tts_monthly_limit_characters,
        azure_stt_monthly_limit_seconds=config.azure_stt_monthly_limit_seconds,
        warning_threshold_percent=config.speech_warning_threshold_percent,
        switch_threshold_percent=config.speech_switch_threshold_percent,
    )
    db.add(provider_settings)
    db.flush()
    return provider_settings


def get_or_create_monthly_usage(
    db: Session,
    service_type: str,
    *,
    period: date | None = None,
) -> SpeechUsage:
    if service_type not in VALID_SERVICES:
        raise ValueError("Unsupported speech service type")
    active_period = period or billing_period_for()
    usage = db.scalar(
        select(SpeechUsage)
        .where(
            SpeechUsage.billing_period == active_period,
            SpeechUsage.provider == "azure",
            SpeechUsage.service_type == service_type,
        )
        .with_for_update()
    )
    if usage is not None:
        return usage
    usage = SpeechUsage(
        billing_period=active_period,
        provider="azure",
        service_type=service_type,
    )
    try:
        # Keep a concurrent monthly-record insert from rolling back the caller's work.
        with db.begin_nested():
            db.add(usage)
            db.flush()
    except IntegrityError:
        usage = db.scalar(
            select(SpeechUsage).where(
                SpeechUsage.billing_period == active_period,
                SpeechUsage.provider == "azure",
                SpeechUsage.service_type == service_type,
            )
        )
        if usage is None:
            raise
    return usage


def service_limit(settings: SpeechProviderSettings, service_type: str) -> int:
    return (
        settings.azure_tts_monthly_limit
        if service_type == "tts"
        else settings.azure_stt_monthly_limit_seconds
    )


def service_used(usage: SpeechUsage, service_type: str) -> int:
    return usage.characters_used if service_type == "tts" else usage.audio_seconds_used


def usage_status(
    usage: SpeechUsage,
    settings: SpeechProviderSettings,
    service_type: str,
    *,
    unavailable: bool = False,
) -> str:
    if unavailable:
        return "unavailable"
    limit = service_limit(settings, service_type)
    percent = (service_used(usage, service_type) / limit) * 100 if limit else 100
    if percent >= 100:
        return "quota_reached"
    if percent >= settings.switch_threshold_percent:
        return "critical"
    if percent >= settings.warning_threshold_percent:
        return "warning"
    return "normal"


def _event_exists(db: Session, service_type: str, event_type: str, period: date) -> bool:
    return db.scalar(
        select(SpeechProviderEvent.id).where(
            SpeechProviderEvent.service_type == service_type,
            SpeechProviderEvent.event_type == event_type,
            SpeechProviderEvent.billing_period == period,
        )
    ) is not None


def log_provider_event(
    db: Session,
    service_type: str,
    event_type: str,
    reason: str,
    *,
    previous_provider: str | None = None,
    new_provider: str | None = None,
    administrator_id: int | None = None,
    once_per_period: bool = False,
) -> None:
    period = billing_period_for()
    if once_per_period and _event_exists(db, service_type, event_type, period):
        return
    db.add(
        SpeechProviderEvent(
            billing_period=period,
            service_type=service_type,
            event_type=event_type,
            previous_provider=previous_provider,
            new_provider=new_provider,
            reason=reason,
            administrator_id=administrator_id,
        )
    )


def resolve_provider(db: Session, service_type: str) -> ProviderDecision:
    if service_type not in VALID_SERVICES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid speech service.")
    now = utc_now()
    settings = get_or_create_provider_settings(db)
    usage = get_or_create_monthly_usage(db, service_type)
    mode = settings.tts_mode if service_type == "tts" else settings.stt_mode
    fallback_field = "tts_fallback_until" if service_type == "tts" else "stt_fallback_until"
    fallback_until = getattr(settings, fallback_field)
    if fallback_until and fallback_until.tzinfo is None:
        fallback_until = fallback_until.replace(tzinfo=timezone.utc)

    if fallback_until and fallback_until <= now:
        setattr(settings, fallback_field, None)
        log_provider_event(
            db,
            service_type,
            "provider_recovered",
            "A new billing period started; Azure is eligible again.",
            previous_provider="browser",
            new_provider="azure",
            once_per_period=True,
        )
        fallback_until = None

    config = get_settings()
    azure_configured = bool(config.azure_speech_key and config.azure_speech_region)
    unavailable = bool(fallback_until and fallback_until > now) or not azure_configured
    status_value = usage_status(usage, settings, service_type, unavailable=unavailable)
    used = service_used(usage, service_type)
    limit = service_limit(settings, service_type)
    percent = (used / limit) * 100 if limit else 100

    if percent >= settings.warning_threshold_percent:
        log_provider_event(
            db,
            service_type,
            "quota_warning",
            f"Estimated Azure {service_type.upper()} usage reached the warning threshold.",
            previous_provider="azure",
            new_provider="azure",
            once_per_period=True,
        )
    if percent >= 100:
        log_provider_event(
            db,
            service_type,
            "quota_reached",
            f"Estimated Azure {service_type.upper()} usage reached the configured monthly limit.",
            previous_provider="azure",
            new_provider="browser" if mode == "automatic" else "azure",
            once_per_period=True,
        )

    if mode == "browser" or unavailable:
        provider = "browser"
    elif mode == "automatic" and percent >= settings.switch_threshold_percent:
        provider = "browser"
        log_provider_event(
            db,
            service_type,
            "automatic_fallback",
            "Configured automatic switch threshold reached.",
            previous_provider="azure",
            new_provider="browser",
            once_per_period=True,
        )
    else:
        provider = "azure"

    return ProviderDecision(
        service_type=service_type,
        provider=provider,
        mode=mode,
        status=status_value,
        usage=usage,
        limit=limit,
        reset_date=next_billing_period(usage.billing_period),
    )


def find_processed_request(db: Session, request_id: str, service_type: str) -> SpeechUsageRequest | None:
    return db.scalar(
        select(SpeechUsageRequest).where(
            SpeechUsageRequest.request_id == request_id,
            SpeechUsageRequest.service_type == service_type,
        )
    )


def record_request_result(
    db: Session,
    request_id: str,
    service_type: str,
    provider: str,
    outcome: str,
    *,
    characters_used: int = 0,
    audio_seconds_used: int = 0,
    was_cached: bool = False,
    result_payload: str | None = None,
) -> bool:
    if find_processed_request(db, request_id, service_type):
        return False
    period = billing_period_for()
    request = SpeechUsageRequest(
        request_id=request_id,
        billing_period=period,
        provider=provider,
        service_type=service_type,
        outcome=outcome,
        characters_used=max(0, characters_used),
        audio_seconds_used=max(0, audio_seconds_used),
        was_cached=was_cached,
        result_payload=result_payload,
    )
    db.add(request)
    if provider == "azure":
        usage = get_or_create_monthly_usage(db, service_type, period=period)
        if was_cached:
            usage.cached_requests += 1
        if outcome == "success":
            usage.successful_requests += 1
            usage.characters_used += max(0, characters_used)
            usage.audio_seconds_used += max(0, audio_seconds_used)
        elif outcome == "failed":
            usage.failed_requests += 1
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return False
    return True


def handle_provider_failure(
    db: Session,
    request_id: str,
    service_type: str,
    reason: str,
) -> None:
    record_request_result(db, request_id, service_type, "azure", "failed")
    settings = get_or_create_provider_settings(db)
    period = billing_period_for()
    fallback_until = datetime.combine(next_billing_period(period), datetime.min.time(), tzinfo=timezone.utc)
    fallback_field = "tts_fallback_until" if service_type == "tts" else "stt_fallback_until"
    setattr(settings, fallback_field, fallback_until)
    log_provider_event(
        db,
        service_type,
        "provider_failure",
        reason[:1000],
        previous_provider="azure",
        new_provider="browser",
    )
    log_provider_event(
        db,
        service_type,
        "automatic_fallback",
        "Azure failed; new requests were routed to browser speech.",
        previous_provider="azure",
        new_provider="browser",
        once_per_period=True,
    )
    db.commit()


def update_provider_settings(
    db: Session,
    payload: SpeechProviderSettingsUpdate,
    administrator_id: int,
) -> SpeechProviderSettings:
    settings = get_or_create_provider_settings(db)
    previous_tts = resolve_provider(db, "tts").provider
    previous_stt = resolve_provider(db, "stt").provider
    settings.tts_mode = payload.tts_mode
    settings.stt_mode = payload.stt_mode
    settings.azure_tts_monthly_limit = payload.azure_tts_monthly_limit
    settings.azure_stt_monthly_limit_seconds = payload.azure_stt_monthly_limit_seconds
    settings.warning_threshold_percent = payload.warning_threshold_percent
    settings.switch_threshold_percent = payload.switch_threshold_percent
    settings.updated_at = utc_now()
    db.flush()
    new_tts = resolve_provider(db, "tts").provider
    new_stt = resolve_provider(db, "stt").provider
    log_provider_event(
        db,
        "tts",
        "settings_changed",
        "Administrator changed speech provider settings.",
        previous_provider=previous_tts,
        new_provider=new_tts,
        administrator_id=administrator_id,
    )
    log_provider_event(
        db,
        "stt",
        "settings_changed",
        "Administrator changed speech provider settings.",
        previous_provider=previous_stt,
        new_provider=new_stt,
        administrator_id=administrator_id,
    )
    if previous_tts != new_tts:
        log_provider_event(
            db,
            "tts",
            "provider_switched",
            "Administrator settings changed the active TTS provider.",
            previous_provider=previous_tts,
            new_provider=new_tts,
            administrator_id=administrator_id,
        )
    if previous_stt != new_stt:
        log_provider_event(
            db,
            "stt",
            "provider_switched",
            "Administrator settings changed the active STT provider.",
            previous_provider=previous_stt,
            new_provider=new_stt,
            administrator_id=administrator_id,
        )
    db.commit()
    db.refresh(settings)
    return settings


def list_provider_events(db: Session, limit: int = 100) -> list[tuple[SpeechProviderEvent, str | None]]:
    rows = db.execute(
        select(SpeechProviderEvent, User.full_name)
        .outerjoin(User, SpeechProviderEvent.administrator_id == User.id)
        .order_by(SpeechProviderEvent.created_at.desc())
        .limit(limit)
    ).all()
    return [(event, admin_name) for event, admin_name in rows]
