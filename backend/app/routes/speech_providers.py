from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
import httpx

from app.core.config import get_settings

from app.core.security import get_current_admin, get_current_user, get_speech_actor
from app.database import get_db
from app.models.speech_provider import SpeechProviderCapabilityConfig, SpeechUsage
from app.models.user import User
from app.models.guest_session import GuestSession
from app.schemas.speech_provider import (
    SpeechProviderDashboard,
    SpeechProviderEventRead,
    SpeechProviderResolution,
    SpeechProviderSettingsRead,
    SpeechProviderSettingsUpdate,
    SpeechServiceSnapshot,
    SpeechUsageHistoryRead,
    GlobalSpeechDashboard,
    GlobalSpeechRoutingUpdate,
    SpeechCapabilityRead,
)
from app.services.speech_provider_manager import (
    get_or_create_provider_settings,
    list_provider_events,
    resolve_provider,
    service_used,
    update_provider_settings,
    utc_now,
    capability_period_bounds,
    capability_quota_status,
    capability_used,
    ensure_capability_configs,
    get_or_create_provider_usage,
    get_provider_chain,
    provider_is_configured,
    resolve_global_provider,
    save_global_routing,
)

router = APIRouter(tags=["speech providers"])


def _settings_read(settings) -> SpeechProviderSettingsRead:
    return SpeechProviderSettingsRead(
        tts_mode=settings.tts_mode,
        stt_mode=settings.stt_mode,
        azure_tts_monthly_limit=settings.azure_tts_monthly_limit,
        azure_stt_monthly_limit_seconds=settings.azure_stt_monthly_limit_seconds,
        warning_threshold_percent=settings.warning_threshold_percent,
        switch_threshold_percent=settings.switch_threshold_percent,
    )


def _snapshot(decision) -> SpeechServiceSnapshot:
    used = service_used(decision.usage, decision.service_type)
    return SpeechServiceSnapshot(
        service_type=decision.service_type,
        current_provider=decision.provider,
        mode=decision.mode,
        used=used,
        limit=decision.limit,
        remaining=max(0, decision.limit - used),
        usage_percent=round((used / decision.limit) * 100, 2) if decision.limit else 100,
        successful_requests=decision.usage.successful_requests,
        failed_requests=decision.usage.failed_requests,
        cached_requests=decision.usage.cached_requests,
        billing_period=decision.usage.billing_period,
        reset_date=decision.reset_date,
        status=decision.status,
    )


@router.get("/api/speech/providers/{service_type}", response_model=SpeechProviderResolution)
def get_active_speech_provider(
    service_type: str,
    browser_supported: bool | None = Query(default=None),
    current_user: User | GuestSession = Depends(get_speech_actor),
    db: Session = Depends(get_db),
) -> SpeechProviderResolution:
    decision = get_provider_chain(db, service_type, browser_supported=browser_supported)[0]
    db.commit()
    return SpeechProviderResolution(
        service_type=decision.service_type,
        provider=decision.provider,
        mode=decision.mode,
        status=decision.status,
    )


