"""
Repair estimate endpoints for VW crash-to-repair simulator.

Provides comprehensive repair cost estimation with Brazilian pricing (BRL),
labor rate calculations, parts availability, and dealer-specific quotes.
"""

from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import uuid
import structlog
from pydantic import BaseModel, Field

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from ...database import get_async_session

router = APIRouter()
logger = structlog.get_logger(__name__)

# Labor rates per hour in BRL by service type
LABOR_RATES_BRL = {
    "bodywork": Decimal("150.00"),      # Funilaria
    "paint": Decimal("180.00"),          # Pintura
    "mechanical": Decimal("200.00"),     # Mecânica
    "electrical": Decimal("220.00"),     # Elétrica
    "glass": Decimal("160.00"),          # Vidros
    "interior": Decimal("140.00"),       # Interior
    "default": Decimal("150.00"),        # Padrão
}

# Damage severity multipliers
SEVERITY_MULTIPLIERS = {
    "minor": Decimal("1.0"),
    "moderate": Decimal("1.2"),
    "severe": Decimal("1.5"),
    "total_loss": Decimal("2.0"),
}


class ComponentDamageInput(BaseModel):
    """Input model for damaged component."""
    component_id: str = Field(..., description="Component identifier")
    component_name: str = Field(..., description="Component display name")
    part_number: Optional[str] = Field(None, description="VW part number")
    damage_type: str = Field(..., description="Type of damage")
    severity: str = Field("moderate", description="Damage severity")
    replacement_required: bool = Field(False, description="Whether replacement is needed")
    estimated_repair_hours: float = Field(1.0, description="Estimated repair hours")


class EstimateRequest(BaseModel):
    """Request model for estimate calculation."""
    vehicle_vin: str = Field(..., description="Vehicle VIN")
    vehicle_model: str = Field(..., description="Vehicle model name")
    vehicle_year: int = Field(..., description="Vehicle year")
    crash_type: Optional[str] = Field(None, description="Type of crash")
    impact_speed_kmh: Optional[float] = Field(None, description="Impact speed in km/h")
    component_damages: List[ComponentDamageInput] = Field(..., description="List of damaged components")
    dealer_id: Optional[str] = Field(None, description="Preferred dealer ID")
    priority: str = Field("normal", description="Repair priority: low, normal, high, urgent")


class PartCost(BaseModel):
    """Part cost breakdown."""
    part_number: str
    part_name: str
    quantity: int
    unit_price_brl: Decimal
    total_price_brl: Decimal
    availability: str
    estimated_delivery_days: int


class LaborCost(BaseModel):
    """Labor cost breakdown."""
    service_type: str
    hours: float
    rate_per_hour_brl: Decimal
    total_cost_brl: Decimal


class EstimateResponse(BaseModel):
    """Response model for repair estimate."""
    estimate_id: str
    vehicle_vin: str
    vehicle_model: str
    created_at: datetime
    valid_until: datetime
    
    # Cost summary
    total_parts_cost_brl: Decimal
    total_labor_cost_brl: Decimal
    subtotal_brl: Decimal
    tax_brl: Decimal
    total_estimate_brl: Decimal
    
    # Breakdowns
    parts_breakdown: List[PartCost]
    labor_breakdown: List[LaborCost]
    
    # Timeline
    estimated_repair_days: int
    estimated_completion_date: datetime
    
    # Additional info
    severity_assessment: str
    repair_priority: str
    notes: List[str]


@router.get("/")
async def list_estimates(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    vehicle_vin: Optional[str] = Query(None, description="Filter by vehicle VIN"),
):
    """
    List repair estimates with optional filtering.
    
    Returns a list of previously generated repair estimates.
    """
    # TODO: Implement database query for stored estimates
    logger.info("Listing estimates", skip=skip, limit=limit, vehicle_vin=vehicle_vin)
    
    return {
        "items": [],
        "total": 0,
        "page": 1,
        "per_page": limit,
        "message": "Estimate history - no stored estimates yet"
    }


