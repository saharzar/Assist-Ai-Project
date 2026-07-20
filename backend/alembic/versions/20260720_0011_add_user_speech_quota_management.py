"""add per-user speech quota management

Revision ID: 20260720_0011
Revises: 20260719_0010
"""
from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = "20260720_0011"
down_revision: str | None = "20260719_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _extend_usage(table: str, extra: str) -> None:
    op.add_column(table, sa.Column(extra, sa.Integer(), server_default="0", nullable=False))
    op.add_column(table, sa.Column("period_type", sa.String(16), server_default="weekly", nullable=False))
    op.add_column(table, sa.Column("period_start", sa.Date(), nullable=True))
    op.add_column(table, sa.Column("enabled", sa.Boolean(), server_default=sa.true(), nullable=False))
    op.add_column(table, sa.Column("uses_default", sa.Boolean(), server_default=sa.true(), nullable=False))
    op.add_column(table, sa.Column("updated_by_admin_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))


def upgrade() -> None:
    _extend_usage("user_tts_usage", "extra_characters")
    _extend_usage("user_stt_usage", "extra_seconds")
    op.execute("UPDATE user_tts_usage SET period_start = tts_reset_date - INTERVAL '7 days' WHERE tts_reset_date IS NOT NULL")
    op.execute("UPDATE user_stt_usage SET period_start = stt_reset_date - INTERVAL '7 days' WHERE stt_reset_date IS NOT NULL")
    op.create_table("user_speech_usage_periods", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("period_start", sa.Date(), nullable=False), sa.Column("period_end", sa.Date(), nullable=False), sa.Column("tts_characters_used", sa.Integer(), server_default="0", nullable=False), sa.Column("stt_seconds_used", sa.Integer(), server_default="0", nullable=False), sa.Column("successful_tts_requests", sa.Integer(), server_default="0", nullable=False), sa.Column("failed_tts_requests", sa.Integer(), server_default="0", nullable=False), sa.Column("successful_stt_requests", sa.Integer(), server_default="0", nullable=False), sa.Column("failed_stt_requests", sa.Integer(), server_default="0", nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.UniqueConstraint("user_id", "period_start", "period_end", name="uq_user_speech_period"))
    op.create_index("ix_user_speech_usage_periods_user_id", "user_speech_usage_periods", ["user_id"])
    op.create_index("ix_user_speech_period_dates", "user_speech_usage_periods", ["period_start", "period_end"])
    op.create_table("quota_increase_requests", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("service_type", sa.String(8), nullable=False), sa.Column("requested_tts_characters", sa.Integer()), sa.Column("requested_stt_seconds", sa.Integer()), sa.Column("reason", sa.Text(), nullable=False), sa.Column("status", sa.String(24), server_default="pending", nullable=False), sa.Column("admin_response", sa.Text()), sa.Column("approved_tts_characters", sa.Integer()), sa.Column("approved_stt_seconds", sa.Integer()), sa.Column("reviewed_by_admin_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")), sa.Column("reviewed_at", sa.DateTime(timezone=True)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    for name, columns in (("ix_quota_increase_requests_user_id", ["user_id"]), ("ix_quota_request_status_created", ["status", "created_at"]), ("ix_quota_increase_requests_reviewed_at", ["reviewed_at"])): op.create_index(name, "quota_increase_requests", columns)
    op.create_table("quota_adjustment_history", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("adjustment_type", sa.String(32), nullable=False), sa.Column("previous_tts_limit", sa.Integer()), sa.Column("new_tts_limit", sa.Integer()), sa.Column("previous_stt_limit", sa.Integer()), sa.Column("new_stt_limit", sa.Integer()), sa.Column("added_tts_characters", sa.Integer(), server_default="0", nullable=False), sa.Column("added_stt_seconds", sa.Integer(), server_default="0", nullable=False), sa.Column("reason", sa.Text(), nullable=False), sa.Column("admin_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")), sa.Column("related_request_id", sa.Integer(), sa.ForeignKey("quota_increase_requests.id", ondelete="SET NULL")), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_quota_adjustment_history_user_id", "quota_adjustment_history", ["user_id"])
    op.create_index("ix_quota_adjustment_history_created_at", "quota_adjustment_history", ["created_at"])
    op.create_table("user_notifications", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("notification_type", sa.String(40), nullable=False), sa.Column("title", sa.String(160), nullable=False), sa.Column("message", sa.Text(), nullable=False), sa.Column("period_key", sa.String(32)), sa.Column("read", sa.Boolean(), server_default=sa.false(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_user_notifications_user_id", "user_notifications", ["user_id"])
    op.create_index("ix_user_notifications_created_at", "user_notifications", ["created_at"])


def downgrade() -> None:
    op.drop_table("user_notifications")
    op.drop_table("quota_adjustment_history")
    op.drop_table("quota_increase_requests")
    op.drop_table("user_speech_usage_periods")
    for table, extra in (("user_tts_usage", "extra_characters"), ("user_stt_usage", "extra_seconds")):
        for column in ("updated_by_admin_id", "uses_default", "enabled", "period_start", "period_type", extra): op.drop_column(table, column)
