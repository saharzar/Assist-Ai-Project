from datetime import datetime, timezone
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class RestaurantScenarioSession(Base):
    __tablename__ = "restaurant_scenario_sessions"
    __table_args__ = (CheckConstraint(
        "(user_id IS NOT NULL AND guest_session_id IS NULL) OR (user_id IS NULL AND guest_session_id IS NOT NULL)",
        name="ck_restaurant_session_single_owner"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    guest_session_id: Mapped[int | None] = mapped_column(ForeignKey("guest_sessions.id", ondelete="CASCADE"), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    selected_language: Mapped[str] = mapped_column(String(8))
    completion_status: Mapped[str] = mapped_column(String(24), default="in_progress", index=True)
    final_step_reached: Mapped[str] = mapped_column(String(32), default="menu")
    unavailable_meal: Mapped[str | None] = mapped_column(String(16))
    selected_meal: Mapped[str | None] = mapped_column(String(16))
    menu_reopen_count: Mapped[int] = mapped_column(Integer, default=0)
    success: Mapped[bool] = mapped_column(Boolean, default=False)


class RestaurantScenarioEvent(Base):
    __tablename__ = "restaurant_scenario_events"
    __table_args__ = (UniqueConstraint("session_id", "client_event_id", name="uq_restaurant_session_event"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("restaurant_scenario_sessions.id", ondelete="CASCADE"), index=True)
    client_event_id: Mapped[str] = mapped_column(String(36))
    event_type: Mapped[str] = mapped_column(String(32))
    meal: Mapped[str | None] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
