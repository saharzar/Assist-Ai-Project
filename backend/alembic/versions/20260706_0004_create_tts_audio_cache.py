"""create tts audio cache

Revision ID: 20260706_0004
Revises: 20260706_0003
Create Date: 2026-07-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260706_0004"
down_revision: str | None = "20260706_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "tts_audio_cache",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cache_key", sa.String(length=64), nullable=False),
        sa.Column("text_hash", sa.String(length=64), nullable=False),
        sa.Column("language", sa.String(length=8), nullable=False),
        sa.Column("voice", sa.String(length=120), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("content_type", sa.String(length=80), nullable=False),
        sa.Column("character_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_accessed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tts_audio_cache_id"), "tts_audio_cache", ["id"], unique=False)
    op.create_index(op.f("ix_tts_audio_cache_cache_key"), "tts_audio_cache", ["cache_key"], unique=True)
    op.create_index(op.f("ix_tts_audio_cache_language"), "tts_audio_cache", ["language"], unique=False)
    op.create_index(op.f("ix_tts_audio_cache_text_hash"), "tts_audio_cache", ["text_hash"], unique=False)
    op.create_index(op.f("ix_tts_audio_cache_voice"), "tts_audio_cache", ["voice"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_tts_audio_cache_voice"), table_name="tts_audio_cache")
    op.drop_index(op.f("ix_tts_audio_cache_text_hash"), table_name="tts_audio_cache")
    op.drop_index(op.f("ix_tts_audio_cache_language"), table_name="tts_audio_cache")
    op.drop_index(op.f("ix_tts_audio_cache_cache_key"), table_name="tts_audio_cache")
    op.drop_index(op.f("ix_tts_audio_cache_id"), table_name="tts_audio_cache")
    op.drop_table("tts_audio_cache")
