"""
Parts API endpoints for VW parts catalog.

Provides comprehensive parts management endpoints with VW parts validation,
Brazilian pricing in BRL, repair cost estimation, and parts availability management.
"""

from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import List, Optional, Dict, Any
import uuid
import structlog

from ..dependencies import PartServiceDep
from ...schemas.part import PartCreate, PartUpdate, PartResponse
from ...utils.exceptions import ValidationException, ServiceException

router = APIRouter()
logger = structlog.get_logger(__name__)



@router.get("/", response_model=List[PartResponse])
async def list_parts(
    part_service: PartServiceDep,
    skip: int = Query(0, ge=0, description="Number of parts to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of parts to return"),
    category: Optional[str] = Query(None, description="Filter by part category"),
    part_number: Optional[str] = Query(None, description="Filter by VW part number"),
    availability_status: Optional[str] = Query(None, description="Filter by availability status")
) -> List[PartResponse]:
    """
    List all VW parts with optional filtering.
    
    Supports filtering by category, part number, and availability status.
    Returns parts with Brazilian pricing in BRL and availability information.
    """
    try:
        logger.info("Listing parts", skip=skip, limit=limit, category=category, part_number=part_number)
        parts = await part_service.get_parts(
            skip=skip, 
            limit=limit, 
            category=category,
            part_number=part_number,
            availability_status=availability_status
        )
        logger.info("Successfully retrieved parts", count=len(parts))
        return parts
        
    except ValidationException as e:
        logger.warning("Part list validation error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Validation Error", "message": str(e)}
        )
    except ServiceException as e:
        logger.error("Part service error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Service Error", "message": str(e)}
        )
    except Exception as e:
        logger.error("Unexpected error listing parts", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to retrieve parts"}
        )


@router.post("/validate-part-number", response_model=Dict[str, Any])
async def validate_part_number(
    part_number_data: Dict[str, str],
    part_service: PartServiceDep
) -> Dict[str, Any]:
    """
    Validate VW part number format and extract information.
    
    Performs comprehensive VW part number validation including format checking,
    category determination, and compatibility verification.
    """
    try:
        part_number = part_number_data.get("part_number", "")
        logger.info("Validating VW part number", part_number=part_number)
        
        validation_result = await part_service.validate_vw_part_number(part_number)
        logger.info("Part number validation completed", part_number=part_number, valid=validation_result.get('valid'))
        return validation_result
        
    except ValidationException as e:
        logger.warning("Part number validation error", part_number=part_number, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Validation Error", "message": str(e)}
        )
    except Exception as e:
        logger.error("Unexpected error validating part number", part_number=part_number, error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to validate part number"}
        )


@router.post("/repair-cost-estimate", response_model=Dict[str, Any])
async def calculate_repair_cost_estimate(
    damage_data: Dict[str, Any],
    part_service: PartServiceDep
) -> Dict[str, Any]:
    """
    Calculate comprehensive repair cost estimate in BRL.
    
    Calculates detailed repair cost breakdown including parts, labor, taxes (ICMS),
    and additional costs in Brazilian Reais with proper formatting.
    """
    try:
        damaged_parts = damage_data.get("damaged_parts", [])
        labor_hours = damage_data.get("labor_hours")
        
        logger.info("Calculating repair cost estimate", parts_count=len(damaged_parts), labor_hours=labor_hours)
        
        cost_estimate = await part_service.calculate_repair_cost_estimate(
            damaged_parts=damaged_parts,
            labor_hours=labor_hours
        )
        
        total_cost = cost_estimate.get('total_cost', 0)
        logger.info("Successfully calculated repair cost estimate", total_cost=float(total_cost))
        return cost_estimate
        
    except ValidationException as e:
        logger.warning("Repair cost validation error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Validation Error", "message": str(e)}
        )
    except ServiceException as e:
        logger.error("Repair cost service error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Service Error", "message": str(e)}
        )
    except Exception as e:
        logger.error("Unexpected error calculating repair cost", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to calculate repair cost"}
        )


