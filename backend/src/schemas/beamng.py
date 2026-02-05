"""BeamNG integration Pydantic schemas for validation and serialization."""

from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
import uuid
from datetime import datetime
from enum import Enum


class CrashType(str, Enum):
    """Types of crash simulations."""
    FRONTAL = "frontal"
    REAR = "rear"
    SIDE = "side"
    ROLLOVER = "rollover"
    OFFSET = "offset"


class SessionStatus(str, Enum):
    """BeamNG session status."""
    INITIALIZING = "initializing"
    ACTIVE = "active"
    CRASHED = "crashed"
    COMPLETED = "completed"
    ERROR = "error"


class BeamNGConnectionConfig(BaseModel):
    """BeamNG connection configuration."""
    host: str = Field(default="localhost", description="BeamNG host address")
    port: int = Field(default=64256, description="BeamNG WebSocket port")
    timeout: int = Field(default=30, description="Connection timeout in seconds")
    retry_attempts: int = Field(default=3, description="Connection retry attempts")
    

class VehicleState(BaseModel):
    """Current vehicle state data."""
    position: List[float] = Field(..., description="Vehicle position [x, y, z]")
    velocity: float = Field(..., description="Vehicle velocity in m/s")
    rotation: List[float] = Field(..., description="Vehicle rotation quaternion [x, y, z, w]")
    acceleration: Optional[List[float]] = Field(None, description="Vehicle acceleration [x, y, z]")
    engine_running: bool = Field(default=True, description="Engine status")
    fuel_level: Optional[float] = Field(None, description="Fuel level percentage")


class BeamNGTelemetry(BaseModel):
    """Comprehensive BeamNG telemetry data."""
    session_id: str = Field(..., description="BeamNG session identifier")
    timestamp: datetime = Field(..., description="Telemetry extraction timestamp")
    vehicle_position: List[float] = Field(..., description="Vehicle position [x, y, z]")
    vehicle_velocity: float = Field(..., description="Vehicle velocity in m/s")
    vehicle_rotation: List[float] = Field(..., description="Vehicle rotation quaternion")
    damage_data: Dict[str, float] = Field(..., description="Normalized component damage data")
    raw_damage_data: Dict[str, Any] = Field(..., description="Raw BeamNG damage data")
    crash_detected: bool = Field(default=False, description="Whether crash was detected")
    crash_severity: float = Field(default=0.0, description="Overall crash severity (0.0-1.0)")
    vehicle_state: Optional[VehicleState] = None


class CrashSimulationRequest(BaseModel):
    """Request to execute crash simulation."""
    crash_type: CrashType = Field(..., description="Type of crash to simulate")
    speed_kmh: float = Field(..., ge=0, le=200, description="Vehicle speed in km/h")
    angle_degrees: Optional[float] = Field(None, ge=0, le=360, description="Impact angle in degrees")
    target_object: Optional[str] = Field(None, description="Target object for crash (barrier, vehicle, etc.)")
    automated: bool = Field(default=True, description="Automated simulation vs manual control")


class BeamNGSession(BaseModel):
    """BeamNG session tracking."""
    session_id: str = Field(..., description="Unique session identifier")
    vehicle_model: str = Field(..., description="VW vehicle model")
    scenario_type: str = Field(..., description="Scenario type (crash_test, etc.)")
    started_at: datetime = Field(..., description="Session start timestamp")
    ended_at: Optional[datetime] = None
    status: SessionStatus = Field(default=SessionStatus.INITIALIZING)
    crash_detected: bool = Field(default=False)
    crash_timestamp: Optional[datetime] = None
    telemetry_count: int = Field(default=0, description="Number of telemetry samples")


class DamageComponent(BaseModel):
    """Individual component damage data."""
    component_name: str = Field(..., description="VW component name")
    damage_level: float = Field(..., ge=0, le=1, description="Damage level (0.0-1.0)")
    damage_type: str = Field(..., description="Type of damage (scratch, dent, crack, etc.)")
    repairable: bool = Field(..., description="Whether component is repairable")
    replacement_needed: bool = Field(..., description="Whether replacement is needed")
    estimated_cost_brl: Optional[float] = Field(None, ge=0, description="Estimated repair cost in BRL")


