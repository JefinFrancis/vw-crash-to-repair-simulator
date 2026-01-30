"""
VW BeamNG Service Layer - Modern Async Implementation
Migrated from the original BeamNG simulator with enhanced architecture
"""

import asyncio
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from pathlib import Path
import json

try:
    from beamngpy import BeamNGpy, Scenario, Vehicle
    from beamngpy.sensors import Damage
    BEAMNGPY_AVAILABLE = True
except ImportError:
    BEAMNGPY_AVAILABLE = False
    logging.warning("BeamNGpy not available. Install with: pip install beamngpy")

from ..models import BeamNGSession, BeamNGTelemetry, DamageReport, ComponentDamage, DamageType

logger = logging.getLogger(__name__)

class VWBeamNGService:
    """
    Modern async BeamNG service for VW vehicle simulations.
    Replaces the original BeamNGSimulator with enhanced async patterns,
    better error handling, and VW-specific functionality.
    """
    
    def __init__(self, host: str = "localhost", port: int = 25252, home: str = ""):
        self.host = host
        self.port = port
        self.home = home
        self.bng: Optional[BeamNGpy] = None
        self.current_session: Optional[BeamNGSession] = None
        self.connected = False
        self._connection_attempts = 0
        self._max_retries = 3
        
    async def connect(self) -> bool:
        """
        Async connection to BeamNG.tech with retry logic and health monitoring
        """
        if not BEAMNGPY_AVAILABLE:
            logger.error("BeamNGpy library not available - install with: pip install beamngpy")
            return False
            
        for attempt in range(self._max_retries):
            try:
                self._connection_attempts += 1
                logger.info(f"Connecting to BeamNG.tech (attempt {attempt + 1}/{self._max_retries})...")
                
                # Run BeamNG connection in thread pool to avoid blocking
                loop = asyncio.get_event_loop()
                self.bng = await loop.run_in_executor(
                    None, 
                    lambda: BeamNGpy(self.host, self.port, home=self.home)
                )
                
                # Open connection with timeout
                await asyncio.wait_for(
                    loop.run_in_executor(None, self.bng.open),
                    timeout=10.0
                )
                
                self.connected = True
                logger.info(f"✅ Connected to BeamNG.tech at {self.host}:{self.port}")
                return True
                
            except asyncio.TimeoutError:
                logger.warning(f"Connection timeout on attempt {attempt + 1}")
                if attempt == self._max_retries - 1:
                    logger.error("Failed to connect: Connection timeout")
                    
            except Exception as e:
                logger.warning(f"Connection failed on attempt {attempt + 1}: {e}")
                if attempt == self._max_retries - 1:
                    logger.error(f"Failed to connect after {self._max_retries} attempts: {e}")
                    
                # Wait before retrying
                if attempt < self._max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    
        return False
    
    async def disconnect(self) -> None:
        """Gracefully disconnect from BeamNG.tech"""
        if self.bng and self.connected:
            try:
                # End current session if active
                if self.current_session:
                    await self.end_session()
                
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, self.bng.close)
                self.connected = False
                logger.info("Disconnected from BeamNG.tech")
                
            except Exception as e:
                logger.error(f"Error disconnecting from BeamNG: {e}")
    
    async def health_check(self) -> Dict[str, Any]:
        """Check BeamNG connection health and system status"""
        status = {
            "connected": self.connected,
            "beamngpy_available": BEAMNGPY_AVAILABLE,
            "connection_attempts": self._connection_attempts,
            "current_session": self.current_session.session_id if self.current_session else None,
            "host": self.host,
            "port": self.port,
            "timestamp": datetime.now().isoformat()
        }
        
        if self.connected and self.bng:
            try:
                # Check if BeamNG is responsive
                loop = asyncio.get_event_loop()
                vehicles_count = await loop.run_in_executor(
                    None, 
                    lambda: len(self.bng.vehicles) if hasattr(self.bng, 'vehicles') else 0
                )
                status["vehicles_loaded"] = vehicles_count
                status["responsive"] = True
                
            except Exception as e:
                logger.warning(f"BeamNG health check failed: {e}")
                status["responsive"] = False
                status["error"] = str(e)
        
        return status
    
    async def load_vw_scenario(self, vehicle_model: str = "tcross", scenario_type: str = "crash_test") -> bool:
        """
        Load VW vehicle scenario with enhanced validation and monitoring
        """
        if not self.connected:
            logger.error("Not connected to BeamNG.tech - call connect() first")
            return False
            
        try:
            # Validate vehicle model
            scenario_config = self._get_vw_scenario_config(vehicle_model, scenario_type)
            if not scenario_config:
                logger.error(f"Unsupported vehicle model or scenario: {vehicle_model}/{scenario_type}")
                return False
            
            logger.info(f"Loading VW {vehicle_model} scenario: {scenario_config['scenario_name']}")
            
            # Load scenario asynchronously
            loop = asyncio.get_event_loop()
            success = await loop.run_in_executor(
                None, 
                self._load_scenario_sync, 
                scenario_config
            )
            
            if success:
                # Create enhanced session tracking
                session_id = f"vw_{vehicle_model}_{scenario_type}_{int(datetime.now().timestamp())}"
                self.current_session = BeamNGSession(
                    session_id=session_id,
                    vehicle_model=vehicle_model,
                    scenario=scenario_config["scenario_name"],
                    start_time=datetime.now()
                )
                
                logger.info(f"✅ VW {vehicle_model} scenario loaded successfully - Session: {session_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to load VW scenario: {e}")
            return False
    
    async def execute_crash_simulation(self, crash_params: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute crash simulation with real-time monitoring
        """
        if not self.current_session:
            raise ValueError("No active session - load a scenario first")
        
        try:
            simulation_start = datetime.now()
            crash_params = crash_params or {"type": "frontal", "speed": 50}
            
            logger.info(f"Executing crash simulation: {crash_params}")
            
            # For now, simulate the crash execution
            # In a real implementation, this would control BeamNG to execute specific crash scenarios
            await asyncio.sleep(2)  # Simulate crash duration
            
            # Mark crash as detected
            self.current_session.crash_detected = True
            
            simulation_result = {
                "simulation_id": f"{self.current_session.session_id}_crash",
                "crash_type": crash_params.get("type", "unknown"),
                "impact_speed": crash_params.get("speed", 0),
                "duration_ms": int((datetime.now() - simulation_start).total_seconds() * 1000),
                "success": True,
                "timestamp": datetime.now().isoformat()
            }
            
            logger.info(f"Crash simulation completed: {simulation_result['simulation_id']}")
            return simulation_result
            
        except Exception as e:
            logger.error(f"Failed to execute crash simulation: {e}")
            raise
    
    async def extract_damage_telemetry(self) -> Optional[BeamNGTelemetry]:
        """
        Extract damage telemetry with component-level analysis
        """
        if not self.connected or not self.current_session:
            logger.error("No active BeamNG session for telemetry extraction")
            return None
            
        try:
            logger.info("Extracting damage telemetry from BeamNG...")
            
            # Extract telemetry in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            raw_telemetry = await loop.run_in_executor(
                None, 
                self._extract_telemetry_sync
            )
            
            if not raw_telemetry:
                logger.warning("No telemetry data available")
                return None
            
            # Process telemetry data
            processed_telemetry = await self._process_telemetry_data(raw_telemetry)
            
            logger.info(f"Telemetry extracted successfully - {len(processed_telemetry.damage_data)} damage points")
            return processed_telemetry
            
        except Exception as e:
            logger.error(f"Failed to extract damage telemetry: {e}")
            return None
    
    async def generate_vw_damage_report(self, telemetry: BeamNGTelemetry) -> DamageReport:
        """
        Generate comprehensive VW-specific damage report
        """
        try:
            logger.info("Generating VW damage report...")
            
            # Analyze damage patterns specific to VW vehicles
            damage_analysis = await self._analyze_vw_damage_patterns(telemetry)
            
            # Map to VW component structure
            vw_components = await self._map_to_vw_components(damage_analysis)
            
            # Calculate VW-specific repair costs
            repair_estimate = await self._calculate_vw_repair_costs(vw_components)
            
            # Generate comprehensive damage report
            damage_report = DamageReport(
                session_id=telemetry.session_id,
                vehicle_model=self.current_session.vehicle_model,
                timestamp=datetime.now(),
                impact_zones=damage_analysis["impact_zones"],
                component_damages=vw_components,
                estimated_cost=repair_estimate["total_cost"],
                repair_complexity=repair_estimate["complexity"],
                vw_parts_required=repair_estimate["parts_list"],
                processing_metadata={
                    "telemetry_points": len(telemetry.damage_data),
                    "analysis_duration_ms": repair_estimate["processing_time"],
                    "vw_model": self.current_session.vehicle_model,
                    "damage_severity": damage_analysis["overall_severity"]
                }
            )
            
            logger.info(f"VW damage report generated - Estimated cost: R$ {repair_estimate['total_cost']:,.2f}")
            return damage_report
            
        except Exception as e:
            logger.error(f"Failed to generate VW damage report: {e}")
            raise
    
    async def end_session(self) -> None:
        """End current session and cleanup"""
        if self.current_session:
            self.current_session.end_time = datetime.now()
            session_duration = (self.current_session.end_time - self.current_session.start_time).total_seconds()
            
            logger.info(f"Ending session {self.current_session.session_id} - Duration: {session_duration:.1f}s")
            self.current_session = None
    
    # Private helper methods
    def _get_vw_scenario_config(self, vehicle_model: str, scenario_type: str) -> Optional[Dict[str, str]]:
        """Get VW scenario configuration"""
        vw_scenarios = {
            "tcross": {
                "crash_test": {
                    "scenario_name": "vw_tcross_crash_test_v2",
                    "beamng_vehicle": "tcross",
                    "map_name": "west_coast_usa",
                    "spawn_position": (-717, 101, 118),
                    "spawn_rotation": (0, 0, 0.3826834, 0.9238795)
                }
            },
            "golf": {
                "crash_test": {
                    "scenario_name": "vw_golf_crash_test_v2",
                    "beamng_vehicle": "golf",
                    "map_name": "west_coast_usa", 
                    "spawn_position": (-500, 200, 120),
                    "spawn_rotation": (0, 0, 0, 1)
                }
            }
        }
        
        return vw_scenarios.get(vehicle_model.lower(), {}).get(scenario_type)
    
    def _load_scenario_sync(self, config: Dict[str, Any]) -> bool:
        """Synchronous scenario loading (runs in thread pool)"""
        try:
            # Create new scenario
            scenario = Scenario(config["map_name"], config["scenario_name"])
            
            # Create VW vehicle with enhanced damage sensors
            vehicle = Vehicle(
                f'vw_{config["beamng_vehicle"]}', 
                model=config["beamng_vehicle"], 
                license=f'VW-{config["beamng_vehicle"].upper()}'
            )
            
            # Add multiple sensors for comprehensive telemetry
            damage_sensor = Damage()
            vehicle.sensors.attach('damage', damage_sensor)
            
            # Add vehicle to scenario with configured position
            scenario.add_vehicle(
                vehicle, 
                pos=config["spawn_position"], 
                rot_quat=config["spawn_rotation"]
            )
            
            # Generate and load scenario
            scenario.make(self.bng)
            self.bng.scenario.load(scenario)
            self.bng.scenario.start()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to load scenario synchronously: {e}")
            return False
    
    def _extract_telemetry_sync(self) -> Optional[Dict[str, Any]]:
        """Synchronous telemetry extraction (runs in thread pool)"""
        try:
            vehicles = self.bng.vehicles
            if not vehicles:
                logger.warning("No vehicles in current scenario")
                return None
                
            vehicle = next(iter(vehicles.values()))
            
            # Poll all sensors
            vehicle.sensors.poll()
            damage_data = vehicle.sensors.get('damage')
            
            if damage_data is None:
                logger.warning("No damage sensor data available")
                return None
            
            # Get comprehensive vehicle state
            vehicle.update_vehicle()
            state_data = {
                "position": vehicle.state.get('pos', (0, 0, 0)),
                "velocity": vehicle.state.get('vel', 0),
                "rotation": vehicle.state.get('rot', (0, 0, 0, 1)),
                "damage_data": damage_data,
                "timestamp": datetime.now()
            }
            
            return state_data
            
        except Exception as e:
            logger.error(f"Failed to extract telemetry synchronously: {e}")
            return None
    
    async def _process_telemetry_data(self, raw_data: Dict[str, Any]) -> BeamNGTelemetry:
        """Process and normalize raw telemetry data"""
        # Normalize damage data format
        normalized_damage = self._normalize_damage_data(raw_data["damage_data"])
        
        telemetry = BeamNGTelemetry(
            session_id=self.current_session.session_id,
            timestamp=raw_data["timestamp"],
            vehicle_position=raw_data["position"],
            vehicle_velocity=raw_data["velocity"],
            damage_data=normalized_damage,
            raw_data=raw_data
        )
        
        return telemetry
    
    def _normalize_damage_data(self, raw_damage: Dict[str, Any]) -> Dict[str, float]:
        """Normalize BeamNG damage data to consistent format"""
        normalized = {}
        
        for component, damage_value in raw_damage.items():
            # Convert damage value to normalized 0.0-1.0 scale
            if isinstance(damage_value, (int, float)):
                normalized_value = max(0.0, min(1.0, float(damage_value)))
                normalized[component] = normalized_value
            elif isinstance(damage_value, dict):
                # Handle complex damage objects
                damage_level = damage_value.get('damage', 0.0)
                normalized[component] = max(0.0, min(1.0, float(damage_level)))
        
        return normalized
    
    async def _analyze_vw_damage_patterns(self, telemetry: BeamNGTelemetry) -> Dict[str, Any]:
        """Analyze damage patterns specific to VW vehicle architecture"""
        # VW-specific component mapping
        vw_component_zones = {
            "front": ["hood", "front_bumper", "headlight", "grille", "front_quarter"],
            "rear": ["trunk", "rear_bumper", "taillight", "rear_quarter"],
            "side_left": ["left_door", "left_mirror", "left_quarter", "left_window"],
            "side_right": ["right_door", "right_mirror", "right_quarter", "right_window"],
            "roof": ["roof", "sunroof", "roof_rail"],
            "underbody": ["chassis", "exhaust", "suspension"]
        }
        
        impact_zones = []
        overall_severity = 0.0
        
        for zone_name, components in vw_component_zones.items():
            zone_damage = 0.0
            affected_components = []
            
            for component in components:
                # Check for component damage (fuzzy matching)
                for damage_key, damage_level in telemetry.damage_data.items():
                    if component.lower() in damage_key.lower():
                        zone_damage = max(zone_damage, damage_level)
                        if damage_level > 0.1:  # Significant damage threshold
                            affected_components.append(damage_key)
            
            if zone_damage > 0.05:  # Zone damage threshold
                impact_zones.append({
                    "zone": zone_name,
                    "severity": zone_damage,
                    "affected_components": affected_components,
                    "vw_impact_type": self._classify_vw_impact_type(zone_name, zone_damage)
                })
                
                overall_severity = max(overall_severity, zone_damage)
        
        return {
            "impact_zones": impact_zones,
            "overall_severity": overall_severity,
            "damage_distribution": self._calculate_damage_distribution(impact_zones)
        }
    
    def _classify_vw_impact_type(self, zone: str, severity: float) -> str:
        """Classify impact type for VW-specific repair procedures"""
        if severity < 0.2:
            return "minor_cosmetic"
        elif severity < 0.5:
            return "moderate_structural" 
        elif severity < 0.8:
            return "major_structural"
        else:
            return "critical_safety"
    
    def _calculate_damage_distribution(self, impact_zones: List[Dict]) -> Dict[str, float]:
        """Calculate damage distribution across vehicle zones"""
        total_zones = len(impact_zones) if impact_zones else 1
        
        distribution = {
            "front_impact": 0.0,
            "rear_impact": 0.0, 
            "side_impact": 0.0,
            "multiple_impact": 0.0
        }
        
        front_zones = ["front"]
        rear_zones = ["rear"]
        side_zones = ["side_left", "side_right"]
        
        front_damage = any(zone["zone"] in front_zones for zone in impact_zones)
        rear_damage = any(zone["zone"] in rear_zones for zone in impact_zones)
        side_damage = any(zone["zone"] in side_zones for zone in impact_zones)
        
        impact_count = sum([front_damage, rear_damage, side_damage])
        
        if impact_count > 1:
            distribution["multiple_impact"] = 1.0
        elif front_damage:
            distribution["front_impact"] = 1.0
        elif rear_damage:
            distribution["rear_impact"] = 1.0
        elif side_damage:
            distribution["side_impact"] = 1.0
        
        return distribution
    
    async def _map_to_vw_components(self, damage_analysis: Dict) -> List[ComponentDamage]:
        """Map damage to VW-specific component structure"""
        vw_components = []
        
        # VW parts catalog mapping
        vw_parts_map = {
            "hood": {"part_code": "VW-HOOD-001", "category": "body_panel"},
            "front_bumper": {"part_code": "VW-FBMP-001", "category": "bumper"},
            "headlight": {"part_code": "VW-HDLT-001", "category": "lighting"},
            "door": {"part_code": "VW-DOOR-001", "category": "body_panel"},
            "trunk": {"part_code": "VW-TRNK-001", "category": "body_panel"}
        }
        
        for zone in damage_analysis["impact_zones"]:
            for component_name in zone["affected_components"]:
                # Map to VW component structure
                vw_part = self._map_component_to_vw_part(component_name, vw_parts_map)
                
                component_damage = ComponentDamage(
                    component_id=component_name,
                    damage_level=zone["severity"],
                    damage_type=DamageType.STRUCTURAL if zone["severity"] > 0.5 else DamageType.COSMETIC,
                    vw_part_number=vw_part["part_code"],
                    repair_category=vw_part["category"]
                )
                
                vw_components.append(component_damage)
        
        return vw_components
    
    def _map_component_to_vw_part(self, component_name: str, parts_map: Dict) -> Dict[str, str]:
        """Map BeamNG component to VW part number"""
        # Fuzzy matching for VW parts
        for vw_part, part_info in parts_map.items():
            if vw_part.lower() in component_name.lower():
                return part_info
        
        # Default fallback
        return {"part_code": "VW-MISC-001", "category": "miscellaneous"}
    
    async def _calculate_vw_repair_costs(self, components: List[ComponentDamage]) -> Dict[str, Any]:
        """Calculate repair costs using VW parts pricing"""
        start_time = datetime.now()
        
        # VW Brazil pricing (in Reais)
        vw_pricing = {
            "body_panel": {"base_cost": 1200.0, "labor_hours": 4.0},
            "bumper": {"base_cost": 800.0, "labor_hours": 2.5},
            "lighting": {"base_cost": 450.0, "labor_hours": 1.5},
            "miscellaneous": {"base_cost": 300.0, "labor_hours": 1.0}
        }
        
        labor_rate_brl = 85.0  # Brazilian labor rate per hour
        
        total_parts_cost = 0.0
        total_labor_hours = 0.0
        parts_list = []
        
        for component in components:
            category = getattr(component, 'repair_category', 'miscellaneous')
            pricing = vw_pricing.get(category, vw_pricing["miscellaneous"])
            
            # Calculate cost based on damage severity
            damage_multiplier = getattr(component, 'damage_level', 0.5)
            part_cost = pricing["base_cost"] * damage_multiplier
            labor_hours = pricing["labor_hours"] * damage_multiplier
            
            total_parts_cost += part_cost
            total_labor_hours += labor_hours
            
            parts_list.append({
                "component": getattr(component, 'component_id', 'unknown'),
                "vw_part_number": getattr(component, 'vw_part_number', 'VW-MISC-001'),
                "category": category,
                "estimated_cost_brl": round(part_cost, 2),
                "labor_hours": round(labor_hours, 2),
                "damage_severity": round(damage_multiplier, 2)
            })
        
        total_labor_cost = total_labor_hours * labor_rate_brl
        total_cost = total_parts_cost + total_labor_cost
        
        # Determine complexity
        complexity = "low"
        if total_cost > 5000:
            complexity = "high"
        elif total_cost > 2000:
            complexity = "medium"
        
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        return {
            "parts_cost_brl": round(total_parts_cost, 2),
            "labor_cost_brl": round(total_labor_cost, 2),
            "total_cost": round(total_cost, 2),
            "labor_hours": round(total_labor_hours, 2),
            "complexity": complexity,
            "parts_list": parts_list,
            "processing_time": processing_time
        }