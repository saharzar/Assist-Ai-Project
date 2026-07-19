"""add ATM identity verification analytics

Revision ID: 20260721_0014
Revises: 20260720_0013
"""
from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op
revision: str="20260721_0014"
down_revision: str|None="20260720_0013"
branch_labels: str|Sequence[str]|None=None
depends_on: str|Sequence[str]|None=None
def upgrade()->None:
    columns=[sa.Column("first_pin_was_correct",sa.Boolean()),sa.Column("identity_verification_attempt_count",sa.Integer(),server_default="0",nullable=False),sa.Column("incorrect_identity_verification_count",sa.Integer(),server_default="0",nullable=False),sa.Column("identity_verification_succeeded",sa.Boolean(),server_default=sa.false(),nullable=False),sa.Column("returned_to_pin_after_verification",sa.Boolean(),server_default=sa.false(),nullable=False),sa.Column("pin_return_count",sa.Integer(),server_default="0",nullable=False),sa.Column("security_terminated",sa.Boolean(),server_default=sa.false(),nullable=False),sa.Column("termination_reason",sa.String(64)),sa.Column("success_at",sa.DateTime(timezone=True)),sa.Column("terminated_at",sa.DateTime(timezone=True))]
    for column in columns:op.add_column("atm_scenario_sessions",column)
def downgrade()->None:
    for name in ("terminated_at","success_at","termination_reason","security_terminated","pin_return_count","returned_to_pin_after_verification","identity_verification_succeeded","incorrect_identity_verification_count","identity_verification_attempt_count","first_pin_was_correct"):op.drop_column("atm_scenario_sessions",name)