class DamageReport(BaseModel):
    """Comprehensive damage assessment report."""
    report_id: str = Field(..., description="Unique damage report identifier")
    session_id: str = Field(..., description="Associated BeamNG session")
    vehicle_model: str = Field(..., description="VW vehicle model")
    timestamp: datetime = Field(..., description="Report generation timestamp")
    crash_severity: float = Field(..., ge=0, le=1, description="Overall crash severity")
    total_damage_value: float = Field(..., ge=0, description="Total damage value")
    affected_components_count: int = Field(..., ge=0, description="Number of damaged components")
    damage_categories: Dict[str, List[str]] = Field(..., description="Components by damage category")
    telemetry_data: Dict[str, Any] = Field(..., description="Source telemetry data")
    estimated_repair_complexity: str = Field(..., description="Repair complexity assessment")
    
    
class BeamNGHealthCheck(BaseModel):
    """BeamNG connection health status."""
    connected: bool = Field(..., description="Connection status")
    response_time_ms: Optional[float] = Field(None, description="Response time in milliseconds")
    last_check: Optional[datetime] = Field(None, description="Last health check timestamp")
    version: Optional[str] = Field(None, description="BeamNG version")
    active_sessions: int = Field(default=0, description="Number of active sessions")


class BeamNGCommand(BaseModel):
    """BeamNG WebSocket command structure."""
    command: str = Field(..., description="Command name")
    data: Dict[str, Any] = Field(default_factory=dict, description="Command data")
    timeout: float = Field(default=10.0, description="Command timeout in seconds")


class BeamNGResponse(BaseModel):
    """BeamNG WebSocket response structure."""
    status: str = Field(..., description="Response status (success/error)")
    data: Optional[Dict[str, Any]] = Field(None, description="Response data")
    error: Optional[str] = Field(None, description="Error message if status is error")
    timestamp: datetime = Field(default_factory=datetime.now, description="Response timestamp")


# ============================================================================
# LUA MOD CRASH EVENT SCHEMAS
# ============================================================================

class LuaModVehicleInfo(BaseModel):
    """Vehicle information from Lua mod."""
    id: Any = Field(..., description="BeamNG vehicle ID")
    name: str = Field(default="Unknown Vehicle", description="Vehicle name")
    model: str = Field(default="unknown", description="Vehicle model identifier")
    brand: str = Field(default="Unknown", description="Vehicle brand")
    year: int = Field(default=0, description="Vehicle year")
    plate: Optional[str] = Field(default="N/A", description="Vehicle license plate")
    config: Optional[str] = Field(default=None, description="Vehicle configuration (legacy)")


class LuaModPosition(BaseModel):
    """Vehicle position from Lua mod."""
    x: float = Field(default=0, description="X coordinate")
    y: float = Field(default=0, description="Y coordinate")
    z: float = Field(default=0, description="Z coordinate")


class LuaModVelocity(BaseModel):
    """Vehicle velocity from Lua mod."""
    x: float = Field(default=0, description="X velocity component")
    y: float = Field(default=0, description="Y velocity component")
    z: float = Field(default=0, description="Z velocity component")
    speed_ms: float = Field(default=0, description="Speed in m/s")
    speed_kmh: float = Field(default=0, description="Speed in km/h")
    speed_mph: float = Field(default=0, description="Speed in mph")


class LuaModRotation(BaseModel):
    """Vehicle rotation quaternion from Lua mod."""
    x: float = Field(default=0)
    y: float = Field(default=0)
    z: float = Field(default=0)
    w: float = Field(default=1)


class LuaModDamagePart(BaseModel):
    """Individual part damage data."""
    name: str = Field(..., description="Part display name")
    partId: str = Field(..., description="Part identifier")
    damage: float = Field(default=0, ge=0, le=1, description="Part damage level (0.0-1.0)")


