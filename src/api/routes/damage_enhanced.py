# VW Crash-to-Repair Simulator API
# Enhanced Damage Analysis Routes with Modern Service Layer

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
import logging
from datetime import datetime
from pydantic import BaseModel

from ...services import VWBeamNGService
from ...models import DamageReport, BeamNGTelemetry, APIResponse, DamageAnalysisResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# Enhanced Request/Response models for modern API
class VWDamageExtractionRequest(BaseModel):
    """Enhanced request to extract damage data from VW vehicle simulation"""
    vehicle_model: str = "tcross"  # tcross, golf, etc.
    scenario_type: str = "crash_test"
    force_extraction: bool = False
    include_cost_analysis: bool = True
    include_vw_parts_mapping: bool = True

class VWCrashSimulationRequest(BaseModel):
    """Request to execute crash simulation"""
    vehicle_model: str = "tcross"
    crash_type: str = "frontal"  # frontal, side, rear
    impact_speed: int = 50  # km/h
    scenario_name: Optional[str] = None

class VWDamageAnalysisResponse(BaseModel):
    """Enhanced damage analysis response with VW-specific data"""
    success: bool
    message: str
    session_id: Optional[str]
    vehicle_model: str
    damage_report: Optional[Dict[str, Any]]
    vw_parts_required: Optional[list] = []
    estimated_cost_brl: Optional[float] = 0.0
    repair_complexity: Optional[str] = "medium"
    processing_time_ms: int = 0
    next_steps: list = []

class TriggerVWRepairRequest(BaseModel):
    """Enhanced request to trigger VW repair workflow"""
    session_id: Optional[str] = None
    vehicle_model: str = "tcross"
    customer_info: Optional[Dict[str, str]] = None
    preferred_dealer_region: Optional[str] = "sao_paulo"
    
def get_vw_beamng_service():
    """Dependency to get modern VW BeamNG service"""
    from fastapi import Request
    def _get_service(request: Request) -> VWBeamNGService:
        return request.app.state.vw_beamng_service
    return _get_service

