from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class BillScenarioSession(Base):
    __tablename__ = "bill_scenario_sessions"
    __table_args__ = (CheckConstraint(
        "(user_id IS NOT NULL AND guest_session_id IS NULL) OR "
        "(user_id IS NULL AND guest_session_id IS NOT NULL)", name="ck_bill_session_single_owner"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    guest_session_id: Mapped[int | None] = mapped_column(ForeignKey("guest_sessions.id", ondelete="CASCADE"), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    selected_language: Mapped[str] = mapped_column(String(8))
    completion_status: Mapped[str] = mapped_column(String(24), default="in_progress", index=True)
    final_step_reached: Mapped[str] = mapped_column(String(32), default="login")
    termination_reason: Mapped[str | None] = mapped_column(String(32))
    success: Mapped[bool] = mapped_column(Boolean, default=False)
    security_terminated: Mapped[bool] = mapped_column(Boolean, default=False)
    login_attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    incorrect_login_count: Mapped[int] = mapped_column(Integer, default=0)
    payment_attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    validation_error_count: Mapped[int] = mapped_column(Integer, default=0)
    paid_bill_count: Mapped[int] = mapped_column(Integer, default=0)
    back_navigation_count: Mapped[int] = mapped_column(Integer, default=0)


class BillScenarioEvent(Base):
    __tablename__ = "bill_scenario_events"
    __table_args__ = (UniqueConstraint("session_id", "client_event_id", name="uq_bill_session_event"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("bill_scenario_sessions.id", ondelete="CASCADE"), index=True)
    client_event_id: Mapped[str] = mapped_column(String(36))
    event_type: Mapped[str] = mapped_column(String(32))
    step: Mapped[str] = mapped_column(String(32))
    bill_type: Mapped[str | None] = mapped_column(String(24))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
