"""change customer dealer FK from CNPJ to UUID

Revision ID: 8b4c6d7e9f12
Revises: 7a9b3e5f2d81
Create Date: 2026-02-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8b4c6d7e9f12'
down_revision: Union[str, None] = '7a9b3e5f2d81'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Replace preferred_dealer_cnpj (String FK to dealers.cnpj) with preferred_dealer_id (UUID FK to dealers.id)."""
    # Drop old index and FK
    op.drop_index(op.f('ix_customers_preferred_dealer_cnpj'), table_name='customers')
    op.drop_constraint('customers_preferred_dealer_cnpj_fkey', 'customers', type_='foreignkey')
    op.drop_column('customers', 'preferred_dealer_cnpj')

    # Add new UUID column with FK to dealers.id
    op.add_column('customers', sa.Column('preferred_dealer_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'customers_preferred_dealer_id_fkey',
        'customers', 'dealers',
        ['preferred_dealer_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index(op.f('ix_customers_preferred_dealer_id'), 'customers', ['preferred_dealer_id'], unique=False)


def downgrade() -> None:
    """Revert to preferred_dealer_cnpj."""
    op.drop_index(op.f('ix_customers_preferred_dealer_id'), table_name='customers')
    op.drop_constraint('customers_preferred_dealer_id_fkey', 'customers', type_='foreignkey')
    op.drop_column('customers', 'preferred_dealer_id')

    op.add_column('customers', sa.Column('preferred_dealer_cnpj', sa.String(length=14), nullable=True))
    op.create_foreign_key(
        'customers_preferred_dealer_cnpj_fkey',
        'customers', 'dealers',
        ['preferred_dealer_cnpj'], ['cnpj'],
        ondelete='SET NULL'
    )
    op.create_index(op.f('ix_customers_preferred_dealer_cnpj'), 'customers', ['preferred_dealer_cnpj'], unique=False)