@router.get("/api/admin/speech-providers", response_model=SpeechProviderDashboard)
def get_speech_provider_dashboard(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> SpeechProviderDashboard:
    tts = resolve_provider(db, "tts")
    stt = resolve_provider(db, "stt")
    provider_settings = get_or_create_provider_settings(db)
    history = list(
        db.scalars(
            select(SpeechUsage).order_by(
                SpeechUsage.billing_period.desc(), SpeechUsage.service_type
            )
        ).all()
    )
    event_rows = list_provider_events(db)
    db.commit()
    return SpeechProviderDashboard(
        estimate_notice="Estimated Azure usage based on ASSIST-AI requests.",
        settings=_settings_read(provider_settings),
        tts=_snapshot(tts),
        stt=_snapshot(stt),
        usage_history=[
            SpeechUsageHistoryRead(
                billing_period=item.billing_period,
                service_type=item.service_type,
                provider=item.provider,
                successful_requests=item.successful_requests,
                failed_requests=item.failed_requests,
                characters_used=item.characters_used,
                cached_requests=item.cached_requests,
                audio_seconds_used=item.audio_seconds_used,
            )
            for item in history
        ],
        events=[
            SpeechProviderEventRead(
                id=event.id,
                created_at=event.created_at,
                service_type=event.service_type,
                event_type=event.event_type,
                previous_provider=event.previous_provider,
                new_provider=event.new_provider,
                reason=event.reason,
                administrator_name=admin_name,
            )
            for event, admin_name in event_rows
        ],
    )


@router.put("/api/admin/speech-providers/settings", response_model=SpeechProviderSettingsRead)
def change_speech_provider_settings(
    payload: SpeechProviderSettingsUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> SpeechProviderSettingsRead:
    return _settings_read(update_provider_settings(db, payload, current_admin.id))


def _capability_read(db: Session, item: SpeechProviderCapabilityConfig) -> SpeechCapabilityRead:
    usage = get_or_create_provider_usage(db, item)
    used = capability_used(item, usage)
    limit = item.quota_limit
    quota_status = capability_quota_status(item, usage)
    return SpeechCapabilityRead(
        provider_key=item.provider_key,
        display_name=item.display_name,
        service_type=item.service_type,
        enabled=item.enabled,
        available=item.available,
        configured=provider_is_configured(item.provider_key, item.service_type),
        priority=item.priority,
        quota_type=item.quota_type,
        quota_limit=limit,
        usage_unit=item.usage_unit,
        warning_threshold_percent=item.warning_threshold_percent,
        switch_threshold_percent=item.switch_threshold_percent,
        warning_threshold_value=item.warning_threshold_value,
        switch_threshold_value=item.switch_threshold_value,
        billing_period_type=item.billing_period_type,
        reset_day=item.reset_day,
        health_status=item.health_status,
        quota_status=quota_status,
        used=used,
        remaining=max(0, limit - used) if limit is not None else None,
        usage_percent=round((used / limit) * 100, 2) if limit else None,
        period_start=usage.billing_period,
        period_end=usage.period_end,
        next_reset_date=usage.period_end,
        last_success_at=item.last_success_at,
        last_failure_at=item.last_failure_at,
    )


def _global_dashboard(db: Session) -> GlobalSpeechDashboard:
    provider_settings = get_or_create_provider_settings(db)
    capabilities = ensure_capability_configs(db)
    active_tts = resolve_global_provider(db, "tts")
    active_stt = resolve_global_provider(db, "stt")
    history = list(db.scalars(select(SpeechUsage).order_by(SpeechUsage.billing_period.desc(), SpeechUsage.service_type, SpeechUsage.provider)).all())
    event_rows = list_provider_events(db)
    return GlobalSpeechDashboard(
        estimate_notice="Estimated usage based on ASSIST-AI requests.",
        automatic_tts_routing_enabled=provider_settings.automatic_tts_routing_enabled,
        automatic_stt_routing_enabled=provider_settings.automatic_stt_routing_enabled,
        forced_tts_provider_key=provider_settings.forced_tts_provider_key,
        forced_stt_provider_key=provider_settings.forced_stt_provider_key,
        active_tts_provider=active_tts.provider,
        active_stt_provider=active_stt.provider,
        capabilities=[_capability_read(db, item) for item in capabilities],
        usage_history=[SpeechUsageHistoryRead(
            billing_period=item.billing_period, service_type=item.service_type, provider=item.provider,
            successful_requests=item.successful_requests, failed_requests=item.failed_requests,
            characters_used=item.characters_used, cached_requests=item.cached_requests,
            audio_seconds_used=item.audio_seconds_used,
        ) for item in history],
        events=[SpeechProviderEventRead(
            id=event.id, created_at=event.created_at, service_type=event.service_type,
            event_type=event.event_type, previous_provider=event.previous_provider,
            new_provider=event.new_provider, reason=event.reason, administrator_name=admin_name,
        ) for event, admin_name in event_rows],
    )


@router.get("/api/admin/speech-providers/global", response_model=GlobalSpeechDashboard)
def get_global_speech_routing(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> GlobalSpeechDashboard:
    dashboard = _global_dashboard(db)
    db.commit()
    return dashboard


@router.put("/api/admin/speech-providers/global", response_model=GlobalSpeechDashboard)
def change_global_speech_routing(
    payload: GlobalSpeechRoutingUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> GlobalSpeechDashboard:
    save_global_routing(db, payload, current_admin.id)
    dashboard = _global_dashboard(db)
    db.commit()
    return dashboard


@router.post("/api/admin/speech-providers/test/{service_type}/{provider_key}")
def test_speech_provider(
    service_type: str,
    provider_key: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict[str, str | bool]:
    capability = next(
        (item for item in ensure_capability_configs(db) if item.provider_key == provider_key and item.service_type == service_type),
        None,
    )
    if capability is None:
        raise HTTPException(status_code=422, detail="Unsupported provider capability.")
    if provider_key == "browser":
        return {"ok": True, "status": "client_check_required"}
    settings = get_settings()
    try:
        if provider_key == "azure":
            response = httpx.post(
                f"https://{settings.azure_speech_region}.api.cognitive.microsoft.com/sts/v1.0/issueToken",
                headers={"Ocp-Apim-Subscription-Key": settings.azure_speech_key},
                timeout=10,
            )
        elif service_type == "tts":
            response = httpx.get(
                "https://api.soniox.com/v1/tts-models",
                headers={"Authorization": f"Bearer {settings.soniox_api_key}"},
                timeout=10,
            )
        else:
            response = httpx.get(
                "https://api.soniox.com/v1/files/count",
                headers={"Authorization": f"Bearer {settings.soniox_api_key}"},
                timeout=10,
            )
        response.raise_for_status()
    except (httpx.HTTPError, ValueError):
        capability.health_status = "unavailable"
        capability.last_failure_at = utc_now()
        db.commit()
        return {"ok": False, "status": "unavailable"}
    capability.health_status = "healthy"
    capability.last_success_at = utc_now()
    db.commit()
    return {"ok": True, "status": "healthy"}
