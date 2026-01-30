"""
Dependency injection setup for API endpoints.

Provides database sessions and service instances for FastAPI dependency injection,
ensuring proper resource management and service layer integration.
"""

from typing import AsyncGenerator, Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_async_session
from ..services import ServiceContainer, VehicleService, DealerService, PartService, DamageReportService, AppointmentService


# Database session dependency
async def get_db_session():
    """
    Dependency to provide database session for API endpoints.
    
    Yields:
        AsyncSession: Database session for repository operations
    """
    async for session in get_async_session():
        yield session


# Service dependencies using dependency injection
async def get_service_container(
    db_session: Annotated[AsyncSession, Depends(get_db_session)]
) -> ServiceContainer:
    """
    Dependency to provide service container for API endpoints.
    
    Args:
        db_session: Database session from dependency injection
        
    Returns:
        ServiceContainer: Container with all business logic services
    """
    return ServiceContainer(db_session)


async def get_vehicle_service(
    db_session: Annotated[AsyncSession, Depends(get_db_session)]
) -> VehicleService:
    """
    Dependency to provide VehicleService for API endpoints.
    
    Args:
        db_session: Database session from dependency injection
        
    Returns:
        VehicleService: Vehicle business logic service
    """
    return VehicleService(db_session)


async def get_dealer_service(
    db_session: Annotated[AsyncSession, Depends(get_db_session)]
) -> DealerService:
    """
    Dependency to provide DealerService for API endpoints.
    
    Args:
        db_session: Database session from dependency injection
        
    Returns:
        DealerService: Dealer business logic service
    """
    return DealerService(db_session)


async def get_part_service(
    db_session: Annotated[AsyncSession, Depends(get_db_session)]
) -> PartService:
    """
    Dependency to provide PartService for API endpoints.
    
    Args:
        db_session: Database session from dependency injection
        
    Returns:
        PartService: Parts business logic service
    """
    return PartService(db_session)


async def get_damage_report_service(
    db_session: Annotated[AsyncSession, Depends(get_db_session)]
) -> DamageReportService:
    """
    Dependency to provide DamageReportService for API endpoints.
    
    Args:
        db_session: Database session from dependency injection
        
    Returns:
        DamageReportService: Damage report business logic service
    """
    return DamageReportService(db_session)


async def get_appointment_service(
    db_session: Annotated[AsyncSession, Depends(get_db_session)]
) -> AppointmentService:
    """
    Dependency to provide AppointmentService for API endpoints.
    
    Args:
        db_session: Database session from dependency injection
        
    Returns:
        AppointmentService: Appointment business logic service
    """
    return AppointmentService(db_session)


# Type aliases for cleaner endpoint signatures
DBSession = Annotated[AsyncSession, Depends(get_db_session)]
ServiceContainerDep = Annotated[ServiceContainer, Depends(get_service_container)]
VehicleServiceDep = Annotated[VehicleService, Depends(get_vehicle_service)]
DealerServiceDep = Annotated[DealerService, Depends(get_dealer_service)]
PartServiceDep = Annotated[PartService, Depends(get_part_service)]
DamageReportServiceDep = Annotated[DamageReportService, Depends(get_damage_report_service)]
AppointmentServiceDep = Annotated[AppointmentService, Depends(get_appointment_service)]