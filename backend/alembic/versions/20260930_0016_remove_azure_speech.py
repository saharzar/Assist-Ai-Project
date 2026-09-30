"""Remove the retired speech provider and legacy settings API columns.

Historical usage and audit records remain unchanged.
"""
from alembic import op
import sqlalchemy as sa

revision = "20260930_0016"
down_revision = "20260930_0015"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("DELETE FROM speech_provider_capability_configs WHERE provider_key = 'azure'")
    # Tag legacy mixed-provider events so the current dashboard can exclude
    # retired-provider activity without deleting the historical reason text.
    op.execute("UPDATE speech_provider_events SET provider_key = 'azure' WHERE provider_key IS NULL AND lower(reason) LIKE '%azure%'")
    # Vacate priorities first to respect the per-service uniqueness constraint.
    op.execute("UPDATE speech_provider_capability_configs SET priority = priority + 1000")
    op.execute("UPDATE speech_provider_capability_configs SET priority = CASE provider_key WHEN 'soniox' THEN 1 ELSE 2 END, enabled = true WHERE provider_key IN ('soniox', 'browser')")
    op.execute("UPDATE speech_provider_settings SET automatic_tts_routing_enabled = true, automatic_stt_routing_enabled = true, forced_tts_provider_key = NULL, forced_stt_provider_key = NULL")
    with op.batch_alter_table("speech_provider_settings") as batch:
        batch.drop_constraint("ck_speech_settings_tts_mode", type_="check")
        batch.drop_constraint("ck_speech_settings_stt_mode", type_="check")
        for name in ("tts_mode", "stt_mode", "azure_tts_monthly_limit", "azure_stt_monthly_limit_seconds", "tts_fallback_until", "stt_fallback_until"):
            batch.drop_column(name)
    with op.batch_alter_table("speech_provider_capability_configs") as batch:
        batch.create_check_constraint("ck_speech_capability_provider", "provider_key IN ('soniox', 'browser')")


def downgrade():
    with op.batch_alter_table("speech_provider_capability_configs") as batch:
        batch.drop_constraint("ck_speech_capability_provider", type_="check")
    with op.batch_alter_table("speech_provider_settings") as batch:
        batch.add_column(sa.Column("tts_mode", sa.String(16), nullable=False, server_default="automatic"))
        batch.add_column(sa.Column("stt_mode", sa.String(16), nullable=False, server_default="automatic"))
        batch.add_column(sa.Column("azure_tts_monthly_limit", sa.Integer(), nullable=False, server_default="500000"))
        batch.add_column(sa.Column("azure_stt_monthly_limit_seconds", sa.Integer(), nullable=False, server_default="18000"))
        batch.add_column(sa.Column("tts_fallback_until", sa.DateTime(timezone=True)))
        batch.add_column(sa.Column("stt_fallback_until", sa.DateTime(timezone=True)))
        batch.create_check_constraint("ck_speech_settings_tts_mode", "tts_mode IN ('automatic', 'azure', 'browser')")
        batch.create_check_constraint("ck_speech_settings_stt_mode", "stt_mode IN ('automatic', 'azure', 'browser')")
