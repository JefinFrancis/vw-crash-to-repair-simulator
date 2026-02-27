"""Modern BeamNG integration API endpoints for VW crash simulation."""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
import uuid
import structlog
from datetime import datetime

from src.services.beamng import BeamNGService
from src.schemas.beamng import (
    CrashSimulationRequest,
    BeamNGTelemetry,
    DamageReport,
    BeamNGHealthCheck,
    BeamNGSession,
    LuaModCrashEvent,
    CrashEventResponse,
    LatestCrashResponse
)
from src.models.crash_event import CrashEvent
from src.api.dependencies import CrashEventRepoDep, DBSession
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


# ============================================================================
# LUA MOD CRASH EVENT ENDPOINTS
# ============================================================================

@router.post("/crash-event", response_model=CrashEventResponse)
async def receive_crash_event(
    event: LuaModCrashEvent,
    repo: CrashEventRepoDep,
    db: DBSession,
) -> CrashEventResponse:
    """
    Receive crash event from BeamNG Lua mod.

    This endpoint is called automatically by the VW Damage Reporter mod
    when a crash is detected in BeamNG.
    """
    try:
        crash_id = f"CRASH_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}"

        logger.info(
            f"Crash event received from Lua mod",
            event_type=event.event_type,
            vehicle=event.vehicle.model,
            total_damage=event.damage.total_damage,
            speed_kmh=event.velocity.speed_kmh
        )

        # Determine damage severity (aligned with frontend thresholds)
        total_damage = event.damage.total_damage
        if total_damage >= 0.8:
            severity = "total_loss"
        elif total_damage >= 0.5:
            severity = "severe"
        elif total_damage >= 0.2:
            severity = "moderate"
        else:
            severity = "minor"

        # Build full event payload for JSONB storage
        # Strip brand prefix from name to avoid duplication (e.g. "Volkswagen T-Cross" → "T-Cross")
        vehicle_name = event.vehicle.name
        if event.vehicle.brand and vehicle_name.startswith(event.vehicle.brand + " "):
            vehicle_name = vehicle_name[len(event.vehicle.brand) + 1:]

        event_data = {
            "crash_id": crash_id,
            "received_at": datetime.now().isoformat(),
            "event_type": event.event_type,
            "timestamp": event.timestamp,
            "vehicle": {
                "id": event.vehicle.id,
                "name": vehicle_name,
                "model": event.vehicle.model,
                "brand": event.vehicle.brand,
                "year": event.vehicle.year
            },
            "position": {
                "x": event.position.x,
                "y": event.position.y,
                "z": event.position.z
            },
            "velocity": {
                "speed_kmh": event.velocity.speed_kmh,
                "speed_ms": event.velocity.speed_ms
            },
            "damage": {
                "total_damage": event.damage.total_damage,
                "previous_damage": event.damage.previous_damage,
                "damage_delta": event.damage.damage_delta,
                "part_damage": event.damage.part_damage,
                "damage_by_zone": {
                    "front": event.damage.damage_by_zone.front,
                    "rear": event.damage.damage_by_zone.rear,
                    "left": event.damage.damage_by_zone.left,
                    "right": event.damage.damage_by_zone.right,
                    "top": event.damage.damage_by_zone.top,
                    "bottom": event.damage.damage_by_zone.bottom
                },
                "broken_parts": event.damage.broken_parts,
                "broken_parts_count": event.damage.broken_parts_count,
                "damaged_parts_count": event.damage.damaged_parts_count,
                "total_parts_count": event.damage.total_parts_count,
                "parts": [{"name": p.name, "partId": p.partId, "damage": p.damage} for p in event.damage.parts]
            },
            "metadata": {
                "mod_version": event.metadata.mod_version,
                "beamng_version": event.metadata.beamng_version,
                "damage_threshold": event.metadata.damage_threshold
            }
        }

        # Persist to database
        crash_event = CrashEvent(
            crash_id=crash_id,
            event_type=event.event_type,
            vehicle_model=event.vehicle.model,
            vehicle_brand=event.vehicle.brand,
            speed_kmh=event.velocity.speed_kmh,
            total_damage=total_damage,
            severity=severity,
            beamng_timestamp=event.timestamp,
            event_data=event_data,
        )
        await repo.create(crash_event)
        await db.commit()

        logger.info(
            f"Crash event persisted: {crash_id}",
            severity=severity,
            broken_parts=event.damage.broken_parts_count
        )

        return CrashEventResponse(
            success=True,
            crash_id=crash_id,
            message=f"Crash event received and processed. Severity: {severity}",
            damage_summary={
                "severity": severity,
                "total_damage_percent": round(total_damage * 100, 1),
                "broken_parts_count": event.damage.broken_parts_count,
                "most_damaged_zone": max(
                    event.damage.damage_by_zone.model_dump().items(),
                    key=lambda x: x[1]
                )[0] if total_damage > 0 else "none",
                "impact_speed_kmh": round(event.velocity.speed_kmh, 1)
            },
            estimate_available=True,
            estimate_url=f"/api/v1/damage/{crash_id}/estimate"
        )

    except Exception as e:
        logger.error(f"Error processing crash event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process crash event: {str(e)}"
        )


