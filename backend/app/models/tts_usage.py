from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserTtsUsage(Base):
    __tablename__ = "user_tts_usage"
    __table_args__ = (UniqueConstraint("user_id", name="uq_user_tts_usage_user_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tts_limit_characters: Mapped[int] = mapped_column(Integer, default=5000, nullable=False)
    tts_used_characters: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tts_reset_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    extra_characters: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    period_type: Mapped[str] = mapped_column(String(16), default="weekly", nullable=False)
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    uses_default: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_by_admin_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
