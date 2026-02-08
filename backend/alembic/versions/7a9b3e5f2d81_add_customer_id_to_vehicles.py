"""add customer_id to vehicles

Revision ID: 7a9b3e5f2d81
Revises: 6f8a2c3d4e91
Create Date: 2026-02-06 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7a9b3e5f2d81'
down_revision: Union[str, None] = '6f8a2c3d4e91'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add customer_id foreign key to vehicles table."""
    # Add customer_id column to vehicles table
    op.add_column(
        'vehicles',
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=True)
    )

    # Create foreign key constraint
    op.create_foreign_key(
        'fk_vehicles_customer_id',
        'vehicles',
        'customers',
        ['customer_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # Create index for better query performance
    op.create_index(
        op.f('ix_vehicles_customer_id'),
        'vehicles',
        ['customer_id'],
        unique=False
    )


def downgrade() -> None:
    """Remove customer_id from vehicles table."""
    op.drop_index(op.f('ix_vehicles_customer_id'), table_name='vehicles')
    op.drop_constraint('fk_vehicles_customer_id', 'vehicles', type_='foreignkey')
    op.drop_column('vehicles', 'customer_id')
