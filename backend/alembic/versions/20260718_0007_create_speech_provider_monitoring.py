"""create speech provider monitoring

Revision ID: 20260718_0007
Revises: 20260718_0006
Create Date: 2026-07-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260718_0007"
down_revision: str | None = "20260718_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "speech_provider_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tts_mode", sa.String(16), nullable=False),
        sa.Column("stt_mode", sa.String(16), nullable=False),
        sa.Column("azure_tts_monthly_limit", sa.Integer(), nullable=False),
        sa.Column("azure_stt_monthly_limit_seconds", sa.Integer(), nullable=False),
        sa.Column("warning_threshold_percent", sa.Integer(), nullable=False),
        sa.Column("switch_threshold_percent", sa.Integer(), nullable=False),
        sa.Column("tts_fallback_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stt_fallback_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("tts_mode IN ('automatic', 'azure', 'browser')", name="ck_speech_settings_tts_mode"),
        sa.CheckConstraint("stt_mode IN ('automatic', 'azure', 'browser')", name="ck_speech_settings_stt_mode"),
        sa.CheckConstraint("warning_threshold_percent > 0 AND warning_threshold_percent < switch_threshold_percent", name="ck_speech_settings_warning_threshold"),
        sa.CheckConstraint("switch_threshold_percent <= 100", name="ck_speech_settings_switch_threshold"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "speech_usage",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("billing_period", sa.Date(), nullable=False),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("service_type", sa.String(8), nullable=False),
        sa.Column("successful_requests", sa.Integer(), nullable=False),
        sa.Column("failed_requests", sa.Integer(), nullable=False),
        sa.Column("characters_used", sa.Integer(), nullable=False),
        sa.Column("cached_requests", sa.Integer(), nullable=False),
        sa.Column("audio_seconds_used", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("billing_period", "provider", "service_type", name="uq_speech_usage_period_provider_service"),
    )
    op.create_index("ix_speech_usage_period_service", "speech_usage", ["billing_period", "service_type"])
    for column in ("billing_period", "provider", "service_type"):
        op.create_index(op.f(f"ix_speech_usage_{column}"), "speech_usage", [column])

    op.create_table(
        "speech_provider_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("billing_period", sa.Date(), nullable=False),
        sa.Column("service_type", sa.String(8), nullable=False),
        sa.Column("event_type", sa.String(40), nullable=False),
        sa.Column("previous_provider", sa.String(32), nullable=True),
        sa.Column("new_provider", sa.String(32), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("administrator_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["administrator_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_speech_provider_events_service_created", "speech_provider_events", ["service_type", "created_at"])
    for column in ("billing_period", "service_type", "event_type", "administrator_id", "created_at"):
        op.create_index(op.f(f"ix_speech_provider_events_{column}"), "speech_provider_events", [column])

    op.create_table(
        "speech_usage_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("request_id", sa.String(36), nullable=False),
        sa.Column("billing_period", sa.Date(), nullable=False),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("service_type", sa.String(8), nullable=False),
        sa.Column("outcome", sa.String(16), nullable=False),
        sa.Column("characters_used", sa.Integer(), nullable=False),
        sa.Column("audio_seconds_used", sa.Integer(), nullable=False),
        sa.Column("was_cached", sa.Boolean(), nullable=False),
        sa.Column("result_payload", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_speech_usage_requests_request_id"), "speech_usage_requests", ["request_id"], unique=True)
    op.create_index(op.f("ix_speech_usage_requests_billing_period"), "speech_usage_requests", ["billing_period"])


def downgrade() -> None:
    op.drop_index(op.f("ix_speech_usage_requests_billing_period"), table_name="speech_usage_requests")
    op.drop_index(op.f("ix_speech_usage_requests_request_id"), table_name="speech_usage_requests")
    op.drop_table("speech_usage_requests")
    for column in ("created_at", "administrator_id", "event_type", "service_type", "billing_period"):
        op.drop_index(op.f(f"ix_speech_provider_events_{column}"), table_name="speech_provider_events")
    op.drop_index("ix_speech_provider_events_service_created", table_name="speech_provider_events")
    op.drop_table("speech_provider_events")
    for column in ("service_type", "provider", "billing_period"):
        op.drop_index(op.f(f"ix_speech_usage_{column}"), table_name="speech_usage")
    op.drop_index("ix_speech_usage_period_service", table_name="speech_usage")
    op.drop_table("speech_usage")
    op.drop_table("speech_provider_settings")
