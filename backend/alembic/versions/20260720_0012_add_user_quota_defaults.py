"""add user quota defaults

Revision ID: 20260720_0012
Revises: 20260720_0011
"""
from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = "20260720_0012"
down_revision: str | None = "20260720_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    op.create_table("user_quota_defaults", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("tts_limit_characters", sa.Integer(), server_default="5000", nullable=False), sa.Column("stt_limit_seconds", sa.Integer(), server_default="300", nullable=False), sa.Column("period_type", sa.String(16), server_default="weekly", nullable=False), sa.Column("updated_by_admin_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.execute("INSERT INTO user_quota_defaults (id, tts_limit_characters, stt_limit_seconds, period_type) VALUES (1, 5000, 300, 'weekly')")

def downgrade() -> None:
    op.drop_table("user_quota_defaults")