class LuaModDamageData(BaseModel):
    """Damage data from Lua mod."""
    total_damage: float = Field(default=0, ge=0, le=1, description="Total damage (0.0-1.0)")
    previous_damage: Optional[float] = Field(default=0, ge=0, le=1, description="Previous damage level")
    damage_delta: float = Field(default=0, description="Change in damage")
    damaged_parts_count: int = Field(default=0, description="Number of damaged parts")
    total_parts_count: int = Field(default=0, description="Total number of parts")
    parts: List[LuaModDamagePart] = Field(default_factory=list, description="List of damaged parts with details")


class LuaModMetadata(BaseModel):
    """Metadata from Lua mod."""
    mod_version: str = Field(default="1.0.0", description="Lua mod version")
    beamng_version: str = Field(default="unknown", description="BeamNG version")
    damage_threshold: float = Field(default=0.1, description="Configured damage threshold")


class LuaModCrashEvent(BaseModel):
    """Crash event received from BeamNG Lua mod."""
    event_type: str = Field(..., description="Event type (crash_detected, telemetry_update, etc.)")
    timestamp: int = Field(..., description="Unix timestamp")
    timestamp_iso: Optional[str] = Field(None, description="ISO format timestamp")
    
    vehicle: LuaModVehicleInfo = Field(default_factory=LuaModVehicleInfo)
    position: LuaModPosition = Field(default_factory=LuaModPosition)
    velocity: LuaModVelocity = Field(default_factory=LuaModVelocity)
    rotation: LuaModRotation = Field(default_factory=LuaModRotation)
    damage: LuaModDamageData = Field(default_factory=LuaModDamageData)
    metadata: LuaModMetadata = Field(default_factory=LuaModMetadata)
    
    class Config:
        json_schema_extra = {
            "example": {
                "event_type": "crash_detected",
                "timestamp": 1706620800,
                "timestamp_iso": "2026-01-30T12:00:00Z",
                "vehicle": {
                    "id": 1234,
                    "name": "T-Cross",
                    "model": "tcross",
                    "brand": "Volkswagen",
                    "year": 2024,
                    "plate": "ABC-1234"
                },
                "position": {"x": -717.5, "y": 101.2, "z": 118.0},
                "velocity": {"x": 10.5, "y": 2.3, "z": 0.1, "speed_ms": 12.6, "speed_kmh": 45.5, "speed_mph": 28.3},
                "damage": {
                    "total_damage": 0.35,
                    "damage_delta": 0.25,
                    "damaged_parts_count": 3,
                    "total_parts_count": 42,
                    "parts": [
                        {"name": "Front Bumper", "partId": "bumper_F", "damage": 0.8},
                        {"name": "Hood", "partId": "hood", "damage": 0.5},
                        {"name": "Left Fender", "partId": "fender_L", "damage": 0.2}
                    ]
                }
            }
        }


class CrashEventResponse(BaseModel):
    """Response to crash event submission."""
    success: bool = Field(..., description="Whether event was processed successfully")
    crash_id: str = Field(..., description="Unique crash event ID")
    message: str = Field(..., description="Response message")
    damage_summary: Dict[str, Any] = Field(default_factory=dict, description="Summary of damage")
    estimate_available: bool = Field(default=False, description="Whether estimate is ready")
    estimate_url: Optional[str] = Field(None, description="URL to view repair estimate")


class LatestCrashResponse(BaseModel):
    """Response containing latest crash data."""
    has_crash: bool = Field(..., description="Whether there's a recent crash")
    crash_id: Optional[str] = Field(None, description="Crash event ID")
    crash_time: Optional[datetime] = Field(None, description="When crash occurred")
    vehicle_model: Optional[str] = Field(None, description="Vehicle model")
    total_damage: Optional[float] = Field(None, description="Total damage level")
    damaged_parts_count: Optional[int] = Field(None, description="Number of damaged parts")
    damaged_parts: Optional[List[Dict[str, Any]]] = Field(None, description="List of damaged parts")
    speed_at_impact: Optional[float] = Field(None, description="Speed at impact in km/h")
    estimate_ready: bool = Field(default=False, description="Whether estimate is calculated")