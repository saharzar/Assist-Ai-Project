"""create user tts usage table

Revision ID: 20260706_0003
Revises: 20260630_0002
Create Date: 2026-07-06 00:03:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260706_0003"
down_revision: str | None = "20260630_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_tts_usage",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("tts_limit_characters", sa.Integer(), nullable=False, server_default="5000"),
        sa.Column("tts_used_characters", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tts_reset_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_user_tts_usage_user_id"),
    )
    op.create_index(op.f("ix_user_tts_usage_id"), "user_tts_usage", ["id"], unique=False)
    op.create_index(op.f("ix_user_tts_usage_user_id"), "user_tts_usage", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_tts_usage_user_id"), table_name="user_tts_usage")
    op.drop_index(op.f("ix_user_tts_usage_id"), table_name="user_tts_usage")
    op.drop_table("user_tts_usage")