@router.post("/health")
async def beamng_health_check(
    service: VWBeamNGService = Depends(get_vw_beamng_service())
) -> Dict[str, Any]:
    """Check BeamNG connection health with enhanced diagnostics"""
    try:
        health_status = await service.health_check()
        
        return {
            "success": True,
            "beamng_status": health_status,
            "service_type": "modern_vw_service",
            "capabilities": [
                "async_operations",
                "vw_specific_analysis", 
                "enhanced_telemetry",
                "brazilian_parts_pricing",
                "dealer_integration_ready"
            ]
        }
        
    except Exception as e:
        logger.error(f"BeamNG health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@router.post("/connect")
async def connect_to_beamng(
    service: VWBeamNGService = Depends(get_vw_beamng_service())
) -> Dict[str, Any]:
    """Connect to BeamNG.tech with enhanced connection management"""
    try:
        logger.info("Attempting to connect to BeamNG.tech with modern service...")
        
        connected = await service.connect()
        
        if connected:
            return {
                "success": True,
                "message": "Successfully connected to BeamNG.tech",
                "service_type": "modern_vw_service",
                "connection_details": {
                    "host": service.host,
                    "port": service.port,
                    "async_enabled": True
                },
                "next_steps": [
                    "Load VW vehicle scenario using /api/damage/load_scenario",
                    "Execute crash simulation using /api/damage/simulate_crash",
                    "Extract damage data using /api/damage/extract"
                ]
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to connect to BeamNG.tech. Check if BeamNG is running on port 25252."
            )
            
    except Exception as e:
        logger.error(f"Connection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")

@router.post("/load_scenario")
async def load_vw_scenario(
    request: VWCrashSimulationRequest,
    service: VWBeamNGService = Depends(get_vw_beamng_service())
) -> Dict[str, Any]:
    """Load VW vehicle scenario with enhanced validation"""
    try:
        if not service.connected:
            raise HTTPException(
                status_code=400,
                detail="Not connected to BeamNG.tech. Use /api/damage/connect first."
            )
        
        logger.info(f"Loading VW {request.vehicle_model} scenario...")
        
        scenario_loaded = await service.load_vw_scenario(
            vehicle_model=request.vehicle_model,
            scenario_type=request.scenario_name or "crash_test"
        )
        
        if scenario_loaded:
            return {
                "success": True,
                "message": f"VW {request.vehicle_model} scenario loaded successfully",
                "scenario_details": {
                    "vehicle_model": request.vehicle_model,
                    "scenario_type": request.scenario_name or "crash_test",
                    "session_id": service.current_session.session_id if service.current_session else None
                },
                "next_steps": [
                    "Drive and crash the vehicle in BeamNG.tech",
                    "Or use /api/damage/simulate_crash for automated crash",
                    "Then extract damage with /api/damage/extract"
                ]
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to load VW {request.vehicle_model} scenario"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Scenario loading failed: {e}")
        raise HTTPException(status_code=500, detail=f"Scenario loading error: {str(e)}")

@router.post("/simulate_crash")
async def execute_crash_simulation(
    request: VWCrashSimulationRequest,
    service: VWBeamNGService = Depends(get_vw_beamng_service())
) -> Dict[str, Any]:
    """Execute automated crash simulation with VW-specific parameters"""
    try:
        if not service.current_session:
            raise HTTPException(
                status_code=400,
                detail="No active session. Load a VW scenario first using /api/damage/load_scenario"
            )
        
        logger.info(f"Executing {request.crash_type} crash simulation at {request.impact_speed} km/h...")
        
        crash_params = {
            "type": request.crash_type,
            "speed": request.impact_speed,
            "vehicle_model": request.vehicle_model
        }
        
        simulation_result = await service.execute_crash_simulation(crash_params)
        
        return {
            "success": True,
            "message": "Crash simulation completed successfully",
            "simulation_result": simulation_result,
            "next_steps": [
                "Extract damage telemetry using /api/damage/extract",
                "Get repair estimate using /api/estimates/generate"
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Crash simulation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")

@router.post("/extract")
async def extract_vw_damage_telemetry(
    request: VWDamageExtractionRequest,
    service: VWBeamNGService = Depends(get_vw_beamng_service())
) -> VWDamageAnalysisResponse:
    """
    Extract damage telemetry with VW-specific analysis and Brazilian pricing.
    This is the enhanced version of the 'Repair My Car' button functionality.
    """
    try:
        start_time = datetime.now()
        
        if not service.connected:
            raise HTTPException(
                status_code=400,
                detail="Not connected to BeamNG.tech. Use /api/damage/connect first."
            )
        
        if not service.current_session:
            raise HTTPException(
                status_code=400,
                detail="No active session. Load a VW scenario first using /api/damage/load_scenario"
            )
        
        logger.info(f"Extracting VW damage telemetry for {request.vehicle_model}...")
        
        # Extract telemetry with modern async service
        telemetry = await service.extract_damage_telemetry()
        
        if not telemetry and not request.force_extraction:
            raise HTTPException(
                status_code=404,
                detail="No damage telemetry available. Execute a crash simulation first, or use force_extraction=true for testing."
            )
        
        # Generate VW-specific damage report
        if telemetry:
            damage_report = await service.generate_vw_damage_report(telemetry)
        else:
            # Create mock data for testing
            damage_report = await _create_mock_vw_damage_report(request.vehicle_model, service)
        
        # Calculate processing time
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        # Prepare enhanced response
        response_data = VWDamageAnalysisResponse(
            success=True,
            message=f"VW damage analysis completed for {request.vehicle_model}",
            session_id=service.current_session.session_id if service.current_session else "mock_session",
            vehicle_model=request.vehicle_model,
            damage_report=_format_damage_report_for_api(damage_report),
            vw_parts_required=damage_report.vw_parts_required if hasattr(damage_report, 'vw_parts_required') else [],
            estimated_cost_brl=damage_report.estimated_cost if hasattr(damage_report, 'estimated_cost') else 2500.0,
            repair_complexity=damage_report.repair_complexity if hasattr(damage_report, 'repair_complexity') else "medium",
            processing_time_ms=processing_time,
            next_steps=[
                "Review damage assessment and cost estimate",
                "Generate formal repair estimate using /api/estimates/generate", 
                "Find VW dealers using /api/dealers/search",
                "Schedule appointment using /api/appointments/create"
            ]
        )
        
        logger.info(f"VW damage analysis completed - Cost: R$ {response_data.estimated_cost_brl:,.2f}")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"VW damage extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Damage extraction error: {str(e)}")

@router.post("/repair_workflow")
async def trigger_vw_repair_workflow(
    request: TriggerVWRepairRequest,
    service: VWBeamNGService = Depends(get_vw_beamng_service())
) -> Dict[str, Any]:
    """
    Trigger complete VW repair workflow with Brazilian dealer integration.
    This integrates damage analysis, cost estimation, and dealer scheduling.
    """
    try:
        if not service.current_session and not request.session_id:
            raise HTTPException(
                status_code=400,
                detail="No active session. Extract damage data first using /api/damage/extract"
            )
        
        logger.info(f"Triggering VW repair workflow for {request.vehicle_model}...")
        
        workflow_result = {
            "workflow_id": f"vw_repair_{int(datetime.now().timestamp())}",
            "vehicle_model": request.vehicle_model,
            "session_id": request.session_id or service.current_session.session_id,
            "status": "initiated",
            "steps_completed": [],
            "next_actions": []
        }
        
        # Step 1: Damage Analysis (if not already done)
        if service.current_session and service.current_session.crash_detected:
            workflow_result["steps_completed"].append("damage_analysis")
        else:
            workflow_result["next_actions"].append({
                "step": "damage_analysis",
                "description": "Extract damage telemetry first",
                "endpoint": "/api/damage/extract"
            })
        
        # Step 2: VW Parts Mapping
        workflow_result["steps_completed"].append("vw_parts_mapping")
        
        # Step 3: Brazilian Pricing
        workflow_result["steps_completed"].append("brazilian_pricing")
        
        # Step 4: Dealer Integration
        workflow_result["next_actions"].append({
            "step": "dealer_search", 
            "description": f"Find VW dealers in {request.preferred_dealer_region}",
            "endpoint": "/api/dealers/search",
            "params": {"region": request.preferred_dealer_region}
        })
        
        # Step 5: Appointment Scheduling
        workflow_result["next_actions"].append({
            "step": "appointment_booking",
            "description": "Schedule repair appointment",
            "endpoint": "/api/appointments/create"
        })
        
        return {
            "success": True,
            "message": "VW repair workflow initiated successfully",
            "workflow": workflow_result,
            "customer_info": request.customer_info,
            "estimated_timeline": "Complete within 24-48 hours for quote and appointment"
        }
        
    except Exception as e:
        logger.error(f"VW repair workflow failed: {e}")
        raise HTTPException(status_code=500, detail=f"Workflow error: {str(e)}")

# Helper functions
async def _create_mock_vw_damage_report(vehicle_model: str, service: VWBeamNGService) -> DamageReport:
    """Create mock damage report for testing purposes"""
    mock_telemetry = BeamNGTelemetry(
        session_id="mock_session_" + str(int(datetime.now().timestamp())),
        timestamp=datetime.now(),
        vehicle_position=(0, 0, 0),
        vehicle_velocity=0,
        damage_data={
            "front_bumper": 0.7,
            "hood": 0.5,
            "headlight_left": 0.3,
            "windshield": 0.2
        },
        raw_data={}
    )
    
    return await service.generate_vw_damage_report(mock_telemetry)

def _format_damage_report_for_api(damage_report: DamageReport) -> Dict[str, Any]:
    """Format damage report for API response"""
    return {
        "session_id": damage_report.session_id,
        "vehicle_model": damage_report.vehicle_model,
        "timestamp": damage_report.timestamp.isoformat(),
        "impact_zones": damage_report.impact_zones,
        "component_damages": [
            {
                "component": comp.component_id,
                "damage_level": comp.damage_level,
                "damage_type": comp.damage_type.value if hasattr(comp.damage_type, 'value') else str(comp.damage_type),
                "vw_part_number": getattr(comp, 'vw_part_number', 'VW-UNKNOWN'),
                "repair_category": getattr(comp, 'repair_category', 'miscellaneous')
            }
            for comp in damage_report.component_damages
        ],
        "estimated_cost": damage_report.estimated_cost,
        "repair_complexity": damage_report.repair_complexity,
        "processing_metadata": getattr(damage_report, 'processing_metadata', {})
    }