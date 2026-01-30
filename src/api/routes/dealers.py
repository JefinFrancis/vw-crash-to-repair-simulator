# VW Crash-to-Repair Simulator API
# Dealers Routes

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
import logging
import json
from pathlib import Path
from datetime import datetime

from ...models import Dealer, DealerSearchResponse

logger = logging.getLogger(__name__)
router = APIRouter()

def load_dealers_data() -> Dict[str, Any]:
    """Load VW dealers data from JSON file"""
    dealers_file = Path(__file__).parent.parent.parent.parent / "data" / "dealers" / "vw_brazil_dealers.json"
    
    try:
        with open(dealers_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load dealers data: {e}")
        return {"dealers": {}, "inventory": {}}

@router.get("/search")
async def search_dealers(
    city: Optional[str] = Query(None, description="Filter by city"),
    state: Optional[str] = Query(None, description="Filter by state (SP, RJ, etc.)"),
    service_type: Optional[str] = Query(None, description="Required service (bodyshop, collision_repair, etc.)"),
    max_distance_km: Optional[float] = Query(50.0, description="Maximum distance in kilometers"),
    parts_needed: Optional[str] = Query(None, description="Comma-separated list of part numbers")
) -> DealerSearchResponse:
    """
    Search for VW dealers based on criteria.
    Returns dealers that can perform the required services and have parts availability.
    """
    
    try:
        dealers_data = load_dealers_data()
        all_dealers = dealers_data.get("dealers", {})
        inventory_data = dealers_data.get("inventory", {})
        
        # Convert to Dealer objects and filter
        filtered_dealers = []
        
        for dealer_id, dealer_info in all_dealers.items():
            # Basic filtering
            if city and dealer_info["location"]["city"].lower() != city.lower():
                continue
                
            if state and dealer_info["location"]["state"] != state.upper():
                continue
                
            if service_type and service_type not in dealer_info["services"]:
                continue
            
            # Check parts availability if requested
            parts_availability = {}
            if parts_needed:
                part_list = [p.strip() for p in parts_needed.split(",")]
                dealer_inventory = inventory_data.get(dealer_id, {}).get("stock_items", [])
                
                for part_number in part_list:
                    available = any(
                        item["part_number"] == part_number and item["quantity_available"] > 0
                        for item in dealer_inventory
                    )
                    parts_availability[part_number] = available
            
            # Convert to Dealer object (simplified for demo)
            dealer = _create_dealer_object(dealer_id, dealer_info, parts_availability)
            filtered_dealers.append(dealer)
        
        # Sort by availability and capacity
        filtered_dealers.sort(key=lambda d: (
            -d.capacity.max_concurrent_jobs + d.capacity.current_workload,  # Available capacity
            len([s for s in d.specializations if "collision" in s or "bodyshop" in s])  # Relevant specializations
        ))
        
        search_criteria = {
            "city": city,
            "state": state,
            "service_type": service_type,
            "max_distance_km": max_distance_km,
            "parts_needed": parts_needed.split(",") if parts_needed else []
        }
        
        logger.info(f"Found {len(filtered_dealers)} dealers matching criteria")
        
        return DealerSearchResponse(
            success=True,
            message=f"Found {len(filtered_dealers)} dealers",
            dealers=filtered_dealers,
            search_criteria=search_criteria
        )
        
    except Exception as e:
        logger.error(f"Error searching dealers: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Dealer search error: {str(e)}"
        )

@router.get("/{dealer_id}")
async def get_dealer_details(dealer_id: str) -> Dict[str, Any]:
    """Get detailed information about a specific dealer"""
    
    try:
        dealers_data = load_dealers_data()
        dealer_info = dealers_data.get("dealers", {}).get(dealer_id)
        
        if not dealer_info:
            raise HTTPException(
                status_code=404,
                detail=f"Dealer not found: {dealer_id}"
            )
        
        # Get inventory information
        inventory_info = dealers_data.get("inventory", {}).get(dealer_id, {})
        
        # Combine dealer and inventory data
        detailed_info = {
            **dealer_info,
            "inventory_summary": {
                "total_parts": len(inventory_info.get("stock_items", [])),
                "last_updated": inventory_info.get("last_updated"),
                "available_parts": [
                    item for item in inventory_info.get("stock_items", [])
                    if item["quantity_available"] > 0
                ]
            }
        }
        
        return {
            "success": True,
            "dealer": detailed_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting dealer details: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving dealer: {str(e)}"
        )

@router.get("/{dealer_id}/inventory")
async def get_dealer_inventory(dealer_id: str) -> Dict[str, Any]:
    """Get current inventory for a specific dealer"""
    
    try:
        dealers_data = load_dealers_data()
        inventory_info = dealers_data.get("inventory", {}).get(dealer_id)
        
        if not inventory_info:
            raise HTTPException(
                status_code=404,
                detail=f"Inventory not found for dealer: {dealer_id}"
            )
        
        # Calculate inventory statistics
        stock_items = inventory_info.get("stock_items", [])
        total_parts = len(stock_items)
        available_parts = len([item for item in stock_items if item["quantity_available"] > 0])
        total_value = sum(item["quantity_on_hand"] for item in stock_items)
        
        return {
            "success": True,
            "dealer_id": dealer_id,
            "inventory": inventory_info,
            "summary": {
                "total_part_types": total_parts,
                "available_part_types": available_parts,
                "total_units_in_stock": total_value,
                "last_updated": inventory_info.get("last_updated")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting dealer inventory: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Inventory retrieval error: {str(e)}"
        )

@router.post("/{dealer_id}/check_availability")
async def check_parts_availability(
    dealer_id: str,
    part_numbers: List[str]
) -> Dict[str, Any]:
    """Check availability of specific parts at a dealer"""
    
    try:
        dealers_data = load_dealers_data()
        inventory_info = dealers_data.get("inventory", {}).get(dealer_id)
        
        if not inventory_info:
            raise HTTPException(
                status_code=404,
                detail=f"Dealer inventory not found: {dealer_id}"
            )
        
        stock_items = inventory_info.get("stock_items", [])
        availability = {}
        
        for part_number in part_numbers:
            part_stock = next(
                (item for item in stock_items if item["part_number"] == part_number),
                None
            )
            
            if part_stock:
                availability[part_number] = {
                    "available": part_stock["quantity_available"] > 0,
                    "quantity_available": part_stock["quantity_available"],
                    "quantity_on_hand": part_stock["quantity_on_hand"],
                    "last_restocked": part_stock["last_restocked"]
                }
            else:
                availability[part_number] = {
                    "available": False,
                    "quantity_available": 0,
                    "quantity_on_hand": 0,
                    "last_restocked": None
                }
        
        # Check if all parts are available
        all_available = all(info["available"] for info in availability.values())
        
        return {
            "success": True,
            "dealer_id": dealer_id,
            "all_parts_available": all_available,
            "parts_availability": availability,
            "recommendations": _generate_availability_recommendations(availability)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking parts availability: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Availability check error: {str(e)}"
        )

def _create_dealer_object(dealer_id: str, dealer_info: Dict[str, Any], parts_availability: Dict[str, bool] = None) -> Dealer:
    """Convert dealer JSON data to Dealer object"""
    
    # This is a simplified conversion for demo purposes
    # In production, would use proper data mapping
    
    from ...models import DealerLocation, ContactInfo, ServiceCapacity
    
    location = DealerLocation(**dealer_info["location"])
    contact = ContactInfo(**dealer_info["contact"])
    capacity = ServiceCapacity(**dealer_info["capacity"])
    
    dealer = Dealer(
        dealer_id=dealer_id,
        name=dealer_info["name"],
        brand=dealer_info["brand"],
        dealer_type=dealer_info["dealer_type"],
        location=location,
        contact=contact,
        services=dealer_info["services"],
        specializations=dealer_info["specializations"],
        capacity=capacity
    )
    
    # Add parts availability as extra data
    if parts_availability:
        dealer.__dict__["parts_availability"] = parts_availability
    
    return dealer

def _generate_availability_recommendations(availability: Dict[str, Any]) -> List[str]:
    """Generate recommendations based on parts availability"""
    
    recommendations = []
    unavailable_parts = [part for part, info in availability.items() if not info["available"]]
    
    if not unavailable_parts:
        recommendations.append("All required parts are available at this dealer")
    else:
        recommendations.append(f"{len(unavailable_parts)} parts need to be ordered or transferred")
        
        # Suggest checking other dealers
        if len(unavailable_parts) > 2:
            recommendations.append("Consider searching other dealers for better parts availability")
        
        # Suggest lead time considerations
        recommendations.append("Contact dealer for estimated lead times on unavailable parts")
    
    return recommendations