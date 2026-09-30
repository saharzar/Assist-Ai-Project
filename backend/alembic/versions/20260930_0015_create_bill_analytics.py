"""Create bill payment analytics sessions and events."""
from alembic import op
import sqlalchemy as sa
revision = "20260930_0015"
down_revision = "20260721_0014"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("bill_scenario_sessions",
        sa.Column("id", sa.Integer(), nullable=False, primary_key=True),
        sa.Column("public_id", sa.String(36), nullable=False, primary_key=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True, primary_key=False),
        sa.Column("guest_session_id", sa.Integer(), sa.ForeignKey("guest_sessions.id", ondelete="CASCADE"), nullable=True, primary_key=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, primary_key=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True, primary_key=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=True, primary_key=False),
        sa.Column("selected_language", sa.String(8), nullable=False, primary_key=False),
        sa.Column("completion_status", sa.String(24), nullable=False, primary_key=False),
        sa.Column("final_step_reached", sa.String(32), nullable=False, primary_key=False),
        sa.Column("termination_reason", sa.String(32), nullable=True, primary_key=False),
        sa.Column("success", sa.Boolean(), nullable=False, primary_key=False),
        sa.Column("security_terminated", sa.Boolean(), nullable=False, primary_key=False),
        sa.Column("login_attempt_count", sa.Integer(), nullable=False, primary_key=False),
        sa.Column("incorrect_login_count", sa.Integer(), nullable=False, primary_key=False),
        sa.Column("payment_attempt_count", sa.Integer(), nullable=False, primary_key=False),
        sa.Column("validation_error_count", sa.Integer(), nullable=False, primary_key=False),
        sa.Column("paid_bill_count", sa.Integer(), nullable=False, primary_key=False),
        sa.Column("back_navigation_count", sa.Integer(), nullable=False, primary_key=False),
        sa.CheckConstraint("(user_id IS NOT NULL AND guest_session_id IS NULL) OR (user_id IS NULL AND guest_session_id IS NOT NULL)", name="ck_bill_session_single_owner"),
    )
    op.create_index("ix_bill_scenario_sessions_completion_status", "bill_scenario_sessions", ['completion_status'], unique=False)
    op.create_index("ix_bill_scenario_sessions_guest_session_id", "bill_scenario_sessions", ['guest_session_id'], unique=False)
    op.create_index("ix_bill_scenario_sessions_public_id", "bill_scenario_sessions", ['public_id'], unique=True)
    op.create_index("ix_bill_scenario_sessions_user_id", "bill_scenario_sessions", ['user_id'], unique=False)
    op.create_table("bill_scenario_events",
        sa.Column("id", sa.Integer(), nullable=False, primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("bill_scenario_sessions.id", ondelete="CASCADE"), nullable=False, primary_key=False),
        sa.Column("client_event_id", sa.String(36), nullable=False, primary_key=False),
        sa.Column("event_type", sa.String(32), nullable=False, primary_key=False),
        sa.Column("step", sa.String(32), nullable=False, primary_key=False),
        sa.Column("bill_type", sa.String(24), nullable=True, primary_key=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, primary_key=False),
        sa.UniqueConstraint("session_id", "client_event_id", name="uq_bill_session_event"),
    )
    op.create_index("ix_bill_scenario_events_session_id", "bill_scenario_events", ['session_id'], unique=False)

def downgrade():
    op.drop_table("bill_scenario_events")
    op.drop_table("bill_scenario_sessions")
