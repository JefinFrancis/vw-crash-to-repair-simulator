"""
Vehicles API endpoints for VW crash simulation.

Provides comprehensive vehicle management endpoints with VW-specific business logic,
VIN validation, BeamNG integration, and Brazilian market features.
"""

from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import List, Optional, Dict, Any
import uuid
import structlog

from ..dependencies import VehicleServiceDep
from ...schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from ...utils.exceptions import ValidationException, ServiceException

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.get("/", response_model=List[VehicleResponse])
async def list_vehicles(
    vehicle_service: VehicleServiceDep,
    skip: int = Query(0, ge=0, description="Number of vehicles to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of vehicles to return"),
    model: Optional[str] = Query(None, description="Filter by vehicle model"),
    year: Optional[int] = Query(None, ge=1990, le=2030, description="Filter by vehicle year"),
    vin: Optional[str] = Query(None, description="Filter by VIN")
) -> List[VehicleResponse]:
    """
    List all vehicles with optional filtering.
    
    Supports filtering by model, year, and VIN with pagination.
    Includes VW-specific vehicle information and BeamNG model mapping.
    """
    try:
        logger.info("Listing vehicles", skip=skip, limit=limit, model=model, year=year, vin=vin)
        vehicles = await vehicle_service.get_vehicles(
            skip=skip, 
            limit=limit, 
            model=model, 
            year=year,
            vin=vin
        )
        logger.info("Successfully retrieved vehicles", count=len(vehicles))
        return vehicles
        
    except ValidationException as e:
        logger.warning("Vehicle list validation error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Validation Error", "message": str(e)}
        )
    except ServiceException as e:
        logger.error("Vehicle service error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Service Error", "message": str(e)}
        )
    except Exception as e:
        logger.error("Unexpected error listing vehicles", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to retrieve vehicles"}
        )


@router.post("/", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    vehicle_data: VehicleCreate,
    vehicle_service: VehicleServiceDep
) -> VehicleResponse:
    """
    Create a new vehicle with VW validation.
    
    Validates VIN format, checks VW manufacturer codes, and maps to BeamNG models.
    Includes Brazilian market vehicle information if applicable.
    """
    try:
        logger.info("Creating vehicle", model=vehicle_data.model, vin=vehicle_data.vin)
        vehicle = await vehicle_service.create_vehicle(vehicle_data.dict())
        logger.info("Successfully created vehicle", vehicle_id=vehicle.id, vin=vehicle.vin)
        return vehicle
        
    except ValidationException as e:
        logger.warning("Vehicle creation validation error", error=str(e), vin=vehicle_data.vin)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Validation Error", "message": str(e), "field": getattr(e, 'field', None)}
        )
    except ServiceException as e:
        logger.error("Vehicle creation service error", error=str(e), vin=vehicle_data.vin)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Service Error", "message": str(e)}
        )
    except Exception as e:
        logger.error("Unexpected error creating vehicle", error=str(e), vin=vehicle_data.vin, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: uuid.UUID,
    vehicle_service: VehicleServiceDep
) -> VehicleResponse:
    """
    Get a specific vehicle by ID.
    
    Returns detailed vehicle information including VW-specific data,
    BeamNG model mapping, and crash simulation readiness status.
    """
    try:
        logger.info("Getting vehicle by ID", vehicle_id=str(vehicle_id))
        vehicle = await vehicle_service.get_vehicle_by_id(vehicle_id)
        if not vehicle:
            logger.warning("Vehicle not found", vehicle_id=str(vehicle_id))
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not Found", "message": f"Vehicle with ID {vehicle_id} not found"}
            )
        logger.info("Successfully retrieved vehicle", vehicle_id=str(vehicle_id), vin=vehicle.get('vin'))
        return vehicle
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error getting vehicle", vehicle_id=str(vehicle_id), error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to retrieve vehicle"}
        )


@router.get("/vin/{vin}", response_model=VehicleResponse)
async def get_vehicle_by_vin(
    vin: str,
    vehicle_service: VehicleServiceDep
) -> VehicleResponse:
    """
    Get a vehicle by VIN with validation.
    
    Validates VIN format and returns vehicle information with VW-specific details.
    """
    try:
        logger.info("Getting vehicle by VIN", vin=vin)
        vehicle = await vehicle_service.get_vehicle_by_vin(vin)
        if not vehicle:
            logger.warning("Vehicle not found by VIN", vin=vin)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not Found", "message": f"Vehicle with VIN {vin} not found"}
            )
        logger.info("Successfully retrieved vehicle by VIN", vin=vin)
        return vehicle
        
    except HTTPException:
        raise
    except ValidationException as e:
        logger.warning("VIN validation error", vin=vin, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Validation Error", "message": str(e), "field": "vin"}
        )
    except Exception as e:
        logger.error("Unexpected error getting vehicle by VIN", vin=vin, error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to retrieve vehicle"}
        )


