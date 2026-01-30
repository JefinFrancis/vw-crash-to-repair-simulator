"""Modern async BeamNG integration service for VW crash simulation."""

import asyncio
import logging
import json
import websockets
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import structlog
from pathlib import Path

from src.config import settings
from src.schemas.beamng import (
    BeamNGConnectionConfig, 
    BeamNGTelemetry, 
    VehicleState,
    CrashSimulationRequest,
    DamageReport,
    BeamNGSession
)
from src.utils.exceptions import BeamNGConnectionError, TelemetryExtractionError

logger = structlog.get_logger(__name__)


class BeamNGWebSocketClient:
    """Async WebSocket client for BeamNG.drive integration."""
    
    def __init__(self, host: str = "localhost", port: int = 64256):
        self.host = host
        self.port = port
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.connected = False
        self._message_handlers = {}
        self._response_futures = {}
        
    async def connect(self) -> bool:
        """Establish WebSocket connection to BeamNG.drive."""
        try:
            uri = f"ws://{self.host}:{self.port}/api/websocket"
            self.websocket = await websockets.connect(uri, timeout=10)
            self.connected = True
            
            # Start message listener
            asyncio.create_task(self._message_listener())
            
            logger.info(f"Connected to BeamNG.drive at {uri}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to BeamNG.drive: {e}")
            self.connected = False
            return False
    
    async def disconnect(self):
        """Close WebSocket connection."""
        if self.websocket and self.connected:
            await self.websocket.close()
            self.connected = False
            logger.info("Disconnected from BeamNG.drive")
    
    async def send_command(self, command: str, data: Dict[str, Any] = None, timeout: float = 10.0) -> Dict[str, Any]:
        """Send command and wait for response."""
        if not self.connected or not self.websocket:
            raise BeamNGConnectionError("Not connected to BeamNG.drive")
        
        message_id = str(uuid.uuid4())
        message = {
            "id": message_id,
            "command": command,
            "data": data or {}
        }
        
        # Create future for response
        future = asyncio.Future()
        self._response_futures[message_id] = future
        
        try:
            # Send message
            await self.websocket.send(json.dumps(message))
            
            # Wait for response
            response = await asyncio.wait_for(future, timeout=timeout)
            return response
            
        except asyncio.TimeoutError:
            logger.error(f"Command timeout: {command}")
            raise BeamNGConnectionError(f"Command '{command}' timed out")
        except Exception as e:
            logger.error(f"Command failed: {command}, error: {e}")
            raise BeamNGConnectionError(f"Command '{command}' failed: {str(e)}")
        finally:
            # Cleanup
            self._response_futures.pop(message_id, None)
    
    async def _message_listener(self):
        """Listen for incoming WebSocket messages."""
        try:
            async for message in self.websocket:
                try:
                    data = json.loads(message)
                    await self._handle_message(data)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON message: {message}")
                except Exception as e:
                    logger.error(f"Error handling message: {e}")
        except websockets.exceptions.ConnectionClosed:
            logger.info("WebSocket connection closed")
            self.connected = False
        except Exception as e:
            logger.error(f"Message listener error: {e}")
            self.connected = False
    
    async def _handle_message(self, data: Dict[str, Any]):
        """Handle incoming WebSocket message."""
        message_id = data.get("id")
        
        if message_id and message_id in self._response_futures:
            # Response to command
            future = self._response_futures[message_id]
            if not future.done():
                future.set_result(data)
        else:
            # Event or notification
            event_type = data.get("type", "unknown")
            logger.debug(f"Received event: {event_type}", data=data)


