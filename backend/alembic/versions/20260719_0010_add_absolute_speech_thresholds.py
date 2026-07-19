"""add absolute speech provider thresholds

Revision ID: 20260719_0010
Revises: 20260719_0009
Create Date: 2026-07-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260719_0010"
down_revision: str | None = "20260719_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "speech_provider_capability_configs",
        sa.Column("warning_threshold_value", sa.Integer(), nullable=True),
    )
    op.add_column(
        "speech_provider_capability_configs",
        sa.Column("switch_threshold_value", sa.Integer(), nullable=True),
    )
    op.execute(
        """
        UPDATE speech_provider_capability_configs
        SET warning_threshold_value = CASE
                WHEN quota_limit IS NULL THEN warning_threshold_percent
                ELSE GREATEST(1, FLOOR(quota_limit * warning_threshold_percent / 100.0)::integer)
            END,
            switch_threshold_value = CASE
                WHEN quota_limit IS NULL THEN switch_threshold_percent
                ELSE GREATEST(2, FLOOR(quota_limit * switch_threshold_percent / 100.0)::integer)
            END
        """
    )
    op.alter_column("speech_provider_capability_configs", "warning_threshold_value", nullable=False)
    op.alter_column("speech_provider_capability_configs", "switch_threshold_value", nullable=False)
    op.create_check_constraint(
        "ck_speech_capability_absolute_thresholds",
        "speech_provider_capability_configs",
        "warning_threshold_value > 0 AND warning_threshold_value < switch_threshold_value",
    )
    op.create_check_constraint(
        "ck_speech_capability_switch_within_quota",
        "speech_provider_capability_configs",
        "quota_limit IS NULL OR switch_threshold_value <= quota_limit",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_speech_capability_switch_within_quota",
        "speech_provider_capability_configs",
        type_="check",
    )
    op.drop_constraint(
        "ck_speech_capability_absolute_thresholds",
        "speech_provider_capability_configs",
        type_="check",
    )
    op.drop_column("speech_provider_capability_configs", "switch_threshold_value")
    op.drop_column("speech_provider_capability_configs", "warning_threshold_value")
