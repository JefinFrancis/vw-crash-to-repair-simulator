"""Customer repository for database operations.

This module provides the data access layer for customer entities,
handling all database queries and operations.
"""

from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.customer import Customer
from ..schemas.customer import CustomerCreate, CustomerUpdate
from .base import BaseRepository


class CustomerRepository(BaseRepository[Customer, CustomerCreate, CustomerUpdate]):
    """Repository for customer database operations.

    Provides CRUD operations and custom queries for customers.
    Inherits base operations from BaseRepository.
    """

    def __init__(self, db: AsyncSession):
        """Initialize customer repository.

        Args:
            db: Async database session
        """
        super().__init__(Customer, db)

    async def get_by_unique_field(self, field_name: str, field_value: str) -> Optional[Customer]:
        """Get customer by unique field (phone).

        Args:
            field_name: Field name to search ('phone')
            field_value: Field value to search for

        Returns:
            Customer if found, None otherwise
        """
        if field_name == "phone":
            return await self.get_by_phone(field_value)
        return None

    async def get_by_phone(self, phone: str) -> Optional[Customer]:
        """Get customer by phone number.

        Args:
            phone: Customer's phone number

        Returns:
            Customer if found, None otherwise
        """
        stmt = (
            select(Customer)
            .where(Customer.phone == phone)
            .options(selectinload(Customer.preferred_dealer))
        )
        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none()

    async def search_by_name(
        self,
        name: str,
        skip: int = 0,
        limit: int = 100
    ) -> list[Customer]:
        """Search customers by name (case-insensitive partial match).

        Args:
            name: Name search term
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return

        Returns:
            List of matching customers
        """
        stmt = (
            select(Customer)
            .where(Customer.name.ilike(f"%{name}%"))
            .options(selectinload(Customer.preferred_dealer))
            .offset(skip)
            .limit(limit)
            .order_by(Customer.name)
        )
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def get_with_preferred_dealer(self, customer_id: str) -> Optional[Customer]:
        """Get customer with their preferred dealer eagerly loaded.

        Args:
            customer_id: Customer UUID

        Returns:
            Customer with preferred_dealer relationship loaded, or None
        """
        stmt = (
            select(Customer)
            .where(Customer.id == customer_id)
            .options(selectinload(Customer.preferred_dealer))
        )
        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_customers_by_dealer(
        self,
        dealer_id: str,
        skip: int = 0,
        limit: int = 100
    ) -> list[Customer]:
        """Get all customers who prefer a specific dealer.

        Args:
            dealer_id: Dealer's UUID
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of customers preferring the dealer
        """
        stmt = (
            select(Customer)
            .where(Customer.preferred_dealer_id == dealer_id)
            .options(selectinload(Customer.preferred_dealer))
            .offset(skip)
            .limit(limit)
            .order_by(Customer.name)
        )
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def phone_exists(self, phone: str, exclude_id: Optional[str] = None) -> bool:
        """Check if phone number already exists.

        Useful for validation before creating/updating customers.

        Args:
            phone: Phone number to check
            exclude_id: Customer ID to exclude from check (for updates)

        Returns:
            True if phone exists, False otherwise
        """
        stmt = select(Customer).where(Customer.phone == phone)

        if exclude_id:
            stmt = stmt.where(Customer.id != exclude_id)

        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none() is not None
