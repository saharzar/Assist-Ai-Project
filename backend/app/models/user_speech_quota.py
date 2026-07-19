from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserSpeechUsagePeriod(Base):
    __tablename__ = "user_speech_usage_periods"
    __table_args__ = (
        UniqueConstraint("user_id", "period_start", "period_end", name="uq_user_speech_period"),
        Index("ix_user_speech_period_dates", "period_start", "period_end"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    tts_characters_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stt_seconds_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    successful_tts_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_tts_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    successful_stt_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_stt_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class UserQuotaDefaults(Base):
    __tablename__ = "user_quota_defaults"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tts_limit_characters: Mapped[int] = mapped_column(Integer, default=5000, nullable=False)
    stt_limit_seconds: Mapped[int] = mapped_column(Integer, default=300, nullable=False)
    period_type: Mapped[str] = mapped_column(String(16), default="weekly", nullable=False)
    updated_by_admin_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class QuotaIncreaseRequest(Base):
    __tablename__ = "quota_increase_requests"
    __table_args__ = (Index("ix_quota_request_status_created", "status", "created_at"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    service_type: Mapped[str] = mapped_column(String(8), nullable=False)
    requested_tts_characters: Mapped[int | None] = mapped_column(Integer)
    requested_stt_seconds: Mapped[int | None] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="pending", index=True)
    admin_response: Mapped[str | None] = mapped_column(Text)
    approved_tts_characters: Mapped[int | None] = mapped_column(Integer)
    approved_stt_seconds: Mapped[int | None] = mapped_column(Integer)
    reviewed_by_admin_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class QuotaAdjustmentHistory(Base):
    __tablename__ = "quota_adjustment_history"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    adjustment_type: Mapped[str] = mapped_column(String(32), nullable=False)
    previous_tts_limit: Mapped[int | None] = mapped_column(Integer)
    new_tts_limit: Mapped[int | None] = mapped_column(Integer)
    previous_stt_limit: Mapped[int | None] = mapped_column(Integer)
    new_stt_limit: Mapped[int | None] = mapped_column(Integer)
    added_tts_characters: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    added_stt_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    admin_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    related_request_id: Mapped[int | None] = mapped_column(ForeignKey("quota_increase_requests.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class UserNotification(Base):
    __tablename__ = "user_notifications"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    notification_type: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(Text)
    period_key: Mapped[str | None] = mapped_column(String(32))
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