class BeamNGService:
    """Modern async BeamNG integration service for VW crash simulation."""
    
    def __init__(self):
        self.client = BeamNGWebSocketClient(
            host=settings.BEAMNG_HOST,
            port=settings.BEAMNG_PORT
        )
        self.current_session: Optional[BeamNGSession] = None
        self.vehicle_state: Optional[VehicleState] = None
        self._telemetry_buffer = []
        
    async def connect(self) -> bool:
        """Connect to BeamNG.drive with health check."""
        try:
            connected = await self.client.connect()
            if connected:
                # Verify connection with ping
                response = await self.client.send_command("ping")
                if response.get("status") == "success":
                    logger.info("BeamNG.drive connection verified")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to connect to BeamNG.drive: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from BeamNG.drive."""
        await self.client.disconnect()
    
    async def is_connected(self) -> bool:
        """Check connection health."""
        if not self.client.connected:
            return False
        
        try:
            await self.client.send_command("ping", timeout=5.0)
            return True
        except:
            return False
    
    async def load_vw_scenario(self, vehicle_model: str, scenario_type: str = "crash_test") -> bool:
        """Load VW vehicle scenario with damage sensors."""
        try:
            # Create session
            session_id = f"vw_{vehicle_model}_{int(datetime.now().timestamp())}"
            
            scenario_config = {
                "scenario_name": f"vw_{scenario_type}",
                "map": "west_coast_usa",
                "vehicle": {
                    "model": f"vw_{vehicle_model}",
                    "position": {"x": -717, "y": 101, "z": 118},
                    "rotation": {"x": 0, "y": 0, "z": 0.3826834, "w": 0.9238795},
                    "license": f"VW-{vehicle_model.upper()}"
                },
                "sensors": ["damage", "position", "velocity", "acceleration"],
                "session_id": session_id
            }
            
            # Send scenario load command
            response = await self.client.send_command("load_scenario", scenario_config)
            
            if response.get("status") == "success":
                # Create session tracking
                self.current_session = BeamNGSession(
                    session_id=session_id,
                    vehicle_model=vehicle_model,
                    scenario_type=scenario_type,
                    started_at=datetime.now(),
                    status="active"
                )
                
                logger.info(f"VW scenario loaded: {vehicle_model} in {scenario_type}")
                return True
            else:
                logger.error(f"Failed to load scenario: {response}")
                return False
                
        except Exception as e:
            logger.error(f"Error loading VW scenario: {e}")
            return False
    
    async def start_telemetry_monitoring(self) -> bool:
        """Start real-time telemetry monitoring."""
        if not self.current_session:
            raise BeamNGConnectionError("No active session")
        
        try:
            response = await self.client.send_command("start_telemetry", {
                "session_id": self.current_session.session_id,
                "frequency": 10  # 10 Hz
            })
            
            return response.get("status") == "success"
            
        except Exception as e:
            logger.error(f"Failed to start telemetry monitoring: {e}")
            return False
    
    async def execute_crash_simulation(self, crash_params: CrashSimulationRequest) -> bool:
        """Execute automated crash simulation."""
        if not self.current_session:
            raise BeamNGConnectionError("No active session")
        
        try:
            # Configure crash parameters
            crash_config = {
                "session_id": self.current_session.session_id,
                "crash_type": crash_params.crash_type,
                "speed": crash_params.speed_kmh,
                "angle": crash_params.angle_degrees,
                "target": crash_params.target_object,
                "automated": True
            }
            
            logger.info(f"Executing crash simulation: {crash_params.crash_type} at {crash_params.speed_kmh} km/h")
            
            # Execute crash
            response = await self.client.send_command("execute_crash", crash_config, timeout=30.0)
            
            if response.get("status") == "success":
                # Mark crash in session
                self.current_session.crash_detected = True
                self.current_session.crash_timestamp = datetime.now()
                
                logger.info("Crash simulation completed successfully")
                return True
            else:
                logger.error(f"Crash simulation failed: {response}")
                return False
                
        except Exception as e:
            logger.error(f"Error executing crash simulation: {e}")
            return False
    
    async def extract_damage_telemetry(self) -> Optional[BeamNGTelemetry]:
        """Extract comprehensive damage telemetry data."""
        if not self.current_session:
            raise BeamNGConnectionError("No active session")
        
        try:
            logger.info("Extracting damage telemetry from BeamNG.drive")
            
            # Get damage data
            damage_response = await self.client.send_command("get_damage_data", {
                "session_id": self.current_session.session_id,
                "include_details": True
            })
            
            if damage_response.get("status") != "success":
                raise TelemetryExtractionError("Failed to get damage data")
            
            # Get vehicle state
            state_response = await self.client.send_command("get_vehicle_state", {
                "session_id": self.current_session.session_id
            })
            
            # Process telemetry data
            telemetry = BeamNGTelemetry(
                session_id=self.current_session.session_id,
                timestamp=datetime.now(),
                vehicle_position=state_response.get("data", {}).get("position", [0, 0, 0]),
                vehicle_velocity=state_response.get("data", {}).get("velocity", 0),
                vehicle_rotation=state_response.get("data", {}).get("rotation", [0, 0, 0, 1]),
                damage_data=self._normalize_damage_data(damage_response.get("data", {})),
                raw_damage_data=damage_response.get("data", {}),
                crash_detected=self.current_session.crash_detected,
                crash_severity=self._calculate_crash_severity(damage_response.get("data", {}))
            )
            
            logger.info(f"Telemetry extracted: {len(telemetry.damage_data)} damaged components")
            return telemetry
            
        except Exception as e:
            logger.error(f"Failed to extract damage telemetry: {e}")
            raise TelemetryExtractionError(f"Telemetry extraction failed: {str(e)}")
    
    async def generate_damage_report(self, telemetry: BeamNGTelemetry) -> DamageReport:
        """Generate comprehensive damage report from telemetry."""
        try:
            # Calculate overall damage assessment
            total_damage_value = sum(telemetry.damage_data.values())
            component_count = len([d for d in telemetry.damage_data.values() if d > 0.1])
            
            # Categorize damage by severity
            damage_categories = {
                "minor": [],
                "moderate": [],
                "severe": [],
                "total": []
            }
            
            for component, damage_level in telemetry.damage_data.items():
                if damage_level < 0.2:
                    damage_categories["minor"].append(component)
                elif damage_level < 0.5:
                    damage_categories["moderate"].append(component)
                elif damage_level < 0.8:
                    damage_categories["severe"].append(component)
                else:
                    damage_categories["total"].append(component)
            
            # Create damage report
            report = DamageReport(
                report_id=f"DR_{telemetry.session_id}_{int(datetime.now().timestamp())}",
                session_id=telemetry.session_id,
                vehicle_model=self.current_session.vehicle_model,
                timestamp=telemetry.timestamp,
                crash_severity=telemetry.crash_severity,
                total_damage_value=total_damage_value,
                affected_components_count=component_count,
                damage_categories=damage_categories,
                telemetry_data=telemetry.model_dump(),
                estimated_repair_complexity="high" if component_count > 5 else "medium" if component_count > 2 else "low"
            )
            
            logger.info(f"Generated damage report: {component_count} components affected")
            return report
            
        except Exception as e:
            logger.error(f"Failed to generate damage report: {e}")
            raise
    
    async def end_session(self) -> bool:
        """End current session and cleanup."""
        if not self.current_session:
            return True
        
        try:
            # Stop telemetry monitoring
            await self.client.send_command("stop_telemetry", {
                "session_id": self.current_session.session_id
            })
            
            # Clean up scenario
            await self.client.send_command("cleanup_scenario", {
                "session_id": self.current_session.session_id
            })
            
            # Mark session as completed
            self.current_session.status = "completed"
            self.current_session.ended_at = datetime.now()
            
            logger.info(f"Session ended: {self.current_session.session_id}")
            self.current_session = None
            
            return True
            
        except Exception as e:
            logger.error(f"Error ending session: {e}")
            return False
    
    def _normalize_damage_data(self, raw_damage: Dict[str, Any]) -> Dict[str, float]:
        """Normalize BeamNG damage data to VW component mapping."""
        # VW-specific component mapping
        vw_component_mapping = {
            # Front components
            "bumper_F": "front_bumper",
            "hood": "hood",
            "fender_FL": "left_front_fender",
            "fender_FR": "right_front_fender",
            "headlight_L": "left_headlight",
            "headlight_R": "right_headlight",
            "grille": "front_grille",
            
            # Body components
            "door_FL": "left_front_door",
            "door_FR": "right_front_door",
            "door_RL": "left_rear_door",
            "door_RR": "right_rear_door",
            "quarter_L": "left_quarter_panel",
            "quarter_R": "right_quarter_panel",
            "pillar_A_L": "left_a_pillar",
            "pillar_A_R": "right_a_pillar",
            
            # Rear components
            "bumper_R": "rear_bumper",
            "trunk": "trunk_lid",
            "taillight_L": "left_taillight",
            "taillight_R": "right_taillight",
            
            # Roof and glass
            "roof": "roof",
            "windshield": "windshield",
            "window_FL": "left_front_window",
            "window_FR": "right_front_window",
            "window_RL": "left_rear_window",
            "window_RR": "right_rear_window",
            
            # Mechanical
            "engine": "engine",
            "radiator": "radiator",
            "suspension_FL": "left_front_suspension",
            "suspension_FR": "right_front_suspension",
            "suspension_RL": "left_rear_suspension",
            "suspension_RR": "right_rear_suspension"
        }
        
        normalized = {}
        
        # Process damage data
        damage_data = raw_damage.get("components", {})
        for beamng_component, damage_value in damage_data.items():
            vw_component = vw_component_mapping.get(beamng_component, beamng_component)
            
            # Normalize damage value (0.0 to 1.0)
            if isinstance(damage_value, (int, float)):
                normalized_value = max(0.0, min(1.0, float(damage_value)))
                if normalized_value > 0.05:  # Only include meaningful damage
                    normalized[vw_component] = normalized_value
        
        return normalized
    
    def _calculate_crash_severity(self, damage_data: Dict[str, Any]) -> float:
        """Calculate overall crash severity from damage data."""
        if not damage_data:
            return 0.0
        
        components = damage_data.get("components", {})
        if not components:
            return 0.0
        
        # Calculate weighted severity
        total_damage = sum(components.values())
        max_damage = max(components.values()) if components else 0
        component_count = len([d for d in components.values() if d > 0.1])
        
        # Weighted severity calculation
        severity = (
            (total_damage / len(components)) * 0.4 +  # Average damage
            max_damage * 0.4 +                        # Maximum single damage
            (component_count / 20) * 0.2              # Component count factor
        )
        
        return max(0.0, min(1.0, severity))