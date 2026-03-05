"""Customer API endpoints.

This module defines the REST API endpoints for customer management operations.
"""

import structlog
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ...schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
)
from ...services.customer import CustomerService
from ...utils.exceptions import ValidationException, NotFoundException
from ..dependencies import get_customer_service

logger = structlog.get_logger(__name__)

router = APIRouter()

# Type alias for cleaner dependency injection
CustomerServiceDep = Annotated[CustomerService, Depends(get_customer_service)]


@router.post(
    "",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new customer",
    description="Create a new customer with name, phone, and optional preferred dealer"
)
async def create_customer(
    customer_data: CustomerCreate,
    customer_service: CustomerServiceDep
) -> CustomerResponse:
    """Create a new customer.

    Args:
        customer_data: Customer creation data
        customer_service: Customer service dependency

    Returns:
        Created customer response

    Raises:
        HTTPException: 400 if phone already exists or dealer not found
        HTTPException: 500 for unexpected errors
    """
    try:
        logger.info("API: Creating customer", phone=customer_data.phone)
        customer = await customer_service.create_customer(customer_data)
        logger.info("API: Customer created successfully", customer_id=str(customer.id))
        return customer

    except ValidationException as e:
        logger.warning("API: Validation error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": e.message,
                "field": e.field,
                "value": e.value
            }
        )

    except Exception as e:
        logger.error("API: Unexpected error creating customer", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Erro ao criar cliente", "error": str(e)}
        )


@router.get(
    "",
    response_model=list[CustomerResponse],
    summary="List all customers",
    description="Get a paginated list of customers with optional name filtering"
)
async def list_customers(
    customer_service: CustomerServiceDep,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    name: Optional[str] = Query(None, description="Filter by customer name (partial match)")
) -> list[CustomerResponse]:
    """List all customers with pagination and filtering.

    Args:
        customer_service: Customer service dependency
        skip: Number of records to skip
        limit: Maximum number of records to return
        name: Optional name filter for search

    Returns:
        List of customer responses

    Raises:
        HTTPException: 500 for unexpected errors
    """
    try:
        logger.info("API: Listing customers", skip=skip, limit=limit, name_filter=name)
        customers = await customer_service.list_customers(
            skip=skip,
            limit=limit,
            name_filter=name
        )
        logger.info("API: Customers fetched successfully", count=len(customers))
        return customers

    except Exception as e:
        logger.error("API: Unexpected error listing customers", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Erro ao listar clientes", "error": str(e)}
        )


@router.get(
    "/{customer_id}",
    response_model=CustomerResponse,
    summary="Get customer by ID",
    description="Get a specific customer by their UUID"
)
async def get_customer(
    customer_id: str,
    customer_service: CustomerServiceDep
) -> CustomerResponse:
    """Get customer by ID.

    Args:
        customer_id: Customer UUID
        customer_service: Customer service dependency

    Returns:
        Customer response

    Raises:
        HTTPException: 404 if customer not found
        HTTPException: 500 for unexpected errors
    """
    try:
        logger.info("API: Fetching customer", customer_id=customer_id)
        customer = await customer_service.get_customer(customer_id)
        logger.info("API: Customer fetched successfully", customer_id=customer_id)
        return customer

    except NotFoundException as e:
        logger.warning("API: Customer not found", customer_id=customer_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": str(e)}
        )

    except Exception as e:
        logger.error("API: Unexpected error fetching customer", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Erro ao buscar cliente", "error": str(e)}
        )


@router.get(
    "/phone/{phone}",
    response_model=Optional[CustomerResponse],
    summary="Get customer by phone",
    description="Get a customer by their phone number"
)
async def get_customer_by_phone(
    phone: str,
    customer_service: CustomerServiceDep
) -> Optional[CustomerResponse]:
    """Get customer by phone number.

    Args:
        phone: Customer phone number (format: 5511999999999)
        customer_service: Customer service dependency

    Returns:
        Customer response if found, None otherwise

    Raises:
        HTTPException: 500 for unexpected errors
    """
    try:
        logger.info("API: Fetching customer by phone", phone=phone)
        customer = await customer_service.get_customer_by_phone(phone)
        if customer:
            logger.info("API: Customer found", phone=phone)
        else:
            logger.info("API: Customer not found", phone=phone)
        return customer

    except Exception as e:
        logger.error("API: Unexpected error fetching customer", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Erro ao buscar cliente", "error": str(e)}
        )


@router.put(
    "/{customer_id}",
    response_model=CustomerResponse,
    summary="Update customer",
    description="Update customer information"
)
async def update_customer(
    customer_id: str,
    customer_data: CustomerUpdate,
    customer_service: CustomerServiceDep
) -> CustomerResponse:
    """Update customer.

    Args:
        customer_id: Customer UUID
        customer_data: Customer update data
        customer_service: Customer service dependency

    Returns:
        Updated customer response

    Raises:
        HTTPException: 404 if customer not found
        HTTPException: 400 if validation fails
        HTTPException: 500 for unexpected errors
    """
    try:
        logger.info("API: Updating customer", customer_id=customer_id)
        customer = await customer_service.update_customer(customer_id, customer_data)
        logger.info("API: Customer updated successfully", customer_id=customer_id)
        return customer

    except NotFoundException as e:
        logger.warning("API: Customer not found", customer_id=customer_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": str(e)}
        )

    except ValidationException as e:
        logger.warning("API: Validation error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": e.message,
                "field": e.field,
                "value": e.value
            }
        )

    except Exception as e:
        logger.error("API: Unexpected error updating customer", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Erro ao atualizar cliente", "error": str(e)}
        )


@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete customer",
    description="Delete a customer by ID"
)
async def delete_customer(
    customer_id: str,
    customer_service: CustomerServiceDep
) -> None:
    """Delete customer.

    Args:
        customer_id: Customer UUID
        customer_service: Customer service dependency

    Raises:
        HTTPException: 404 if customer not found
        HTTPException: 500 for unexpected errors
    """
    try:
        logger.info("API: Deleting customer", customer_id=customer_id)
        await customer_service.delete_customer(customer_id)
        logger.info("API: Customer deleted successfully", customer_id=customer_id)

    except NotFoundException as e:
        logger.warning("API: Customer not found", customer_id=customer_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": str(e)}
        )

    except Exception as e:
        logger.error("API: Unexpected error deleting customer", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Erro ao deletar cliente", "error": str(e)}
        )


@router.get(
    "/dealer/{dealer_id}",
    response_model=list[CustomerResponse],
    summary="Get customers by dealer",
    description="Get all customers who prefer a specific dealer"
)
async def get_customers_by_dealer(
    dealer_id: str,
    customer_service: CustomerServiceDep,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
) -> list[CustomerResponse]:
    """Get all customers who prefer a specific dealer.

    Args:
        dealer_id: Dealer's UUID
        customer_service: Customer service dependency
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        List of customer responses

    Raises:
        HTTPException: 404 if dealer not found
        HTTPException: 500 for unexpected errors
    """
    try:
        logger.info("API: Fetching customers by dealer", dealer_id=dealer_id)
        customers = await customer_service.get_customers_by_dealer(
            dealer_id=dealer_id,
            skip=skip,
            limit=limit
        )
        logger.info("API: Customers fetched successfully", count=len(customers))
        return customers

    except NotFoundException as e:
        logger.warning("API: Dealer not found", dealer_id=dealer_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": str(e)}
        )

    except Exception as e:
        logger.error("API: Unexpected error fetching customers", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Erro ao buscar clientes", "error": str(e)}
        )
