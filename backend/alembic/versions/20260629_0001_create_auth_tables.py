"""create auth tables

Revision ID: 20260629_0001
Revises:
Create Date: 2026-06-29 00:01:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260629_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("user_category", sa.String(length=64), nullable=False),
        sa.Column("preferred_language", sa.String(length=8), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

    op.create_table(
        "guest_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("guest_session_token", sa.String(length=255), nullable=False),
        sa.Column("save_progress", sa.Boolean(), nullable=False),
        sa.Column("preferred_language", sa.String(length=8), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_guest_sessions_guest_session_token"),
        "guest_sessions",
        ["guest_session_token"],
        unique=True,
    )
    op.create_index(op.f("ix_guest_sessions_id"), "guest_sessions", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_guest_sessions_id"), table_name="guest_sessions")
    op.drop_index(op.f("ix_guest_sessions_guest_session_token"), table_name="guest_sessions")
    op.drop_table("guest_sessions")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
