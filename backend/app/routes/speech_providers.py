from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_admin, get_current_user
from app.database import get_db
from app.models.speech_provider import SpeechUsage
from app.models.user import User
from app.schemas.speech_provider import (
    SpeechProviderDashboard,
    SpeechProviderEventRead,
    SpeechProviderResolution,
    SpeechProviderSettingsRead,
    SpeechProviderSettingsUpdate,
    SpeechServiceSnapshot,
    SpeechUsageHistoryRead,
)
from app.services.speech_provider_manager import (
    get_or_create_provider_settings,
    list_provider_events,
    resolve_provider,
    service_used,
    update_provider_settings,
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SpeechProviderResolution:
    decision = resolve_provider(db, service_type)
    db.commit()
    return SpeechProviderResolution(
        service_type=decision.service_type,
        provider=decision.provider,
        mode=decision.mode,
        status=decision.status,
    )


@router.get("/admin/speech-providers", response_model=SpeechProviderDashboard)
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


@router.put("/admin/speech-providers/settings", response_model=SpeechProviderSettingsRead)
def change_speech_provider_settings(
    payload: SpeechProviderSettingsUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> SpeechProviderSettingsRead:
    return _settings_read(update_provider_settings(db, payload, current_admin.id))
