# VW Crash-to-Repair Simulator API
# Health Check and System Status Routes

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
import logging
from datetime import datetime

from ...beamng import BeamNGSimulator, check_beamng_installation

logger = logging.getLogger(__name__)
router = APIRouter()

def get_beamng_simulator():
    """Dependency to get BeamNG simulator instance from app state"""
    from fastapi import Request
    def _get_simulator(request: Request) -> BeamNGSimulator:
        return request.app.state.beamng
    return _get_simulator

@router.get("/")
async def health_check() -> Dict[str, Any]:
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "vw-crash-to-repair-api",
        "version": "0.1.0"
    }

@router.get("/system")
async def system_status(simulator: BeamNGSimulator = Depends(get_beamng_simulator())) -> Dict[str, Any]:
    """Detailed system status including BeamNG connectivity"""
    
    # Check BeamNG status
    beamng_status = {
        "configured": bool(simulator.home),
        "installation_valid": False,
        "connected": simulator.is_connected(),
        "home_path": simulator.home or "not_configured"
    }
    
    if simulator.home:
        beamng_status["installation_valid"] = check_beamng_installation(simulator.home)
    
    # Overall system health
    overall_status = "healthy"
    if not beamng_status["configured"]:
        overall_status = "configuration_required"
    elif not beamng_status["installation_valid"]:
        overall_status = "beamng_installation_invalid"
    elif not beamng_status["connected"]:
        overall_status = "beamng_disconnected"
    
    return {
        "status": overall_status,
        "timestamp": datetime.now().isoformat(),
        "components": {
            "api": {"status": "healthy"},
            "beamng": beamng_status,
            "data": {"status": "loaded"}  # TODO: Check data file status
        },
        "ready_for_demo": overall_status == "healthy"
    }

@router.post("/beamng/connect")
async def connect_beamng(simulator: BeamNGSimulator = Depends(get_beamng_simulator())) -> Dict[str, Any]:
    """Connect to BeamNG.tech simulator"""
    
    if not simulator.home:
        raise HTTPException(
            status_code=400, 
            detail="BeamNG.tech home path not configured. Please set BNG_HOME in config.yaml"
        )
    
    if not check_beamng_installation(simulator.home):
        raise HTTPException(
            status_code=400,
            detail=f"BeamNG.tech installation not found at {simulator.home}"
        )
    
    if simulator.is_connected():
        return {
            "status": "already_connected",
            "message": "BeamNG.tech is already connected",
            "connection": {
                "host": simulator.host,
                "port": simulator.port,
                "home": simulator.home
            }
        }
    
    try:
        success = simulator.connect()
        if success:
            logger.info("Successfully connected to BeamNG.tech")
            return {
                "status": "connected",
                "message": "Successfully connected to BeamNG.tech",
                "connection": {
                    "host": simulator.host,
                    "port": simulator.port,
                    "home": simulator.home
                }
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to connect to BeamNG.tech. Make sure BeamNG.tech is running."
            )
    except Exception as e:
        logger.error(f"Error connecting to BeamNG.tech: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Connection error: {str(e)}"
        )

@router.post("/beamng/disconnect")
async def disconnect_beamng(simulator: BeamNGSimulator = Depends(get_beamng_simulator())) -> Dict[str, Any]:
    """Disconnect from BeamNG.tech simulator"""
    
    if not simulator.is_connected():
        return {
            "status": "not_connected",
            "message": "BeamNG.tech is not currently connected"
        }
    
    try:
        simulator.disconnect()
        logger.info("Disconnected from BeamNG.tech")
        return {
            "status": "disconnected",
            "message": "Successfully disconnected from BeamNG.tech"
        }
    except Exception as e:
        logger.error(f"Error disconnecting from BeamNG.tech: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Disconnection error: {str(e)}"
        )

@router.get("/beamng/status")
async def beamng_status(simulator: BeamNGSimulator = Depends(get_beamng_simulator())) -> Dict[str, Any]:
    """Get detailed BeamNG.tech status"""
    
    status = {
        "configured": bool(simulator.home),
        "connected": simulator.is_connected(),
        "home_path": simulator.home or "not_configured",
        "host": simulator.host,
        "port": simulator.port,
        "current_session": None
    }
    
    if simulator.home:
        status["installation_valid"] = check_beamng_installation(simulator.home)
    
    if simulator.current_session:
        status["current_session"] = {
            "session_id": simulator.current_session.session_id,
            "vehicle_model": simulator.current_session.vehicle_model,
            "scenario": simulator.current_session.scenario,
            "start_time": simulator.current_session.start_time.isoformat(),
            "crash_detected": simulator.current_session.crash_detected
        }
    
    return status

@router.post("/beamng/load_scenario/{vehicle_model}")
async def load_vehicle_scenario(
    vehicle_model: str,
    simulator: BeamNGSimulator = Depends(get_beamng_simulator())
) -> Dict[str, Any]:
    """Load a VW vehicle scenario in BeamNG.tech"""
    
    if not simulator.is_connected():
        raise HTTPException(
            status_code=400,
            detail="Not connected to BeamNG.tech. Use /beamng/connect first."
        )
    
    # Validate vehicle model
    supported_models = ["tcross", "golf"]
    if vehicle_model.lower() not in supported_models:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported vehicle model: {vehicle_model}. Supported: {supported_models}"
        )
    
    try:
        success = simulator.load_vw_scenario(vehicle_model.lower())
        if success:
            logger.info(f"Loaded VW {vehicle_model} scenario")
            return {
                "status": "scenario_loaded",
                "message": f"Successfully loaded VW {vehicle_model} scenario",
                "vehicle_model": vehicle_model.lower(),
                "session_id": simulator.current_session.session_id if simulator.current_session else None,
                "next_step": "Drive the vehicle and crash it, then use /api/damage/extract to get damage data"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to load VW {vehicle_model} scenario"
            )
    except Exception as e:
        logger.error(f"Error loading scenario: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Scenario loading error: {str(e)}"
        )