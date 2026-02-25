"""Customer service for business logic.

This module provides the business logic layer for customer operations,
handling validation, error handling, and coordination between API and repository layers.
"""

import structlog
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from ..repositories.customer import CustomerRepository
from ..repositories.dealer import DealerRepository
from ..schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from ..utils.exceptions import ValidationException, NotFoundException
from .base import BaseService

logger = structlog.get_logger(__name__)


class CustomerService(BaseService):
    """Service for customer business logic.

    Handles validation, error handling, and business rules for customer operations.
    """

    def __init__(self, db_session: AsyncSession):
        """Initialize customer service.

        Args:
            db_session: Async database session
        """
        super().__init__(db_session)
        self.customer_repo = CustomerRepository(db_session)
        self.dealer_repo = DealerRepository(db_session)

    async def create_customer(self, customer_data: CustomerCreate) -> CustomerResponse:
        """Create a new customer.

        Args:
            customer_data: Customer creation data

        Returns:
            Created customer response

        Raises:
            ValidationException: If phone already exists or dealer not found
        """
        logger.info("Creating new customer", phone=customer_data.phone)

        # Check if phone already exists
        existing = await self.customer_repo.get_by_phone(customer_data.phone)
        if existing:
            logger.warning("Phone number already exists", phone=customer_data.phone)
            raise ValidationException(
                message="Número de telefone já cadastrado",
                field="phone",
                value=customer_data.phone
            )

        # Validate preferred dealer if provided
        if customer_data.preferred_dealer_id:
            dealer = await self.dealer_repo.get_by_id(customer_data.preferred_dealer_id)
            if not dealer:
                logger.warning(
                    "Preferred dealer not found",
                    dealer_id=str(customer_data.preferred_dealer_id)
                )
                raise ValidationException(
                    message="Concessionária preferida não encontrada",
                    field="preferred_dealer_id",
                    value=str(customer_data.preferred_dealer_id)
                )

        # Create customer
        customer = await self.customer_repo.create(customer_data)
        await self.db_session.commit()
        logger.info("Customer created successfully", customer_id=str(customer.id))

        return CustomerResponse.model_validate(customer)

    async def get_customer(self, customer_id: str) -> CustomerResponse:
        """Get customer by ID.

        Args:
            customer_id: Customer UUID

        Returns:
            Customer response

        Raises:
            NotFoundException: If customer not found
        """
        logger.info("Fetching customer", customer_id=customer_id)

        customer = await self.customer_repo.get_with_preferred_dealer(customer_id)
        if not customer:
            logger.warning("Customer not found", customer_id=customer_id)
            raise NotFoundException(
                resource="Customer",
                resource_id=customer_id
            )

        return CustomerResponse.model_validate(customer)

    async def get_customer_by_phone(self, phone: str) -> Optional[CustomerResponse]:
        """Get customer by phone number.

        Args:
            phone: Customer phone number

        Returns:
            Customer response if found, None otherwise
        """
        logger.info("Fetching customer by phone", phone=phone)

        customer = await self.customer_repo.get_by_phone(phone)
        if not customer:
            logger.info("Customer not found", phone=phone)
            return None

        return CustomerResponse.model_validate(customer)

    async def list_customers(
        self,
        skip: int = 0,
        limit: int = 100,
        name_filter: Optional[str] = None
    ) -> list[CustomerResponse]:
        """List customers with optional filtering.

        Args:
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return
            name_filter: Optional name search filter

        Returns:
            List of customer responses
        """
        logger.info(
            "Listing customers",
            skip=skip,
            limit=limit,
            name_filter=name_filter
        )

        if name_filter:
            customers = await self.customer_repo.search_by_name(
                name=name_filter,
                skip=skip,
                limit=limit
            )
        else:
            customers = await self.customer_repo.get_multi(
                skip=skip,
                limit=limit
            )

        logger.info("Customers fetched", count=len(customers))
        return [CustomerResponse.model_validate(c) for c in customers]

    async def update_customer(
        self,
        customer_id: str,
        customer_data: CustomerUpdate
    ) -> CustomerResponse:
        """Update customer.

        Args:
            customer_id: Customer UUID
            customer_data: Customer update data

        Returns:
            Updated customer response

        Raises:
            NotFoundException: If customer not found
            ValidationException: If phone already exists or dealer not found
        """
        logger.info("Updating customer", customer_id=customer_id)

        # Check if customer exists
        customer = await self.customer_repo.get_by_id(customer_id)
        if not customer:
            logger.warning("Customer not found", customer_id=customer_id)
            raise NotFoundException(
                resource="Customer",
                resource_id=customer_id
            )

        # Validate phone uniqueness if being updated
        if customer_data.phone and customer_data.phone != customer.phone:
            phone_exists = await self.customer_repo.phone_exists(
                customer_data.phone,
                exclude_id=customer_id
            )
            if phone_exists:
                logger.warning(
                    "Phone number already exists",
                    phone=customer_data.phone
                )
                raise ValidationException(
                    message="Número de telefone já cadastrado",
                    field="phone",
                    value=customer_data.phone
                )

        # Validate preferred dealer if being updated
        if customer_data.preferred_dealer_id:
            dealer = await self.dealer_repo.get_by_id(customer_data.preferred_dealer_id)
            if not dealer:
                logger.warning(
                    "Preferred dealer not found",
                    dealer_id=str(customer_data.preferred_dealer_id)
                )
                raise ValidationException(
                    message="Concessionária preferida não encontrada",
                    field="preferred_dealer_id",
                    value=str(customer_data.preferred_dealer_id)
                )

        # Update customer
        updated_customer = await self.customer_repo.update(customer_id, customer_data)
        await self.db_session.commit()
        logger.info("Customer updated successfully", customer_id=customer_id)

        return CustomerResponse.model_validate(updated_customer)

    async def delete_customer(self, customer_id: str) -> None:
        """Delete customer.

        Args:
            customer_id: Customer UUID

        Raises:
            NotFoundException: If customer not found
        """
        logger.info("Deleting customer", customer_id=customer_id)

        customer = await self.customer_repo.get_by_id(customer_id)
        if not customer:
            logger.warning("Customer not found", customer_id=customer_id)
            raise NotFoundException(
                resource="Customer",
                resource_id=customer_id
            )

        await self.customer_repo.delete(customer_id)
        await self.db_session.commit()
        logger.info("Customer deleted successfully", customer_id=customer_id)

    async def get_customers_by_dealer(
        self,
        dealer_id: str,
        skip: int = 0,
        limit: int = 100
    ) -> list[CustomerResponse]:
        """Get all customers who prefer a specific dealer.

        Args:
            dealer_id: Dealer's UUID
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of customer responses

        Raises:
            NotFoundException: If dealer not found
        """
        logger.info("Fetching customers by dealer", dealer_id=dealer_id)

        # Validate dealer exists
        dealer = await self.dealer_repo.get_by_id(dealer_id)
        if not dealer:
            logger.warning("Dealer not found", dealer_id=dealer_id)
            raise NotFoundException(
                resource="Dealer",
                resource_id=dealer_id
            )

        customers = await self.customer_repo.get_customers_by_dealer(
            dealer_id=dealer_id,
            skip=skip,
            limit=limit
        )

        logger.info("Customers fetched", count=len(customers))
        return [CustomerResponse.model_validate(c) for c in customers]
