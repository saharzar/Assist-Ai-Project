"""create user stt usage

Revision ID: 20260711_0005
Revises: 20260706_0004
Create Date: 2026-07-11
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260711_0005"
down_revision: str | None = "20260706_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_stt_usage",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("stt_limit_seconds", sa.Integer(), nullable=False),
        sa.Column("stt_used_seconds", sa.Integer(), nullable=False),
        sa.Column("stt_reset_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_user_stt_usage_user_id"),
    )
    op.create_index(op.f("ix_user_stt_usage_id"), "user_stt_usage", ["id"], unique=False)
    op.create_index(op.f("ix_user_stt_usage_user_id"), "user_stt_usage", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_stt_usage_user_id"), table_name="user_stt_usage")
    op.drop_index(op.f("ix_user_stt_usage_id"), table_name="user_stt_usage")
    op.drop_table("user_stt_usage")
