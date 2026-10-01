"""Create completed computer vision sessions and derived sample rows."""
from alembic import op
import sqlalchemy as sa

revision = "20261001_0017"
down_revision = "20260930_0016"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("computer_vision_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("guest_session_id", sa.Integer(), sa.ForeignKey("guest_sessions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("scenario_key", sa.String(64), nullable=False),
        sa.Column("atm_session_id", sa.Integer(), sa.ForeignKey("atm_scenario_sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("bill_session_id", sa.Integer(), sa.ForeignKey("bill_scenario_sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("consent_given", sa.Boolean(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("(user_id IS NOT NULL AND guest_session_id IS NULL) OR (user_id IS NULL AND guest_session_id IS NOT NULL)", name="ck_cv_session_single_owner"),
        sa.CheckConstraint("scenario_key IN ('atm-withdrawal', 'online-bill-payment')", name="ck_cv_session_scenario"),
        sa.CheckConstraint("atm_session_id IS NULL OR scenario_key = 'atm-withdrawal'", name="ck_cv_session_atm_attempt"),
        sa.CheckConstraint("bill_session_id IS NULL OR scenario_key = 'online-bill-payment'", name="ck_cv_session_bill_attempt"),
        sa.CheckConstraint("duration_ms >= 0", name="ck_cv_session_duration"),
        sa.CheckConstraint("consent_given = true", name="ck_cv_session_consent"),
    )
    for column in ("public_id", "user_id", "guest_session_id", "scenario_key", "atm_session_id", "bill_session_id"):
        op.create_index(f"ix_computer_vision_sessions_{column}", "computer_vision_sessions", [column], unique=column == "public_id")
    op.create_table("computer_vision_samples",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("computer_vision_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("timestamp_ms", sa.Integer(), nullable=False),
        sa.Column("yaw", sa.Float(), nullable=True),
        sa.Column("pitch", sa.Float(), nullable=True),
        sa.Column("roll", sa.Float(), nullable=True),
        sa.Column("estimated_eye_direction", sa.String(8), nullable=True),
        sa.Column("is_user_interacting", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("session_id", "timestamp_ms", name="uq_cv_sample_session_timestamp"),
        sa.CheckConstraint("timestamp_ms >= 0", name="ck_cv_sample_timestamp"),
    )
    op.create_index("ix_computer_vision_samples_session_id", "computer_vision_samples", ["session_id"])


def downgrade():
    op.drop_table("computer_vision_samples")
    op.drop_table("computer_vision_sessions")
