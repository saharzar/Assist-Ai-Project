"""create ATM scenario analytics sessions

Revision ID: 20260718_0006
Revises: 20260711_0005
Create Date: 2026-07-18
"""

from collections.abc import Sequence
import uuid

import sqlalchemy as sa
from alembic import op

revision: str = "20260718_0006"
down_revision: str | None = "20260711_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("guest_sessions", sa.Column("analytics_guest_id", sa.String(36), nullable=True))
    op.create_index(
        op.f("ix_guest_sessions_analytics_guest_id"),
        "guest_sessions",
        ["analytics_guest_id"],
        unique=True,
    )

    connection = op.get_bind()
    consenting_guests = connection.execute(
        sa.text("SELECT id FROM guest_sessions WHERE save_progress = true")
    ).fetchall()
    for (guest_id,) in consenting_guests:
        connection.execute(
            sa.text(
                "UPDATE guest_sessions SET analytics_guest_id = :analytics_id WHERE id = :guest_id"
            ),
            {"analytics_id": str(uuid.uuid4()), "guest_id": guest_id},
        )

    op.create_table(
        "atm_scenario_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("public_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("guest_session_id", sa.Integer(), nullable=True),
        sa.Column("scenario_type", sa.String(64), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("incorrect_user_pin_count", sa.Integer(), nullable=False),
        sa.Column("simulated_system_error_count", sa.Integer(), nullable=False),
        sa.Column("total_pin_submission_count", sa.Integer(), nullable=False),
        sa.Column("retry_count", sa.Integer(), nullable=False),
        sa.Column("completion_status", sa.String(24), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column("selected_language", sa.String(8), nullable=True),
        sa.Column("stt_provider", sa.String(32), nullable=True),
        sa.Column("used_voice_input", sa.Boolean(), nullable=False),
        sa.Column("used_keyboard_input", sa.Boolean(), nullable=False),
        sa.Column("final_step_reached", sa.String(32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "(user_id IS NOT NULL AND guest_session_id IS NULL) OR "
            "(user_id IS NULL AND guest_session_id IS NOT NULL)",
            name="ck_atm_session_single_owner",
        ),
        sa.ForeignKeyConstraint(["guest_session_id"], ["guest_sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("public_id"),
    )
    op.create_index("ix_atm_sessions_scenario_started", "atm_scenario_sessions", ["scenario_type", "started_at"])
    op.create_index("ix_atm_sessions_status_started", "atm_scenario_sessions", ["completion_status", "started_at"])
    for column in ("public_id", "user_id", "guest_session_id", "scenario_type", "completion_status", "selected_language", "stt_provider"):
        op.create_index(op.f(f"ix_atm_scenario_sessions_{column}"), "atm_scenario_sessions", [column])

    op.create_table(
        "atm_scenario_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("client_event_id", sa.String(36), nullable=False),
        sa.Column("event_type", sa.String(32), nullable=False),
        sa.Column("event_outcome", sa.String(32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["atm_scenario_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("client_event_id", name="uq_atm_scenario_events_client_event_id"),
    )
    op.create_index(op.f("ix_atm_scenario_events_session_id"), "atm_scenario_events", ["session_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_atm_scenario_events_session_id"), table_name="atm_scenario_events")
    op.drop_table("atm_scenario_events")
    for column in ("stt_provider", "selected_language", "completion_status", "scenario_type", "guest_session_id", "user_id", "public_id"):
        op.drop_index(op.f(f"ix_atm_scenario_sessions_{column}"), table_name="atm_scenario_sessions")
    op.drop_index("ix_atm_sessions_status_started", table_name="atm_scenario_sessions")
    op.drop_index("ix_atm_sessions_scenario_started", table_name="atm_scenario_sessions")
    op.drop_table("atm_scenario_sessions")
    op.drop_index(op.f("ix_guest_sessions_analytics_guest_id"), table_name="guest_sessions")
    op.drop_column("guest_sessions", "analytics_guest_id")
