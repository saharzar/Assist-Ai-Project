"""add Soniox TTS routing

Revision ID: 20260719_0009
Revises: 20260718_0008
Create Date: 2026-07-19
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260719_0009"
down_revision: str | None = "20260718_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Preserve the existing Azure/Browser order while opening priority 2 for Soniox.
    op.execute(
        """
        WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY priority) AS position
            FROM speech_provider_capability_configs
            WHERE service_type = 'tts'
        )
        UPDATE speech_provider_capability_configs AS capability
        SET priority = 100 + ranked.position
        FROM ranked
        WHERE capability.id = ranked.id
        """
    )
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                ROW_NUMBER() OVER (ORDER BY priority) AS position,
                COUNT(*) OVER () AS provider_count
            FROM speech_provider_capability_configs
            WHERE service_type = 'tts'
        )
        UPDATE speech_provider_capability_configs AS capability
        SET priority = CASE
            WHEN ranked.provider_count = 2 AND ranked.position = 2 THEN 3
            ELSE ranked.position
        END
        FROM ranked
        WHERE capability.id = ranked.id
        """
    )


def downgrade() -> None:
    op.execute(
        "DELETE FROM speech_provider_capability_configs WHERE provider_key = 'soniox' AND service_type = 'tts'"
    )
    op.execute(
        """
        WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY priority) AS position
            FROM speech_provider_capability_configs
            WHERE service_type = 'tts'
        )
        UPDATE speech_provider_capability_configs AS capability
        SET priority = 100 + ranked.position
        FROM ranked
        WHERE capability.id = ranked.id
        """
    )
    op.execute(
        """
        WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY priority) AS position
            FROM speech_provider_capability_configs
            WHERE service_type = 'tts'
        )
        UPDATE speech_provider_capability_configs AS capability
        SET priority = ranked.position
        FROM ranked
        WHERE capability.id = ranked.id
        """
    )
