"""Modern BeamNG integration API endpoints for VW crash simulation."""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
import uuid
import structlog

from src.services.beamng import BeamNGService
from src.schemas.beamng import (
    CrashSimulationRequest,
    BeamNGTelemetry,
    DamageReport,
    BeamNGHealthCheck,
    BeamNGSession
)
from src.utils.exceptions import BeamNGConnectionError, TelemetryExtractionError

logger = structlog.get_logger(__name__)
router = APIRouter()

# Dependency to get BeamNG service
_beamng_service: Optional[BeamNGService] = None

async def get_beamng_service() -> BeamNGService:
    """Dependency to get BeamNG service instance."""
    global _beamng_service
    if _beamng_service is None:
        _beamng_service = BeamNGService()
    return _beamng_service


@router.get("/health", response_model=BeamNGHealthCheck)
async def beamng_health_check(
    service: BeamNGService = Depends(get_beamng_service)
) -> BeamNGHealthCheck:
    """Check BeamNG.drive connection health."""
    try:
        connected = await service.is_connected()
        
        return BeamNGHealthCheck(
            connected=connected,
            last_check=service.client.websocket and True,
            active_sessions=1 if service.current_session else 0
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"BeamNG health check failed: {str(e)}"
        )


@router.post("/connect")
async def connect_to_beamng(
    service: BeamNGService = Depends(get_beamng_service)
) -> Dict[str, Any]:
    """Connect to BeamNG.drive with modern async service."""
    try:
        logger.info("Attempting to connect to BeamNG.drive")
        
        connected = await service.connect()
        
        if connected:
            return {
                "success": True,
                "message": "Successfully connected to BeamNG.drive",
                "service_type": "modern_async_websocket",
                "connection_details": {
                    "host": service.client.host,
                    "port": service.client.port,
                    "protocol": "WebSocket",
                    "async_enabled": True
                },
                "next_steps": [
                    "Load VW vehicle scenario using POST /beamng/scenario",
                    "Execute crash simulation using POST /beamng/crash",
                    "Extract damage data using GET /beamng/telemetry"
                ]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to connect to BeamNG.drive. Ensure BeamNG.drive is running and WebSocket API is enabled."
            )
            
    except BeamNGConnectionError as e:
        logger.error(f"BeamNG connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error during connection: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Connection error: {str(e)}"
        )


@router.post("/disconnect")
async def disconnect_from_beamng(
    service: BeamNGService = Depends(get_beamng_service)
) -> Dict[str, Any]:
    """Disconnect from BeamNG.drive."""
    try:
        await service.disconnect()
        
        return {
            "success": True,
            "message": "Disconnected from BeamNG.drive"
        }
        
    except Exception as e:
        logger.error(f"Disconnect error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Disconnect error: {str(e)}"
        )


@router.post("/scenario")
async def load_vw_scenario(
    vehicle_model: str = "tcross",
    scenario_type: str = "crash_test",
    service: BeamNGService = Depends(get_beamng_service)
) -> Dict[str, Any]:
    """Load VW vehicle scenario for crash simulation."""
    try:
        if not await service.is_connected():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not connected to BeamNG.drive. Connect first using POST /beamng/connect"
            )
        
        logger.info(f"Loading VW {vehicle_model} scenario")
        
        success = await service.load_vw_scenario(vehicle_model, scenario_type)
        
        if success:
            # Start telemetry monitoring
            await service.start_telemetry_monitoring()
            
            return {
                "success": True,
                "message": f"VW {vehicle_model} scenario loaded successfully",
                "session": {
                    "session_id": service.current_session.session_id,
                    "vehicle_model": vehicle_model,
                    "scenario_type": scenario_type,
                    "status": service.current_session.status
                },
                "next_steps": [
                    "Execute crash simulation using POST /beamng/crash",
                    "Monitor telemetry using GET /beamng/telemetry",
                    "Extract damage report after crash"
                ]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to load VW scenario. Check BeamNG.drive logs for details."
            )
            
    except HTTPException:
        raise
    except BeamNGConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Scenario loading error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scenario loading error: {str(e)}"
        )


@router.post("/crash")
async def execute_crash_simulation(
    crash_request: CrashSimulationRequest,
    service: BeamNGService = Depends(get_beamng_service)
) -> Dict[str, Any]:
    """Execute automated crash simulation."""
    try:
        if not service.current_session:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active session. Load a VW scenario first using POST /beamng/scenario"
            )
        
        logger.info(f"Executing crash simulation: {crash_request.crash_type} at {crash_request.speed_kmh} km/h")
        
        success = await service.execute_crash_simulation(crash_request)
        
        if success:
            return {
                "success": True,
                "message": "Crash simulation executed successfully",
                "crash_details": {
                    "type": crash_request.crash_type,
                    "speed_kmh": crash_request.speed_kmh,
                    "angle_degrees": crash_request.angle_degrees,
                    "automated": crash_request.automated
                },
                "session": {
                    "session_id": service.current_session.session_id,
                    "crash_detected": service.current_session.crash_detected,
                    "crash_timestamp": service.current_session.crash_timestamp
                },
                "next_steps": [
                    "Extract damage telemetry using GET /beamng/telemetry",
                    "Generate damage report using POST /beamng/damage-report"
                ]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Crash simulation failed. Check BeamNG.drive status."
            )
            
    except HTTPException:
        raise
    except BeamNGConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Crash simulation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Crash simulation error: {str(e)}"
        )


@router.get("/telemetry", response_model=BeamNGTelemetry)
async def get_damage_telemetry(
    service: BeamNGService = Depends(get_beamng_service)
) -> BeamNGTelemetry:
    """Extract current damage telemetry data."""
    try:
        if not service.current_session:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active session. Load a VW scenario first."
            )
        
        logger.info("Extracting damage telemetry")
        
        telemetry = await service.extract_damage_telemetry()
        
        if telemetry:
            return telemetry
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No telemetry data available. Execute crash simulation first."
            )
            
    except HTTPException:
        raise
    except TelemetryExtractionError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Telemetry extraction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Telemetry extraction error: {str(e)}"
        )


@router.post("/damage-report", response_model=DamageReport)
async def generate_damage_report(
    service: BeamNGService = Depends(get_beamng_service)
) -> DamageReport:
    """Generate comprehensive damage assessment report."""
    try:
        # Extract telemetry first
        telemetry = await service.extract_damage_telemetry()
        
        if not telemetry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No telemetry data available for damage report generation"
            )
        
        # Generate damage report
        damage_report = await service.generate_damage_report(telemetry)
        
        logger.info(f"Generated damage report: {damage_report.report_id}")
        
        return damage_report
        
    except HTTPException:
        raise
    except TelemetryExtractionError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Damage report generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Damage report generation error: {str(e)}"
        )


@router.get("/session", response_model=BeamNGSession)
async def get_current_session(
    service: BeamNGService = Depends(get_beamng_service)
) -> BeamNGSession:
    """Get current BeamNG session information."""
    if not service.current_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active session"
        )
    
    return service.current_session


@router.delete("/session")
async def end_session(
    service: BeamNGService = Depends(get_beamng_service)
) -> Dict[str, Any]:
    """End current BeamNG session and cleanup."""
    try:
        if not service.current_session:
            return {
                "success": True,
                "message": "No active session to end"
            }
        
        success = await service.end_session()
        
        return {
            "success": success,
            "message": "Session ended successfully" if success else "Session end encountered issues"
        }
        
    except Exception as e:
        logger.error(f"Session end error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Session end error: {str(e)}"
        )