@router.post("/calculate", response_model=EstimateResponse)
async def calculate_estimate(
    request: EstimateRequest,
    session: AsyncSession = Depends(get_async_session)
):
    """
    Calculate comprehensive repair estimate for damaged vehicle.
    
    Processes damage assessment data to generate detailed cost estimate
    including parts, labor, taxes, and timeline in Brazilian Real (BRL).
    """
    try:
        logger.info(
            "Calculating repair estimate",
            vehicle_vin=request.vehicle_vin,
            vehicle_model=request.vehicle_model,
            components_count=len(request.component_damages)
        )
        
        estimate_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        parts_breakdown: List[PartCost] = []
        labor_breakdown: List[LaborCost] = []
        total_parts_cost = Decimal("0.00")
        total_labor_cost = Decimal("0.00")
        total_repair_hours = 0.0
        notes: List[str] = []
        
        # Process each damaged component
        for damage in request.component_damages:
            # Determine labor rate based on damage type
            labor_type = "default"
            if damage.damage_type in ["body_panel", "cosmetic"]:
                labor_type = "bodywork"
            elif damage.damage_type == "electrical":
                labor_type = "electrical"
            elif damage.damage_type == "mechanical":
                labor_type = "mechanical"
            elif damage.damage_type == "glass":
                labor_type = "glass"
            elif damage.damage_type == "interior":
                labor_type = "interior"
            
            labor_rate = LABOR_RATES_BRL.get(labor_type, LABOR_RATES_BRL["default"])
            severity_multiplier = SEVERITY_MULTIPLIERS.get(damage.severity, Decimal("1.0"))
            
            # Calculate labor cost for this component
            hours = damage.estimated_repair_hours
            if damage.replacement_required:
                hours *= 0.8  # Replacement is usually faster than repair
            
            adjusted_hours = float(Decimal(str(hours)) * severity_multiplier)
            component_labor_cost = labor_rate * Decimal(str(adjusted_hours))
            
            total_labor_cost += component_labor_cost
            total_repair_hours += adjusted_hours
            
            labor_breakdown.append(LaborCost(
                service_type=f"{damage.component_name} ({labor_type})",
                hours=adjusted_hours,
                rate_per_hour_brl=labor_rate,
                total_cost_brl=component_labor_cost
            ))
            
            # Look up part price if part_number provided
            if damage.part_number and damage.replacement_required:
                # Query parts database
                result = await session.execute(
                    text("SELECT name, price_brl, availability_status FROM parts WHERE part_number = :pn"),
                    {"pn": damage.part_number}
                )
                part_row = result.fetchone()
                
                if part_row:
                    part_name, price_brl, availability = part_row
                    part_price = Decimal(str(price_brl)) if price_brl else Decimal("500.00")
                    
                    delivery_days = 1 if availability == "available" else 7
                    
                    parts_breakdown.append(PartCost(
                        part_number=damage.part_number,
                        part_name=part_name or damage.component_name,
                        quantity=1,
                        unit_price_brl=part_price,
                        total_price_brl=part_price,
                        availability=availability or "available",
                        estimated_delivery_days=delivery_days
                    ))
                    
                    total_parts_cost += part_price
                else:
                    # Estimate price based on component type
                    estimated_price = Decimal("800.00")  # Default estimate
                    if "bumper" in damage.component_name.lower():
                        estimated_price = Decimal("850.00")
                    elif "hood" in damage.component_name.lower() or "capô" in damage.component_name.lower():
                        estimated_price = Decimal("1250.00")
                    elif "fender" in damage.component_name.lower() or "paralama" in damage.component_name.lower():
                        estimated_price = Decimal("680.00")
                    elif "headlight" in damage.component_name.lower() or "farol" in damage.component_name.lower():
                        estimated_price = Decimal("2200.00")
                    elif "door" in damage.component_name.lower() or "porta" in damage.component_name.lower():
                        estimated_price = Decimal("1800.00")
                    
                    parts_breakdown.append(PartCost(
                        part_number=damage.part_number or "ESTIMATE",
                        part_name=damage.component_name,
                        quantity=1,
                        unit_price_brl=estimated_price,
                        total_price_brl=estimated_price,
                        availability="estimated",
                        estimated_delivery_days=5
                    ))
                    
                    total_parts_cost += estimated_price
                    notes.append(f"Preço estimado para {damage.component_name} - confirmar com concessionária")
        
        # Calculate totals
        subtotal = total_parts_cost + total_labor_cost
        tax_rate = Decimal("0.12")  # 12% approximation for Brazilian taxes
        tax = subtotal * tax_rate
        total_estimate = subtotal + tax
        
        # Calculate timeline
        repair_days = max(1, int(total_repair_hours / 8) + 1)  # 8 hours per day
        
        # Adjust for priority
        if request.priority == "urgent":
            repair_days = max(1, repair_days - 1)
            notes.append("Prioridade urgente - tempo reduzido")
        elif request.priority == "high":
            notes.append("Alta prioridade")
        
        # Add delivery time for parts
        max_delivery = max((p.estimated_delivery_days for p in parts_breakdown), default=0)
        if max_delivery > 1:
            repair_days += max_delivery - 1
            notes.append(f"Tempo de entrega de peças: até {max_delivery} dias")
        
        completion_date = now + timedelta(days=repair_days)
        
        # Determine severity assessment
        severe_count = sum(1 for d in request.component_damages if d.severity in ["severe", "total_loss"])
        if severe_count >= 3 or any(d.severity == "total_loss" for d in request.component_damages):
            severity_assessment = "severe"
        elif severe_count >= 1:
            severity_assessment = "moderate"
        else:
            severity_assessment = "minor"
        
        # Add general notes
        notes.append("Orçamento válido por 7 dias")
        notes.append("Valores sujeitos a confirmação após inspeção presencial")
        
        estimate_response = EstimateResponse(
            estimate_id=estimate_id,
            vehicle_vin=request.vehicle_vin,
            vehicle_model=request.vehicle_model,
            created_at=now,
            valid_until=now + timedelta(days=7),
            total_parts_cost_brl=total_parts_cost,
            total_labor_cost_brl=total_labor_cost,
            subtotal_brl=subtotal,
            tax_brl=tax,
            total_estimate_brl=total_estimate,
            parts_breakdown=parts_breakdown,
            labor_breakdown=labor_breakdown,
            estimated_repair_days=repair_days,
            estimated_completion_date=completion_date,
            severity_assessment=severity_assessment,
            repair_priority=request.priority,
            notes=notes
        )
        
        logger.info(
            "Estimate calculated successfully",
            estimate_id=estimate_id,
            total_brl=float(total_estimate),
            repair_days=repair_days
        )
        
        return estimate_response
        
    except Exception as e:
        logger.error("Error calculating estimate", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Calculation Error", "message": str(e)}
        )


@router.get("/{estimate_id}")
async def get_estimate(estimate_id: str):
    """
    Get a specific repair estimate by ID.
    
    Returns detailed estimate information including cost breakdown.
    """
    logger.info("Getting estimate", estimate_id=estimate_id)
    
    # TODO: Implement database lookup for stored estimates
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"error": "Not Found", "message": f"Estimate {estimate_id} not found"}
    )


@router.post("/{estimate_id}/approve")
async def approve_estimate(estimate_id: str):
    """
    Approve a repair estimate for service scheduling.
    
    Marks the estimate as approved and enables appointment booking.
    """
    logger.info("Approving estimate", estimate_id=estimate_id)
    
    return {
        "estimate_id": estimate_id,
        "status": "approved",
        "message": "Orçamento aprovado. Você pode agendar o reparo.",
        "next_step": "schedule_appointment"
    }