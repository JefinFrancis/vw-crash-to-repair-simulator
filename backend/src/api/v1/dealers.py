"""
Dealers API endpoints for VW crash simulation.

Provides comprehensive dealer management endpoints with Brazilian market features,
CNPJ validation, geographic operations, and VW dealer network integration.
"""

from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import List, Optional, Dict, Any
import structlog

from ..dependencies import DealerServiceDep
from ...schemas.dealer import DealerCreate, DealerUpdate, DealerResponse
from ...utils.exceptions import ValidationException, ServiceException

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.get("/", response_model=List[DealerResponse])
async def list_dealers(
    dealer_service: DealerServiceDep,
    skip: int = Query(0, ge=0, description="Number of dealers to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of dealers to return"),
    state: Optional[str] = Query(None, description="Filter by Brazilian state code (e.g., SP, RJ)"),
    city: Optional[str] = Query(None, description="Filter by city name"),
    service_type: Optional[str] = Query(None, description="Filter by service type capability"),
    cnpj: Optional[str] = Query(None, description="Filter by CNPJ")
) -> List[DealerResponse]:
    """
    List all VW dealers with optional filtering.
    
    Supports filtering by location (state, city), service capabilities, and CNPJ.
    Returns dealers with Brazilian market information and service capabilities.
    """
    try:
        logger.info("Listing dealers", skip=skip, limit=limit, state=state, city=city, service_type=service_type)
        dealers = await dealer_service.get_dealers(
            skip=skip,
            limit=limit,
            state=state,
            city=city,
            service_type=service_type,
            cnpj=cnpj
        )
        logger.info("Successfully retrieved dealers", count=len(dealers))
        return dealers
        
    except ValidationException as e:
        logger.warning("Dealer list validation error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Validation Error", "message": str(e)}
        )
    except ServiceException as e:
        logger.error("Dealer service error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Service Error", "message": str(e)}
        )
    except Exception as e:
        logger.error("Unexpected error listing dealers", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to retrieve dealers"}
        )


@router.get("/nearby")
async def find_nearby_dealers(
    dealer_service: DealerServiceDep,
    latitude: float = Query(..., description="Search center latitude"),
    longitude: float = Query(..., description="Search center longitude"),
    radius_km: float = Query(50, ge=1, le=500, description="Search radius in kilometers"),
    service_type: Optional[str] = Query(None, description="Required service type"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results")
) -> Dict[str, Any]:
    """
    Find nearby VW dealers using geographic coordinates.
    
    Finds dealers within specified radius using Brazilian geographic data.
    Returns dealers sorted by distance with travel estimates.
    """
    try:
        logger.info("Searching nearby dealers", lat=latitude, lon=longitude, radius=radius_km, service_type=service_type)
        search_result = await dealer_service.find_nearby_dealers(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            service_type=service_type,
            limit=limit
        )
        logger.info("Successfully found nearby dealers", count=len(search_result.get('dealers', [])))
        return search_result
        
    except ValidationException as e:
        logger.warning("Nearby dealer search validation error", error=str(e), lat=latitude, lon=longitude)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Validation Error", "message": str(e)}
        )
    except Exception as e:
        logger.error("Unexpected error searching nearby dealers", error=str(e), lat=latitude, lon=longitude, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to search nearby dealers"}
        )


@router.get("/{cnpj}/validate")
async def validate_dealer_cnpj(
    cnpj: str,
    dealer_service: DealerServiceDep
) -> Dict[str, Any]:
    """
    Validate Brazilian CNPJ for a dealer.
    
    Performs comprehensive CNPJ validation including check digit verification
    and format validation according to Brazilian standards.
    """
    try:
        logger.info("Validating dealer CNPJ", cnpj=cnpj)
        validation_result = await dealer_service.validate_dealer_cnpj(cnpj)
        logger.info("CNPJ validation completed", cnpj=cnpj, valid=validation_result.get('valid'))
        return validation_result
        
    except ValidationException as e:
        logger.warning("CNPJ validation error", cnpj=cnpj, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Validation Error", "message": str(e)}
        )
    except Exception as e:
        logger.error("Unexpected error validating CNPJ", cnpj=cnpj, error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to validate CNPJ"}
        )