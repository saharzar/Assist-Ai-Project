from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AtmScenarioSession(Base):
    __tablename__ = "atm_scenario_sessions"
    __table_args__ = (
        CheckConstraint(
            "(user_id IS NOT NULL AND guest_session_id IS NULL) OR "
            "(user_id IS NULL AND guest_session_id IS NOT NULL)",
            name="ck_atm_session_single_owner",
        ),
        Index("ix_atm_sessions_scenario_started", "scenario_type", "started_at"),
        Index("ix_atm_sessions_status_started", "completion_status", "started_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True, nullable=False)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    guest_session_id: Mapped[int | None] = mapped_column(
        ForeignKey("guest_sessions.id", ondelete="CASCADE"), index=True, nullable=True
    )
    scenario_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    incorrect_user_pin_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    simulated_system_error_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_pin_submission_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    first_pin_was_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    identity_verification_attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    incorrect_identity_verification_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    identity_verification_succeeded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    returned_to_pin_after_verification: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    pin_return_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    security_terminated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    termination_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    success_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    terminated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completion_status: Mapped[str] = mapped_column(
        String(24), default="in_progress", index=True, nullable=False
    )
    success: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    selected_language: Mapped[str | None] = mapped_column(String(8), index=True, nullable=True)
    stt_provider: Mapped[str | None] = mapped_column(String(32), index=True, nullable=True)
    used_voice_input: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    used_keyboard_input: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    final_step_reached: Mapped[str] = mapped_column(String(32), default="welcome", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class AtmScenarioEvent(Base):
    __tablename__ = "atm_scenario_events"
    __table_args__ = (
        UniqueConstraint("client_event_id", name="uq_atm_scenario_events_client_event_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("atm_scenario_sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    client_event_id: Mapped[str] = mapped_column(String(36), nullable=False)
    event_type: Mapped[str] = mapped_column(String(32), nullable=False)
    event_outcome: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