@router.get("/latest-crash", response_model=LatestCrashResponse)
async def get_latest_crash(repo: CrashEventRepoDep) -> LatestCrashResponse:
    """
    Get the most recent crash event.

    Frontend can poll this endpoint to check for new crashes.
    """
    latest = await repo.get_latest()

    if not latest:
        return LatestCrashResponse(has_crash=False)

    event_data = latest.event_data
    damage_data = event_data["damage"]
    return LatestCrashResponse(
        has_crash=True,
        crash_id=latest.crash_id,
        crash_time=latest.created_at,
        vehicle_model=event_data["vehicle"]["model"],
        total_damage=damage_data.get("total_damage"),
        damaged_parts_count=damage_data.get("damaged_parts_count"),
        broken_parts_count=damage_data.get("broken_parts_count"),
        damaged_parts=damage_data.get("parts", []),
        broken_parts=damage_data.get("broken_parts", []),
        part_damage=damage_data.get("part_damage", {}),
        damage_by_zone=damage_data.get("damage_by_zone"),
        speed_at_impact=event_data["velocity"]["speed_kmh"],
        estimate_ready=True
    )


@router.get("/crash-history")
async def get_crash_history(
    repo: CrashEventRepoDep,
    limit: int = 10,
    offset: int = 0
) -> Dict[str, Any]:
    """
    Get crash event history.

    Args:
        limit: Maximum number of crashes to return (default: 10)
        offset: Number of crashes to skip (default: 0)
    """
    total = await repo.count()
    crashes = await repo.get_history(limit=limit, offset=offset)

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "crashes": [c.event_data for c in crashes]
    }


@router.get("/crash/{crash_id}")
async def get_crash_by_id(crash_id: str, repo: CrashEventRepoDep) -> Dict[str, Any]:
    """Get a specific crash event by ID."""
    crash = await repo.get_by_crash_id(crash_id)
    if not crash:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Crash event not found: {crash_id}"
        )
    return crash.event_data


@router.delete("/crash/{crash_id}")
async def delete_crash(crash_id: str, repo: CrashEventRepoDep, db: DBSession) -> Dict[str, Any]:
    """Delete a specific crash event by ID."""
    deleted = await repo.delete_by_crash_id(crash_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Crash event not found: {crash_id}"
        )
    await db.commit()
    return {"success": True, "message": f"Crash {crash_id} deleted"}


@router.delete("/crash-history")
async def clear_crash_history(repo: CrashEventRepoDep, db: DBSession) -> Dict[str, Any]:
    """Clear all crash event history."""
    count = await repo.clear_all()
    await db.commit()
    return {
        "success": True,
        "message": f"Cleared {count} crash events"
    }