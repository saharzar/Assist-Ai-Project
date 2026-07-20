"""backfill user speech quotas

Revision ID: 20260720_0013
Revises: 20260720_0012
"""
from collections.abc import Sequence
from alembic import op
revision: str="20260720_0013"
down_revision: str|None="20260720_0012"
branch_labels: str|Sequence[str]|None=None
depends_on: str|Sequence[str]|None=None
def upgrade()->None:
    op.execute("""INSERT INTO user_tts_usage (user_id,tts_limit_characters,tts_used_characters,tts_reset_date,extra_characters,period_type,period_start,enabled,uses_default,created_at,updated_at) SELECT u.id,d.tts_limit_characters,0,CURRENT_DATE+7,0,d.period_type,CURRENT_DATE,TRUE,TRUE,NOW(),NOW() FROM users u CROSS JOIN user_quota_defaults d WHERE u.role<>'admin' AND NOT EXISTS (SELECT 1 FROM user_tts_usage x WHERE x.user_id=u.id)""")
    op.execute("""INSERT INTO user_stt_usage (user_id,stt_limit_seconds,stt_used_seconds,stt_reset_date,extra_seconds,period_type,period_start,enabled,uses_default,created_at,updated_at) SELECT u.id,d.stt_limit_seconds,0,CURRENT_DATE+7,0,d.period_type,CURRENT_DATE,TRUE,TRUE,NOW(),NOW() FROM users u CROSS JOIN user_quota_defaults d WHERE u.role<>'admin' AND NOT EXISTS (SELECT 1 FROM user_stt_usage x WHERE x.user_id=u.id)""")
def downgrade()->None:
    pass
