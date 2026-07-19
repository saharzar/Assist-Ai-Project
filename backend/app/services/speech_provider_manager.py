from dataclasses import dataclass
from calendar import monthrange
from datetime import date, datetime, time, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.speech_provider import (
    SpeechProviderCapabilityConfig,
    SpeechProviderEvent,
    SpeechProviderSettings,
    SpeechUsage,
    SpeechUsageRequest,
)
from app.models.user import User
from app.schemas.speech_provider import SpeechProviderSettingsUpdate
from app.schemas.speech_provider import GlobalSpeechRoutingUpdate

VALID_SERVICES = {"tts", "stt"}
PROVIDER_DEFINITIONS = {
    ("azure", "tts"): ("Microsoft Azure TTS", "limited", "characters"),
    ("soniox", "tts"): ("Soniox TTS", "limited", "characters"),
    ("azure", "stt"): ("Microsoft Azure STT", "limited", "seconds"),
    ("soniox", "stt"): ("Soniox STT", "limited", "seconds"),
    ("browser", "tts"): ("Browser TTS", "unlimited", "requests"),
    ("browser", "stt"): ("Browser STT", "unlimited", "requests"),
}


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


def _event_exists(db: Session, service_type: str, event_type: str, period: date, provider_key: str | None = None) -> bool:
    query = select(SpeechProviderEvent.id).where(
            SpeechProviderEvent.service_type == service_type,
            SpeechProviderEvent.event_type == event_type,
            SpeechProviderEvent.billing_period == period,
        )
    if provider_key is not None:
        query = query.where(SpeechProviderEvent.provider_key == provider_key)
    return db.scalar(query) is not None


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
    provider_key: str | None = None,
    usage_at_event: int | None = None,
    threshold_at_event: int | None = None,
    configured_limit: int | None = None,
) -> None:
    period = billing_period_for()
    if once_per_period and _event_exists(db, service_type, event_type, period, provider_key):
        return
    db.add(
        SpeechProviderEvent(
            billing_period=period,
            service_type=service_type,
            event_type=event_type,
            provider_key=provider_key,
            previous_provider=previous_provider,
            new_provider=new_provider,
            reason=reason,
            usage_at_event=usage_at_event,
            threshold_at_event=threshold_at_event,
            configured_limit=configured_limit,
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
    capability = get_capability(db, provider, service_type)
    period, _ = capability_period_bounds(capability)
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
    usage = get_or_create_provider_usage(db, capability)
    if was_cached:
        usage.cached_requests += 1
    if outcome == "success":
        usage.successful_requests += 1
        usage.characters_used += max(0, characters_used)
        usage.audio_seconds_used += max(0, audio_seconds_used)
        mark_provider_success(db, provider, service_type)
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
    settings.automatic_tts_routing_enabled = payload.tts_mode == "automatic"
    settings.automatic_stt_routing_enabled = payload.stt_mode == "automatic"
    settings.forced_tts_provider_key = None if payload.tts_mode == "automatic" else payload.tts_mode
    settings.forced_stt_provider_key = None if payload.stt_mode == "automatic" else payload.stt_mode
    settings.updated_by_admin_id = administrator_id
    for capability in ensure_capability_configs(db):
        if capability.provider_key == "azure" and capability.service_type == "tts":
            capability.quota_limit = payload.azure_tts_monthly_limit
        elif capability.provider_key == "azure" and capability.service_type == "stt":
            capability.quota_limit = payload.azure_stt_monthly_limit_seconds
        if capability.quota_type == "limited":
            capability.warning_threshold_percent = payload.warning_threshold_percent
            capability.switch_threshold_percent = payload.switch_threshold_percent
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


def provider_is_configured(provider_key: str, service_type: str) -> bool:
    config = get_settings()
    if provider_key == "azure":
        return bool(config.azure_speech_key and config.azure_speech_region)
    if provider_key == "soniox" and service_type in VALID_SERVICES:
        return bool(config.soniox_api_key)
    return provider_key == "browser"


def ensure_capability_configs(db: Session) -> list[SpeechProviderCapabilityConfig]:
    settings = get_or_create_provider_settings(db)
    config = get_settings()
    existing = {
        (item.provider_key, item.service_type): item
        for item in db.scalars(select(SpeechProviderCapabilityConfig)).all()
    }
    defaults = {
        ("azure", "tts"): (1, settings.azure_tts_monthly_limit),
        ("soniox", "tts"): (2, config.soniox_tts_monthly_limit_characters),
        ("browser", "tts"): (3, None),
        ("azure", "stt"): (1, settings.azure_stt_monthly_limit_seconds),
        ("soniox", "stt"): (2, config.soniox_stt_monthly_limit_seconds),
        ("browser", "stt"): (3, None),
    }

    # A backend may be restarted before the latest data migration runs. Move
    # existing rows out of the constrained priority range before adding a new
    # provider, then restore the complete service order atomically.
    for service_type in VALID_SERVICES:
        expected_keys = {key for key in defaults if key[1] == service_type}
        existing_keys = {key for key in existing if key[1] == service_type}
        if expected_keys == existing_keys:
            continue
        service_rows = sorted(
            (item for key, item in existing.items() if key[1] == service_type),
            key=lambda item: item.priority,
        )
        for offset, item in enumerate(service_rows, start=1):
            item.priority = 100 + offset
        db.flush()
        for key, item in existing.items():
            if key[1] == service_type and key in defaults:
                item.priority = defaults[key][0]
        db.flush()

    for key, (priority, quota_limit) in defaults.items():
        provider_key, service_type = key
        definition = PROVIDER_DEFINITIONS[key]
        item = existing.get(key)
        if item is None:
            item = SpeechProviderCapabilityConfig(
                provider_key=provider_key,
                display_name=definition[0],
                service_type=service_type,
                enabled=provider_key != "soniox" or provider_is_configured(provider_key, service_type),
                available=True,
                priority=priority,
                quota_type=definition[1],
                quota_limit=quota_limit,
                usage_unit=definition[2],
                warning_threshold_percent=settings.warning_threshold_percent,
                switch_threshold_percent=settings.switch_threshold_percent,
                billing_period_type="no_reset" if provider_key == "browser" else "calendar_month",
                health_status="healthy" if provider_is_configured(provider_key, service_type) else "misconfigured",
            )
            db.add(item)
            existing[key] = item
        item.available = True
        if provider_key != "browser":
            configured = provider_is_configured(provider_key, service_type)
            if not configured:
                item.health_status = "misconfigured"
            elif item.health_status == "misconfigured":
                item.health_status = "healthy"
    db.flush()
    return sorted(existing.values(), key=lambda item: (item.service_type, item.priority))


def capability_period_bounds(
    capability: SpeechProviderCapabilityConfig,
    moment: datetime | None = None,
) -> tuple[date, date | None]:
    today = (moment or utc_now()).date()
    if capability.billing_period_type in {"no_reset", "manual"}:
        return date(1970, 1, 1), None
    reset_day = 1 if capability.billing_period_type == "calendar_month" else (capability.reset_day or 1)
    current_day = min(reset_day, monthrange(today.year, today.month)[1])
    if today.day >= current_day:
        start = date(today.year, today.month, current_day)
    else:
        previous_month = 12 if today.month == 1 else today.month - 1
        previous_year = today.year - 1 if today.month == 1 else today.year
        start = date(previous_year, previous_month, min(reset_day, monthrange(previous_year, previous_month)[1]))
    next_month = 1 if start.month == 12 else start.month + 1
    next_year = start.year + 1 if start.month == 12 else start.year
    end = date(next_year, next_month, min(reset_day, monthrange(next_year, next_month)[1]))
    return start, end


def get_or_create_provider_usage(
    db: Session,
    capability: SpeechProviderCapabilityConfig,
    *,
    moment: datetime | None = None,
) -> SpeechUsage:
    period_start, period_end = capability_period_bounds(capability, moment)
    usage = db.scalar(
        select(SpeechUsage).where(
            SpeechUsage.billing_period == period_start,
            SpeechUsage.provider == capability.provider_key,
            SpeechUsage.service_type == capability.service_type,
        ).with_for_update()
    )
    if usage is None:
        try:
            usage = SpeechUsage(
                billing_period=period_start,
                period_end=period_end,
                provider=capability.provider_key,
                service_type=capability.service_type,
            )
            with db.begin_nested():
                db.add(usage)
                db.flush()
            log_provider_event(
                db,
                capability.service_type,
                "billing_period_started",
                "A new speech usage period started.",
                new_provider=capability.provider_key,
            )
        except IntegrityError:
            usage = db.scalar(
                select(SpeechUsage).where(
                    SpeechUsage.billing_period == period_start,
                    SpeechUsage.provider == capability.provider_key,
                    SpeechUsage.service_type == capability.service_type,
                ).with_for_update()
            )
            if usage is None:
                raise
    elif usage.period_end is None and period_end is not None:
        usage.period_end = period_end
    return usage


def capability_used(capability: SpeechProviderCapabilityConfig, usage: SpeechUsage) -> int:
    if capability.provider_key == "browser":
        return usage.successful_requests
    return usage.characters_used if capability.service_type == "tts" else usage.audio_seconds_used


def capability_quota_status(capability: SpeechProviderCapabilityConfig, usage: SpeechUsage) -> str:
    if capability.quota_type == "unlimited":
        return "unlimited"
    limit = capability.quota_limit or 0
    percent = (capability_used(capability, usage) / limit) * 100 if limit else 100
    if percent >= 100:
        return "reached"
    if percent >= capability.switch_threshold_percent:
        return "critical"
    if percent >= capability.warning_threshold_percent:
        return "warning"
    return "normal"


def capability_is_eligible(capability: SpeechProviderCapabilityConfig, usage: SpeechUsage) -> bool:
    now = utc_now()
    if not capability.enabled or not capability.available or not provider_is_configured(capability.provider_key, capability.service_type):
        return False
    if capability.cooldown_until and capability.cooldown_until.tzinfo is None:
        capability.cooldown_until = capability.cooldown_until.replace(tzinfo=timezone.utc)
    if capability.cooldown_until and capability.cooldown_until > now:
        return False
    if capability.quota_blocked_until and capability.quota_blocked_until.tzinfo is None:
        capability.quota_blocked_until = capability.quota_blocked_until.replace(tzinfo=timezone.utc)
    if capability.quota_blocked_until and capability.quota_blocked_until > now:
        return False
    return capability_quota_status(capability, usage) not in {"critical", "reached"}


def get_provider_chain(
    db: Session,
    service_type: str,
    *,
    browser_supported: bool | None = None,
) -> list[ProviderDecision]:
    if service_type not in VALID_SERVICES:
        raise HTTPException(status_code=422, detail="Invalid speech service.")
    settings = get_or_create_provider_settings(db)
    configs = [item for item in ensure_capability_configs(db) if item.service_type == service_type]
    automatic = settings.automatic_tts_routing_enabled if service_type == "tts" else settings.automatic_stt_routing_enabled
    forced = settings.forced_tts_provider_key if service_type == "tts" else settings.forced_stt_provider_key
    ordered = sorted(configs, key=lambda item: item.priority)
    if not automatic and forced:
        ordered = sorted(ordered, key=lambda item: item.provider_key != forced)
    decisions: list[ProviderDecision] = []
    for capability in ordered:
        if capability.provider_key == "browser" and browser_supported is False:
            continue
        usage = get_or_create_provider_usage(db, capability)
        quota_status = capability_quota_status(capability, usage)
        if quota_status == "warning":
            log_provider_event(
                db, service_type, "quota_warning", "Configured warning threshold reached.",
                provider_key=capability.provider_key, usage_at_event=capability_used(capability, usage),
                threshold_at_event=capability.warning_threshold_percent,
                configured_limit=capability.quota_limit, once_per_period=True,
            )
        elif quota_status in {"critical", "reached"}:
            log_provider_event(
                db, service_type, "switch_threshold_reached", "Configured switch threshold reached.",
                provider_key=capability.provider_key, usage_at_event=capability_used(capability, usage),
                threshold_at_event=capability.switch_threshold_percent,
                configured_limit=capability.quota_limit, once_per_period=True,
            )
        if not capability_is_eligible(capability, usage):
            continue
        decisions.append(ProviderDecision(
            service_type=service_type,
            provider=capability.provider_key,
            mode="automatic" if automatic else "forced",
            status="quota_reached" if quota_status == "reached" else quota_status,
            usage=usage,
            limit=capability.quota_limit or 0,
            reset_date=usage.period_end or date.max,
        ))
    if not decisions:
        raise HTTPException(status_code=503, detail=f"No {service_type.upper()} provider is currently available.")
    return decisions


def resolve_global_provider(db: Session, service_type: str) -> ProviderDecision:
    return get_provider_chain(db, service_type)[0]


def get_capability(db: Session, provider_key: str, service_type: str) -> SpeechProviderCapabilityConfig:
    ensure_capability_configs(db)
    capability = db.scalar(select(SpeechProviderCapabilityConfig).where(
        SpeechProviderCapabilityConfig.provider_key == provider_key,
        SpeechProviderCapabilityConfig.service_type == service_type,
    ))
    if capability is None:
        raise HTTPException(status_code=422, detail="Unsupported provider capability.")
    return capability


def mark_provider_success(db: Session, provider_key: str, service_type: str) -> None:
    capability = get_capability(db, provider_key, service_type)
    was_unhealthy = capability.health_status != "healthy"
    capability.health_status = "healthy"
    capability.cooldown_until = None
    capability.last_success_at = utc_now()
    if was_unhealthy:
        log_provider_event(db, service_type, "provider_recovered", "Provider request succeeded.", previous_provider=provider_key, new_provider=provider_key)


def mark_provider_failure(db: Session, provider_key: str, service_type: str, reason: str, *, quota_error: bool = False) -> None:
    capability = get_capability(db, provider_key, service_type)
    now = utc_now()
    capability.health_status = "unavailable"
    capability.last_failure_at = now
    if quota_error:
        _, period_end = capability_period_bounds(capability)
        capability.quota_blocked_until = datetime.combine(period_end, time.min, tzinfo=timezone.utc) if period_end else None
    else:
        capability.cooldown_until = now + timedelta(seconds=get_settings().speech_provider_cooldown_seconds)
    usage = get_or_create_provider_usage(db, capability)
    usage.failed_requests += 1
    usage.fallback_count += 1
    log_provider_event(
        db,
        service_type,
        "quota_exceeded" if quota_error else "provider_failure",
        reason[:1000],
        previous_provider=provider_key,
        provider_key=provider_key,
        usage_at_event=capability_used(capability, usage),
        configured_limit=capability.quota_limit,
    )


def is_quota_failure(detail: object) -> bool:
    value = str(detail).lower()
    return any(marker in value for marker in ("quota", "limit exceeded", "too many requests", "429", "balance"))


def save_global_routing(db: Session, payload: GlobalSpeechRoutingUpdate, administrator_id: int) -> None:
    settings = get_or_create_provider_settings(db)
    existing = {(item.provider_key, item.service_type): item for item in ensure_capability_configs(db)}
    submitted = {(item.provider_key, item.service_type) for item in payload.capabilities}
    if submitted != set(existing):
        raise HTTPException(status_code=422, detail="The complete supported provider configuration is required.")
    forced_by_service = {
        "tts": payload.forced_tts_provider_key,
        "stt": payload.forced_stt_provider_key,
    }
    for service_type, forced_key in forced_by_service.items():
        if forced_key and (forced_key, service_type) not in existing:
            raise HTTPException(status_code=422, detail=f"Forced {service_type.upper()} provider is unsupported.")
    for offset, item in enumerate(existing.values(), start=100):
        item.priority = offset
    db.flush()
    for item in payload.capabilities:
        target = existing[(item.provider_key, item.service_type)]
        if item.enabled and (not target.available or not provider_is_configured(target.provider_key, target.service_type)):
            raise HTTPException(status_code=422, detail=f"{target.display_name} is not available or configured.")
        if target.quota_type == "limited" and item.quota_limit is None:
            raise HTTPException(status_code=422, detail=f"{target.display_name} requires a positive quota.")
        target.enabled = item.enabled
        target.priority = item.priority
        target.quota_limit = item.quota_limit if target.quota_type == "limited" else None
        target.warning_threshold_percent = item.warning_threshold_percent
        target.switch_threshold_percent = item.switch_threshold_percent
        target.billing_period_type = item.billing_period_type if target.quota_type == "limited" else "no_reset"
        target.reset_day = item.reset_day if target.billing_period_type == "custom_monthly" else None
    settings.automatic_tts_routing_enabled = payload.automatic_tts_routing_enabled
    settings.automatic_stt_routing_enabled = payload.automatic_stt_routing_enabled
    settings.forced_tts_provider_key = payload.forced_tts_provider_key
    settings.forced_stt_provider_key = payload.forced_stt_provider_key
    settings.updated_by_admin_id = administrator_id
    settings.updated_at = utc_now()
    for service_type in VALID_SERVICES:
        log_provider_event(db, service_type, "settings_changed", "Administrator changed global speech routing.", administrator_id=administrator_id)
    db.commit()
