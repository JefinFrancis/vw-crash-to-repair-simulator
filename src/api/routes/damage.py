# VW Crash-to-Repair Simulator API
# Damage Analysis Routes

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
import logging
from datetime import datetime
from pydantic import BaseModel

from ...beamng import BeamNGSimulator, DamageExtractor
from ...models import DamageReport, BeamNGTelemetry, APIResponse, DamageAnalysisResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# Request/Response models for API
class DamageExtractionRequest(BaseModel):
    """Request to extract damage data from current BeamNG session"""
    vehicle_model_id: str = "vw_tcross_2024"
    force_extraction: bool = False  # Extract even if no crash detected

class TriggerRepairRequest(BaseModel):
    """Request to trigger repair workflow - simulates 'Repair My Car' button"""
    session_id: Optional[str] = None
    vehicle_model_id: str = "vw_tcross_2024"
    
def get_beamng_simulator():
    """Dependency to get BeamNG simulator instance"""
    from fastapi import Request
    def _get_simulator(request: Request) -> BeamNGSimulator:
        return request.app.state.beamng
    return _get_simulator

def get_damage_extractor():
    """Dependency to get damage extractor instance"""
    return DamageExtractor()

@router.post("/extract")
async def extract_damage_telemetry(
    request: DamageExtractionRequest,
    simulator: BeamNGSimulator = Depends(get_beamng_simulator())
) -> DamageAnalysisResponse:
    """
    Extract damage telemetry from current BeamNG session.
    This simulates the 'Repair My Car' button functionality.
    """
    
    if not simulator.is_connected():
        raise HTTPException(
            status_code=400,
            detail="Not connected to BeamNG.tech. Use /api/health/beamng/connect first."
        )
    
    if not simulator.current_session:
        raise HTTPException(
            status_code=400,
            detail="No active BeamNG session. Load a vehicle scenario first."
        )
    
    try:
        start_time = datetime.now()
        
        # Extract telemetry from BeamNG
        telemetry = simulator.extract_damage_telemetry()
        
        if not telemetry:
            if not request.force_extraction:
                raise HTTPException(
                    status_code=404,
                    detail="No damage telemetry available. Drive and crash the vehicle first, or use force_extraction=true."
                )
            else:
                # Create mock telemetry for testing
                telemetry = _create_mock_telemetry(simulator.current_session.session_id)
                logger.info("Created mock telemetry for testing")
        
        # Convert to damage report
        extractor = DamageExtractor()
        damage_report = extractor.create_damage_report(telemetry, request.vehicle_model_id)
        
        # Mark session as having crash detected
        simulator.current_session.crash_detected = True
        
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        logger.info(f"Extracted damage telemetry for session {simulator.current_session.session_id}")
        
        return DamageAnalysisResponse(
            success=True,
            message=f"Successfully extracted damage data for {len(damage_report.impact_zones)} impact zones",
            damage_report=damage_report,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error extracting damage telemetry: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Damage extraction error: {str(e)}"
        )

@router.post("/trigger_repair")
async def trigger_repair_workflow(
    request: TriggerRepairRequest,
    simulator: BeamNGSimulator = Depends(get_beamng_simulator())
) -> Dict[str, Any]:
    """
    Trigger the complete repair workflow - from crash to estimate.
    This is the main 'Repair My Car' endpoint that combines damage extraction
    and estimate generation.
    """
    
    if not simulator.is_connected():
        raise HTTPException(
            status_code=400,
            detail="Not connected to BeamNG.tech. Use /api/health/beamng/connect first."
        )
    
    if not simulator.current_session:
        raise HTTPException(
            status_code=400,
            detail="No active BeamNG session. Load a vehicle scenario first."
        )
    
    try:
        # Step 1: Extract damage data
        extraction_request = DamageExtractionRequest(
            vehicle_model_id=request.vehicle_model_id,
            force_extraction=True  # Allow workflow even without real crash
        )
        
        damage_response = await extract_damage_telemetry(extraction_request, simulator)
        
        # Step 2: End the BeamNG session
        simulator.end_session()
        
        # Return workflow initiation response
        return {
            "status": "repair_workflow_initiated",
            "message": "Repair workflow started - damage extracted and session ended",
            "damage_report_id": damage_response.damage_report.report_id,
            "session_id": simulator.current_session.session_id,
            "next_steps": {
                "1": "GET /api/estimates/{damage_report_id} - Generate repair estimate",
                "2": "GET /api/dealers/search - Find available dealers",
                "3": "POST /api/appointments - Schedule repair appointment"
            },
            "damage_summary": {
                "crash_severity": damage_response.damage_report.crash_severity,
                "impact_zones": len(damage_response.damage_report.impact_zones),
                "processing_time_ms": damage_response.processing_time_ms
            }
        }
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Error in repair workflow: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Repair workflow error: {str(e)}"
        )

@router.get("/reports/{report_id}")
async def get_damage_report(report_id: str) -> Dict[str, Any]:
    """Get damage report by ID"""
    
    # TODO: Implement damage report storage/retrieval
    # For now, return mock response
    
    return {
        "status": "not_implemented",
        "message": "Damage report storage not yet implemented",
        "report_id": report_id,
        "note": "In production, this would retrieve saved damage reports from database"
    }

@router.get("/session/{session_id}/damage")
async def get_session_damage(session_id: str) -> Dict[str, Any]:
    """Get damage data for a specific BeamNG session"""
    
    # TODO: Implement session damage storage/retrieval
    
    return {
        "status": "not_implemented", 
        "message": "Session damage retrieval not yet implemented",
        "session_id": session_id,
        "note": "In production, this would retrieve damage data from completed sessions"
    }

def _create_mock_telemetry(session_id: str) -> BeamNGTelemetry:
    """Create mock telemetry for testing when no real crash data available"""
    
    # Simulate front-end collision damage
    mock_damage_data = {
        "front_bumper": 0.85,      # Severe damage - needs replacement
        "hood": 0.45,              # Moderate damage - repairable
        "left_front_fender": 0.65, # Major damage - likely replacement
        "right_front_fender": 0.25, # Minor damage - repairable
        "left_headlight": 0.95,    # Destroyed - replacement
        "right_headlight": 0.15,   # Minor damage - repairable
        "windshield": 0.30         # Cracked - replacement
    }
    
    return BeamNGTelemetry(
        session_id=session_id,
        timestamp=datetime.now(),
        vehicle_position=(100.0, 200.0, 1.2),
        vehicle_velocity=0.0,  # Vehicle stopped after crash
        damage_data=mock_damage_data,
        raw_data={"mock": True, "scenario": "front_collision"}
    )