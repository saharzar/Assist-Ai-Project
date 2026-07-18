from datetime import date, datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SpeechProviderSettings(Base):
    __tablename__ = "speech_provider_settings"
    __table_args__ = (
        CheckConstraint("tts_mode IN ('automatic', 'azure', 'browser')", name="ck_speech_settings_tts_mode"),
        CheckConstraint("stt_mode IN ('automatic', 'azure', 'browser')", name="ck_speech_settings_stt_mode"),
        CheckConstraint(
            "warning_threshold_percent > 0 AND warning_threshold_percent < switch_threshold_percent",
            name="ck_speech_settings_warning_threshold",
        ),
        CheckConstraint("switch_threshold_percent <= 100", name="ck_speech_settings_switch_threshold"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tts_mode: Mapped[str] = mapped_column(String(16), default="automatic", nullable=False)
    stt_mode: Mapped[str] = mapped_column(String(16), default="automatic", nullable=False)
    azure_tts_monthly_limit: Mapped[int] = mapped_column(Integer, default=500000, nullable=False)
    azure_stt_monthly_limit_seconds: Mapped[int] = mapped_column(Integer, default=18000, nullable=False)
    warning_threshold_percent: Mapped[int] = mapped_column(Integer, default=80, nullable=False)
    switch_threshold_percent: Mapped[int] = mapped_column(Integer, default=95, nullable=False)
    tts_fallback_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stt_fallback_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class SpeechUsage(Base):
    __tablename__ = "speech_usage"
    __table_args__ = (
        UniqueConstraint(
            "billing_period", "provider", "service_type", name="uq_speech_usage_period_provider_service"
        ),
        Index("ix_speech_usage_period_service", "billing_period", "service_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    billing_period: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    service_type: Mapped[str] = mapped_column(String(8), index=True, nullable=False)
    successful_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    characters_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cached_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    audio_seconds_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class SpeechProviderEvent(Base):
    __tablename__ = "speech_provider_events"
    __table_args__ = (Index("ix_speech_provider_events_service_created", "service_type", "created_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    billing_period: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    service_type: Mapped[str] = mapped_column(String(8), index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    previous_provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    new_provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    administrator_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True, nullable=False
    )


class SpeechUsageRequest(Base):
    __tablename__ = "speech_usage_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[str] = mapped_column(String(36), unique=True, index=True, nullable=False)
    billing_period: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    service_type: Mapped[str] = mapped_column(String(8), nullable=False)
    outcome: Mapped[str] = mapped_column(String(16), nullable=False)
    characters_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    audio_seconds_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    was_cached: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    result_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