@router.get("/categories", response_model=List[Dict[str, Any]])
async def get_part_categories(
    part_service: PartServiceDep
) -> List[Dict[str, Any]]:
    """
    Get all available VW part categories.
    
    Returns list of part categories with descriptions and typical parts count.
    """
    try:
        logger.info("Getting part categories")
        categories = [
            {"code": "01", "name": "Engine", "description": "Engine components and related parts"},
            {"code": "02", "name": "Fuel System", "description": "Fuel injection, tank, and delivery components"},
            {"code": "03", "name": "Cooling", "description": "Radiator, coolant, and thermal management"},
            {"code": "04", "name": "Exhaust", "description": "Exhaust system and emission components"},
            {"code": "05", "name": "Clutch", "description": "Clutch assembly and transmission interface"},
            {"code": "06", "name": "Transmission", "description": "Gearbox and transmission components"},
            {"code": "07", "name": "Driveshaft", "description": "Drive shafts and related components"},
            {"code": "08", "name": "Suspension", "description": "Suspension system and shock absorbers"},
            {"code": "09", "name": "Steering", "description": "Steering wheel, column, and power steering"},
            {"code": "10", "name": "Brakes", "description": "Brake system, pads, and hydraulic components"},
            {"code": "11", "name": "Wheels & Tires", "description": "Wheels, tires, and related hardware"},
            {"code": "12", "name": "Body", "description": "Body panels, doors, and structural components"},
            {"code": "13", "name": "Interior", "description": "Seats, dashboard, and interior components"},
            {"code": "14", "name": "Electrical", "description": "Wiring, ECU, and electrical systems"},
            {"code": "15", "name": "Lighting", "description": "Headlights, taillights, and interior lighting"},
            {"code": "16", "name": "Air Conditioning", "description": "HVAC system and climate control"}
        ]
        logger.info("Successfully retrieved part categories", count=len(categories))
        return categories
        
    except Exception as e:
        logger.error("Unexpected error getting part categories", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to retrieve part categories"}
        )


@router.get("/{part_id}", response_model=PartResponse)
async def get_part(
    part_id: uuid.UUID,
    part_service: PartServiceDep
) -> PartResponse:
    """Get a specific part by ID."""
    try:
        part = await part_service.get_part_by_id(part_id)
        if not part:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Part not found"
            )
        return part
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve part: {str(e)}"
        )


@router.get("/by-number/{part_number}", response_model=PartResponse)
async def get_part_by_number(
    part_number: str,
    part_service: PartServiceDep
) -> PartResponse:
    """Get a specific part by part number."""
    try:
        part = await part_service.get_part_by_number(part_number)
        if not part:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Part not found"
            )
        return part
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve part: {str(e)}"
        )


@router.put("/{part_id}", response_model=PartResponse)
async def update_part(
    part_id: uuid.UUID,
    part_data: PartUpdate,
    part_service: PartServiceDep
) -> PartResponse:
    """Update a part."""
    try:
        part = await part_service.update_part(part_id, part_data)
        if not part:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Part not found"
            )
        return part
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update part: {str(e)}"
        )


@router.delete("/{part_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_part(
    part_id: uuid.UUID,
    part_service: PartServiceDep
):
    """Delete a part."""
    try:
        success = await part_service.delete_part(part_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Part not found"
            )
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete part: {str(e)}"
        )


@router.get("/search/compatible/{vehicle_model}")
async def search_compatible_parts(
    part_service: PartServiceDep,
    vehicle_model: str,
    year: Optional[int] = None,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """Search for parts compatible with a specific vehicle model."""
    try:
        parts = await part_service.get_compatible_parts(
            vehicle_model=vehicle_model,
            year=year,
            category=category,
            skip=skip,
            limit=limit
        )
        return {"vehicle_model": vehicle_model, "year": year, "parts": parts}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search compatible parts: {str(e)}"
        )


@router.post("/bulk-price-update")
async def bulk_update_prices(
    price_updates: dict[str, float],  # part_number -> new_price_brl
    part_service: PartServiceDep
):
    """Bulk update part prices."""
    try:
        updated_count = await part_service.bulk_update_prices(price_updates)
        return {
            "message": f"Successfully updated {updated_count} part prices",
            "updated_count": updated_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update part prices: {str(e)}"
        )