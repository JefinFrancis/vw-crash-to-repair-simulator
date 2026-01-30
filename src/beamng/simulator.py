# VW Crash-to-Repair Simulator
# BeamNG.tech Integration Module

import os
import time
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from pathlib import Path

try:
    from beamngpy import BeamNGpy, Scenario, Vehicle
    from beamngpy.sensors import Damage
    BEAMNGPY_AVAILABLE = True
except ImportError:
    BEAMNGPY_AVAILABLE = False
    logging.warning("BeamNGpy not available. Install with: pip install beamngpy")

from ..models import BeamNGSession, BeamNGTelemetry, DamageReport, ComponentDamage, DamageType

logger = logging.getLogger(__name__)

class BeamNGSimulator:
    """
    BeamNG.tech simulator interface for VW crash-to-repair experience.
    Handles connection, vehicle spawning, and damage data extraction.
    """
    
    def __init__(self, host: str = "localhost", port: int = 25252, home: str = ""):
        self.host = host
        self.port = port
        self.home = home
        self.bng: Optional[BeamNGpy] = None
        self.current_session: Optional[BeamNGSession] = None
        self.connected = False
        
    def connect(self) -> bool:
        """Connect to BeamNG.tech instance"""
        if not BEAMNGPY_AVAILABLE:
            logger.error("BeamNGpy library not available")
            return False
            
        try:
            self.bng = BeamNGpy(self.host, self.port, home=self.home)
            self.bng.open()
            self.connected = True
            logger.info(f"Connected to BeamNG.tech at {self.host}:{self.port}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to BeamNG.tech: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from BeamNG.tech"""
        if self.bng and self.connected:
            try:
                self.bng.close()
                self.connected = False
                logger.info("Disconnected from BeamNG.tech")
            except Exception as e:
                logger.error(f"Error disconnecting: {e}")
    
    def is_connected(self) -> bool:
        """Check if connected to BeamNG.tech"""
        return self.connected and self.bng is not None
    
    def load_vw_scenario(self, vehicle_model: str = "tcross") -> bool:
        """
        Load a VW vehicle scenario for crash testing.
        
        Args:
            vehicle_model: VW model to load ("tcross", "golf", etc.)
        """
        if not self.is_connected():
            logger.error("Not connected to BeamNG.tech")
            return False
            
        try:
            # Create scenario based on vehicle model
            if vehicle_model.lower() == "tcross":
                scenario_name = "vw_tcross_crash_test"
                beamng_vehicle = "tcross"  # Update based on actual model name
                map_name = "west_coast_usa"  # Default test map
            elif vehicle_model.lower() == "golf":
                scenario_name = "vw_golf_crash_test"
                beamng_vehicle = "golf"
                map_name = "west_coast_usa"
            else:
                logger.error(f"Unsupported vehicle model: {vehicle_model}")
                return False
            
            # Create scenario
            scenario = Scenario(map_name, scenario_name)
            
            # Create VW vehicle with damage sensor
            vehicle = Vehicle(f'vw_{vehicle_model}', model=beamng_vehicle, license=f'VW-{vehicle_model.upper()}')
            
            # Add damage sensor for telemetry
            damage_sensor = Damage()
            vehicle.sensors.attach('damage', damage_sensor)
            
            # Add vehicle to scenario at suitable position
            scenario.add_vehicle(vehicle, pos=(-717, 101, 118), rot_quat=(0, 0, 0.3826834, 0.9238795))
            
            # Generate scenario files
            scenario.make(self.bng)
            
            # Load and start scenario
            self.bng.scenario.load(scenario)
            self.bng.scenario.start()
            
            # Create session tracking
            self.current_session = BeamNGSession(
                session_id=f"{scenario_name}_{int(time.time())}",
                vehicle_model=vehicle_model,
                scenario=scenario_name,
                start_time=datetime.now()
            )
            
            logger.info(f"Loaded VW {vehicle_model} scenario successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load VW scenario: {e}")
            return False
    
    def extract_damage_telemetry(self) -> Optional[BeamNGTelemetry]:
        """
        Extract damage telemetry from current vehicle.
        Called after a crash or on user request.
        """
        if not self.is_connected() or not self.current_session:
            logger.error("No active BeamNG session")
            return None
            
        try:
            # Get vehicle reference
            vehicles = self.bng.vehicles
            if not vehicles:
                logger.error("No vehicles in scenario")
                return None
                
            # Get first vehicle (should be our VW test vehicle)
            vehicle = next(iter(vehicles.values()))
            
            # Get damage sensor data
            vehicle.sensors.poll()
            damage_data = vehicle.sensors.get('damage')
            
            if damage_data is None:
                logger.warning("No damage sensor data available")
                return None
            
            # Get vehicle position and state
            vehicle.update_vehicle()
            position = vehicle.state.get('pos', (0, 0, 0))
            velocity = vehicle.state.get('vel', 0)
            
            # Process damage data into normalized format
            normalized_damage = self._normalize_damage_data(damage_data)
            
            telemetry = BeamNGTelemetry(
                session_id=self.current_session.session_id,
                timestamp=datetime.now(),
                vehicle_position=position,
                vehicle_velocity=velocity,
                damage_data=normalized_damage,
                raw_data=damage_data
            )
            
            logger.info(f"Extracted damage telemetry: {len(normalized_damage)} components affected")
            return telemetry
            
        except Exception as e:
            logger.error(f"Failed to extract damage telemetry: {e}")
            return None
    
    def _normalize_damage_data(self, raw_damage: Dict[str, Any]) -> Dict[str, float]:
        """
        Normalize BeamNG damage data into component damage levels.
        Maps BeamNG internal damage format to our standardized component IDs.
        """
        normalized = {}
        
        # BeamNG damage data mapping to VW components
        # This mapping will need refinement based on actual BeamNG data structure
        component_mapping = {
            # Front end components
            "bumper_F": "front_bumper",
            "hood": "hood", 
            "fender_FL": "left_front_fender",
            "fender_FR": "right_front_fender",
            "headlight_L": "left_headlight",
            "headlight_R": "right_headlight",
            
            # Body components  
            "door_FL": "left_front_door",
            "door_FR": "right_front_door",
            "door_RL": "left_rear_door", 
            "door_RR": "right_rear_door",
            "quarter_L": "left_quarter_panel",
            "quarter_R": "right_quarter_panel",
            
            # Rear components
            "bumper_R": "rear_bumper",
            "trunk": "trunk_lid",
            "taillight_L": "left_taillight",
            "taillight_R": "right_taillight",
            
            # Mechanical components
            "engine": "engine_assembly",
            "transmission": "transmission", 
            "suspension_FL": "left_front_suspension",
            "suspension_FR": "right_front_suspension",
            "suspension_RL": "left_rear_suspension",
            "suspension_RR": "right_rear_suspension",
            
            # Glass
            "windshield": "windshield",
            "window_FL": "left_front_window",
            "window_FR": "right_front_window",
            "window_RL": "left_rear_window", 
            "window_RR": "right_rear_window"
        }
        
        # Process raw damage data
        for beamng_component, damage_value in raw_damage.items():
            # Map to standardized component ID
            if beamng_component in component_mapping:
                component_id = component_mapping[beamng_component]
                # Normalize damage value to 0.0-1.0 range
                normalized_value = min(1.0, max(0.0, float(damage_value)))
                normalized[component_id] = normalized_value
                
        return normalized
    
    def end_session(self):
        """End current session and mark completion time"""
        if self.current_session:
            self.current_session.end_time = datetime.now()
            self.current_session.crash_detected = True
            logger.info(f"Ended session: {self.current_session.session_id}")

class DamageExtractor:
    """
    Converts BeamNG telemetry into structured damage reports for parts mapping.
    """
    
    def __init__(self):
        self.damage_thresholds = {
            "minor": 0.2,      # Light scratches, minor dents
            "moderate": 0.5,   # Significant damage but repairable
            "major": 0.8,      # Severe damage, likely replacement needed
            "total": 0.95      # Complete destruction
        }
    
    def create_damage_report(self, telemetry: BeamNGTelemetry, vehicle_model_id: str) -> DamageReport:
        """
        Convert BeamNG telemetry into a structured damage report.
        """
        # Calculate overall crash severity
        damage_values = list(telemetry.damage_data.values())
        crash_severity = max(damage_values) if damage_values else 0.0
        
        # Create component damage entries
        component_damages = []
        for component_id, damage_level in telemetry.damage_data.items():
            if damage_level > 0.1:  # Only include components with meaningful damage
                
                # Determine damage type based on severity
                if damage_level < self.damage_thresholds["minor"]:
                    damage_type = DamageType.SCRATCHING
                    repairable = True
                elif damage_level < self.damage_thresholds["moderate"]:
                    damage_type = DamageType.DEFORMATION  
                    repairable = True
                elif damage_level < self.damage_thresholds["major"]:
                    damage_type = DamageType.CRACKING
                    repairable = damage_level < 0.7  # Some severe cracks not repairable
                else:
                    damage_type = DamageType.DESTRUCTION
                    repairable = False
                
                # Estimate repair time based on damage
                if repairable:
                    repair_hours = damage_level * 8  # Up to 8 hours for severe damage
                else:
                    repair_hours = 2  # Replacement time
                
                component_damage = ComponentDamage(
                    component_id=component_id,
                    damage_level=damage_level,
                    damage_type=damage_type,
                    repairable=repairable,
                    estimated_repair_time=timedelta(hours=repair_hours),
                    confidence=0.85  # AI confidence level
                )
                component_damages.append(component_damage)
        
        # Create damage report
        report = DamageReport(
            report_id=f"DR_{telemetry.session_id}_{int(time.time())}",
            session_id=telemetry.session_id,
            vehicle_model_id=vehicle_model_id,
            timestamp=telemetry.timestamp,
            crash_severity=crash_severity
        )
        
        # Group components by impact zones for better organization
        # This is a simplified zoning - could be enhanced based on actual crash data
        front_components = ["front_bumper", "hood", "left_front_fender", "right_front_fender", 
                          "left_headlight", "right_headlight", "windshield"]
        rear_components = ["rear_bumper", "trunk_lid", "left_taillight", "right_taillight"]
        side_components = ["left_front_door", "right_front_door", "left_rear_door", "right_rear_door",
                          "left_quarter_panel", "right_quarter_panel"]
        
        # Create impact zones
        zones = []
        
        # Front impact zone
        front_damage = [cd for cd in component_damages if cd.component_id in front_components]
        if front_damage:
            front_severity = max([cd.damage_level for cd in front_damage])
            zones.append({
                "zone_id": "front_impact",
                "severity": front_severity,
                "impact_type": "frontal_collision",
                "affected_components": front_damage
            })
        
        # Add other zones as needed...
        
        logger.info(f"Created damage report with {len(component_damages)} damaged components")
        return report

# Utility functions for BeamNG integration

def check_beamng_installation(home_path: str) -> bool:
    """Check if BeamNG.tech is properly installed at the given path"""
    if not home_path:
        return False
        
    beamng_path = Path(home_path)
    if not beamng_path.exists():
        return False
        
    # Look for key BeamNG executable files
    executables = ["BeamNG.tech.exe", "BeamNG.tech", "BeamNG.drive.exe"]
    for exe in executables:
        if (beamng_path / exe).exists():
            return True
            
    return False

def get_installed_vehicles(home_path: str) -> List[str]:
    """Get list of installed vehicle models in BeamNG"""
    vehicles = []
    if not home_path:
        return vehicles
        
    # Look in vehicles directory (BeamNG structure may vary)
    vehicles_path = Path(home_path) / "content" / "vehicles"
    if vehicles_path.exists():
        for vehicle_dir in vehicles_path.iterdir():
            if vehicle_dir.is_dir():
                vehicles.append(vehicle_dir.name)
                
    return vehicles