"""add customers table

Revision ID: 6f8a2c3d4e91
Revises: 500d63b16700
Create Date: 2026-02-06 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6f8a2c3d4e91'
down_revision: Union[str, None] = '500d63b16700'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add customers table."""
    op.create_table(
        'customers',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('phone', sa.String(length=13), nullable=False),
        sa.Column('preferred_dealer_cnpj', sa.String(length=14), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['preferred_dealer_cnpj'], ['dealers.cnpj'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('phone')
    )

    # Create indexes for better query performance
    op.create_index(op.f('ix_customers_name'), 'customers', ['name'], unique=False)
    op.create_index(op.f('ix_customers_phone'), 'customers', ['phone'], unique=True)
    op.create_index(op.f('ix_customers_preferred_dealer_cnpj'), 'customers', ['preferred_dealer_cnpj'], unique=False)


def downgrade() -> None:
    """Remove customers table."""
    op.drop_index(op.f('ix_customers_preferred_dealer_cnpj'), table_name='customers')
    op.drop_index(op.f('ix_customers_phone'), table_name='customers')
    op.drop_index(op.f('ix_customers_name'), table_name='customers')
    op.drop_table('customers')
