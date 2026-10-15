"""Restaurant practice sessions/events and existing CV attempt linkage."""
from alembic import op
import sqlalchemy as sa

revision = "20261015_0018"
down_revision = "20261001_0017"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("restaurant_scenario_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("guest_session_id", sa.Integer(), sa.ForeignKey("guest_sessions.id", ondelete="CASCADE")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("duration_seconds", sa.Integer()),
        sa.Column("selected_language", sa.String(8), nullable=False),
        sa.Column("completion_status", sa.String(24), nullable=False),
        sa.Column("final_step_reached", sa.String(32), nullable=False),
        sa.Column("unavailable_meal", sa.String(16)),
        sa.Column("selected_meal", sa.String(16)),
        sa.Column("menu_reopen_count", sa.Integer(), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.CheckConstraint("(user_id IS NOT NULL AND guest_session_id IS NULL) OR (user_id IS NULL AND guest_session_id IS NOT NULL)", name="ck_restaurant_session_single_owner"))
    for column in ("public_id", "user_id", "guest_session_id", "completion_status"):
        op.create_index(f"ix_restaurant_scenario_sessions_{column}", "restaurant_scenario_sessions", [column], unique=column == "public_id")
    op.create_table("restaurant_scenario_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("restaurant_scenario_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_event_id", sa.String(36), nullable=False),
        sa.Column("event_type", sa.String(32), nullable=False),
        sa.Column("meal", sa.String(16)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("session_id", "client_event_id", name="uq_restaurant_session_event"))
    op.create_index("ix_restaurant_scenario_events_session_id", "restaurant_scenario_events", ["session_id"])
    with op.batch_alter_table("computer_vision_sessions") as batch:
        batch.add_column(sa.Column("restaurant_session_id", sa.Integer(), nullable=True))
        batch.create_foreign_key("fk_cv_restaurant_attempt", "restaurant_scenario_sessions", ["restaurant_session_id"], ["id"], ondelete="SET NULL")
        batch.create_index("ix_computer_vision_sessions_restaurant_session_id", ["restaurant_session_id"])
        batch.drop_constraint("ck_cv_session_scenario", type_="check")
        batch.create_check_constraint("ck_cv_session_scenario", "scenario_key IN ('atm-withdrawal', 'online-bill-payment', 'restaurant-ordering')")
        batch.create_check_constraint("ck_cv_session_restaurant_attempt", "restaurant_session_id IS NULL OR scenario_key = 'restaurant-ordering'")


def downgrade():
    # Preserve recordings: narrowing the constraint requires removing/exporting
    # restaurant recordings explicitly before downgrade if any exist.
    with op.batch_alter_table("computer_vision_sessions") as batch:
        batch.drop_constraint("ck_cv_session_restaurant_attempt", type_="check")
        batch.drop_constraint("ck_cv_session_scenario", type_="check")
        batch.create_check_constraint("ck_cv_session_scenario", "scenario_key IN ('atm-withdrawal', 'online-bill-payment')")
        batch.drop_index("ix_computer_vision_sessions_restaurant_session_id")
        batch.drop_constraint("fk_cv_restaurant_attempt", type_="foreignkey")
        batch.drop_column("restaurant_session_id")
    op.drop_table("restaurant_scenario_events")
    op.drop_table("restaurant_scenario_sessions")
