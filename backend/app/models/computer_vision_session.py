from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ComputerVisionSession(Base):
    __tablename__ = "computer_vision_sessions"
    __table_args__ = (
        CheckConstraint("(user_id IS NOT NULL AND guest_session_id IS NULL) OR "
                        "(user_id IS NULL AND guest_session_id IS NOT NULL)", name="ck_cv_session_single_owner"),
        CheckConstraint("scenario_key IN ('atm-withdrawal', 'online-bill-payment')", name="ck_cv_session_scenario"),
        CheckConstraint("atm_session_id IS NULL OR scenario_key = 'atm-withdrawal'", name="ck_cv_session_atm_attempt"),
        CheckConstraint("bill_session_id IS NULL OR scenario_key = 'online-bill-payment'", name="ck_cv_session_bill_attempt"),
        CheckConstraint("duration_ms >= 0", name="ck_cv_session_duration"),
        CheckConstraint("consent_given = true", name="ck_cv_session_consent"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    guest_session_id: Mapped[int | None] = mapped_column(ForeignKey("guest_sessions.id", ondelete="CASCADE"), index=True)
    scenario_key: Mapped[str] = mapped_column(String(64), index=True)
    atm_session_id: Mapped[int | None] = mapped_column(ForeignKey("atm_scenario_sessions.id", ondelete="SET NULL"), index=True)
    bill_session_id: Mapped[int | None] = mapped_column(ForeignKey("bill_scenario_sessions.id", ondelete="SET NULL"), index=True)
    consent_given: Mapped[bool] = mapped_column(Boolean)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_ms: Mapped[int] = mapped_column(Integer)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ComputerVisionSample(Base):
    __tablename__ = "computer_vision_samples"
    __table_args__ = (
        UniqueConstraint("session_id", "timestamp_ms", name="uq_cv_sample_session_timestamp"),
        CheckConstraint("timestamp_ms >= 0", name="ck_cv_sample_timestamp"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("computer_vision_sessions.id", ondelete="CASCADE"), index=True)
    timestamp_ms: Mapped[int] = mapped_column(Integer)
    yaw: Mapped[float | None] = mapped_column(Float)
    pitch: Mapped[float | None] = mapped_column(Float)
    roll: Mapped[float | None] = mapped_column(Float)
    estimated_eye_direction: Mapped[str | None] = mapped_column(String(8))
    is_user_interacting: Mapped[bool] = mapped_column(Boolean)
