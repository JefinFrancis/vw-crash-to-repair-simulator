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