@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: uuid.UUID,
    vehicle_data: VehicleUpdate,
    vehicle_service: VehicleServiceDep
) -> VehicleResponse:
    """
    Update a vehicle with validation.
    
    Updates vehicle information with VW-specific validation and BeamNG model remapping if needed.
    """
    try:
        logger.info("Updating vehicle", vehicle_id=str(vehicle_id))
        vehicle = await vehicle_service.update_vehicle(vehicle_id, vehicle_data.dict(exclude_unset=True))
        if not vehicle:
            logger.warning("Vehicle not found for update", vehicle_id=str(vehicle_id))
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not Found", "message": f"Vehicle with ID {vehicle_id} not found"}
            )
        logger.info("Successfully updated vehicle", vehicle_id=str(vehicle_id))
        return vehicle
        
    except HTTPException:
        raise
    except ValidationException as e:
        logger.warning("Vehicle update validation error", vehicle_id=str(vehicle_id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Validation Error", "message": str(e), "field": getattr(e, 'field', None)}
        )
    except ServiceException as e:
        logger.error("Vehicle update service error", vehicle_id=str(vehicle_id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Service Error", "message": str(e)}
        )
    except Exception as e:
        logger.error("Unexpected error updating vehicle", vehicle_id=str(vehicle_id), error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to update vehicle"}
        )


@router.delete("/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: uuid.UUID,
    vehicle_service: VehicleServiceDep
) -> Dict[str, Any]:
    """
    Delete a vehicle by ID.
    
    Removes vehicle from the system after validation.
    """
    try:
        logger.info("Deleting vehicle", vehicle_id=str(vehicle_id))
        success = await vehicle_service.delete_vehicle(vehicle_id)
        if not success:
            logger.warning("Vehicle not found for deletion", vehicle_id=str(vehicle_id))
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not Found", "message": f"Vehicle with ID {vehicle_id} not found"}
            )
        logger.info("Successfully deleted vehicle", vehicle_id=str(vehicle_id))
        return {
            "message": "Vehicle deleted successfully",
            "vehicle_id": str(vehicle_id),
            "deleted": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error deleting vehicle", vehicle_id=str(vehicle_id), error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to delete vehicle"}
        )


@router.post("/{vehicle_id}/validate-vin", response_model=Dict[str, Any])
async def validate_vehicle_vin(
    vehicle_id: uuid.UUID,
    vehicle_service: VehicleServiceDep
) -> Dict[str, Any]:
    """
    Validate VIN for an existing vehicle.
    
    Performs comprehensive VIN validation including VW manufacturer code checking,
    format validation, and compatibility verification.
    """
    try:
        logger.info("Validating vehicle VIN", vehicle_id=str(vehicle_id))
        validation_result = await vehicle_service.validate_vehicle_vin(vehicle_id)
        logger.info("VIN validation completed", vehicle_id=str(vehicle_id), valid=validation_result.get('valid'))
        return validation_result
        
    except ValidationException as e:
        logger.warning("VIN validation error", vehicle_id=str(vehicle_id), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Validation Error", "message": str(e)}
        )
    except Exception as e:
        logger.error("Unexpected error validating VIN", vehicle_id=str(vehicle_id), error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to validate VIN"}
        )


@router.get("/{vehicle_id}/beamng-status", response_model=Dict[str, Any])
async def get_vehicle_beamng_status(
    vehicle_id: uuid.UUID,
    vehicle_service: VehicleServiceDep
) -> Dict[str, Any]:
    """
    Get BeamNG crash simulation status for a vehicle.
    
    Returns current simulation readiness, model mapping, and configuration status.
    """
    try:
        logger.info("Getting BeamNG status for vehicle", vehicle_id=str(vehicle_id))
        status_result = await vehicle_service.get_beamng_simulation_status(vehicle_id)
        logger.info("Successfully retrieved BeamNG status", vehicle_id=str(vehicle_id))
        return status_result
        
    except Exception as e:
        logger.error("Unexpected error getting BeamNG status", vehicle_id=str(vehicle_id), error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to get BeamNG status"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update vehicle: {str(e)}"
        )


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(
    vehicle_id: uuid.UUID,
    vehicle_service: VehicleServiceDep
):
    """Delete a vehicle."""
    try:
        success = await vehicle_service.delete_vehicle(vehicle_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found"
            )
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete vehicle: {str(e)}"
        )


@router.get("/{vehicle_id}/beamng-config")
async def get_vehicle_beamng_config(
    vehicle_id: uuid.UUID,
    vehicle_service: VehicleServiceDep
):
    """Get BeamNG configuration for a specific vehicle."""
    try:
        config = await vehicle_service.get_beamng_config(vehicle_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle or BeamNG configuration not found"
            )
        return {"vehicle_id": vehicle_id, "beamng_config": config}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve BeamNG configuration: {str(e)}"
        )