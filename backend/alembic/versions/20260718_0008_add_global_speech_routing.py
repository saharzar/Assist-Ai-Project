"""add global speech provider routing

Revision ID: 20260718_0008
Revises: 20260718_0007
Create Date: 2026-07-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260718_0008"
down_revision: str | None = "20260718_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("speech_provider_settings", sa.Column("automatic_tts_routing_enabled", sa.Boolean(), server_default=sa.true(), nullable=False))
    op.add_column("speech_provider_settings", sa.Column("automatic_stt_routing_enabled", sa.Boolean(), server_default=sa.true(), nullable=False))
    op.add_column("speech_provider_settings", sa.Column("forced_tts_provider_key", sa.String(32), nullable=True))
    op.add_column("speech_provider_settings", sa.Column("forced_stt_provider_key", sa.String(32), nullable=True))
    op.add_column("speech_provider_settings", sa.Column("updated_by_admin_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_speech_settings_updated_by", "speech_provider_settings", "users", ["updated_by_admin_id"], ["id"], ondelete="SET NULL")

    op.add_column("speech_usage", sa.Column("period_end", sa.Date(), nullable=True))
    op.add_column("speech_usage", sa.Column("fallback_count", sa.Integer(), server_default="0", nullable=False))
    op.create_index(op.f("ix_speech_usage_period_end"), "speech_usage", ["period_end"])

    op.add_column("speech_provider_events", sa.Column("provider_key", sa.String(32), nullable=True))
    op.add_column("speech_provider_events", sa.Column("usage_at_event", sa.Integer(), nullable=True))
    op.add_column("speech_provider_events", sa.Column("threshold_at_event", sa.Integer(), nullable=True))
    op.add_column("speech_provider_events", sa.Column("configured_limit", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_speech_provider_events_provider_key"), "speech_provider_events", ["provider_key"])

    op.create_table(
        "speech_provider_capability_configs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("provider_key", sa.String(32), nullable=False),
        sa.Column("display_name", sa.String(80), nullable=False),
        sa.Column("service_type", sa.String(8), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("available", sa.Boolean(), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("quota_type", sa.String(16), nullable=False),
        sa.Column("quota_limit", sa.Integer(), nullable=True),
        sa.Column("usage_unit", sa.String(32), nullable=False),
        sa.Column("warning_threshold_percent", sa.Integer(), nullable=False),
        sa.Column("switch_threshold_percent", sa.Integer(), nullable=False),
        sa.Column("billing_period_type", sa.String(24), nullable=False),
        sa.Column("reset_day", sa.Integer(), nullable=True),
        sa.Column("health_status", sa.String(16), nullable=False),
        sa.Column("cooldown_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("quota_blocked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_success_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_failure_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("service_type IN ('tts', 'stt')", name="ck_speech_capability_service"),
        sa.CheckConstraint("quota_type IN ('limited', 'unlimited')", name="ck_speech_capability_quota_type"),
        sa.CheckConstraint("billing_period_type IN ('calendar_month', 'custom_monthly', 'no_reset', 'manual')", name="ck_speech_capability_billing_period"),
        sa.CheckConstraint("warning_threshold_percent > 0 AND warning_threshold_percent < switch_threshold_percent", name="ck_speech_capability_thresholds"),
        sa.CheckConstraint("switch_threshold_percent <= 100", name="ck_speech_capability_switch_threshold"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_key", "service_type", name="uq_speech_provider_capability"),
        sa.UniqueConstraint("service_type", "priority", name="uq_speech_provider_capability_priority"),
    )
    op.create_index(op.f("ix_speech_provider_capability_configs_provider_key"), "speech_provider_capability_configs", ["provider_key"])
    op.create_index(op.f("ix_speech_provider_capability_configs_service_type"), "speech_provider_capability_configs", ["service_type"])
    op.create_index("ix_speech_capability_service_priority", "speech_provider_capability_configs", ["service_type", "priority"])


def downgrade() -> None:
    op.drop_index("ix_speech_capability_service_priority", table_name="speech_provider_capability_configs")
    op.drop_index(op.f("ix_speech_provider_capability_configs_service_type"), table_name="speech_provider_capability_configs")
    op.drop_index(op.f("ix_speech_provider_capability_configs_provider_key"), table_name="speech_provider_capability_configs")
    op.drop_table("speech_provider_capability_configs")
    op.drop_index(op.f("ix_speech_provider_events_provider_key"), table_name="speech_provider_events")
    for column in ("configured_limit", "threshold_at_event", "usage_at_event", "provider_key"):
        op.drop_column("speech_provider_events", column)
    op.drop_index(op.f("ix_speech_usage_period_end"), table_name="speech_usage")
    op.drop_column("speech_usage", "fallback_count")
    op.drop_column("speech_usage", "period_end")
    op.drop_constraint("fk_speech_settings_updated_by", "speech_provider_settings", type_="foreignkey")
    for column in ("updated_by_admin_id", "forced_stt_provider_key", "forced_tts_provider_key", "automatic_stt_routing_enabled", "automatic_tts_routing_enabled"):
        op.drop_column("speech_provider_settings", column)
