"""add account approval fields

Revision ID: 20260630_0002
Revises: 20260629_0001
Create Date: 2026-06-30 00:02:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260630_0002"
down_revision: str | None = "20260629_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("role", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("approval_status", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("approved_by", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("denied_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("rejection_reason", sa.Text(), nullable=True))

    op.execute("UPDATE users SET role = 'user' WHERE role IS NULL")
    op.execute(
        "UPDATE users SET approval_status = CASE WHEN is_active THEN 'approved' ELSE 'pending' END "
        "WHERE approval_status IS NULL"
    )

    op.alter_column("users", "role", nullable=False)
    op.alter_column("users", "approval_status", nullable=False)


def downgrade() -> None:
    op.drop_column("users", "rejection_reason")
    op.drop_column("users", "denied_at")
    op.drop_column("users", "approved_at")
    op.drop_column("users", "approved_by")
    op.drop_column("users", "approval_status")
    op.drop_column("users", "role")
