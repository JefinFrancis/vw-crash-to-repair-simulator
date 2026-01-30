# VW Crash-to-Repair Simulator
# Core data models based on domain specification

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Optional, Tuple, Any
from enum import Enum

# ============================================================================
# Vehicle Domain Models
# ============================================================================

@dataclass
class Component:
    component_id: str       # "front_bumper", "left_headlight"
    name: str              # "Front Bumper"
    assembly_id: str       # Foreign key to assembly
    repairability: float   # 0.0 = replace only, 1.0 = fully repairable

@dataclass
class Assembly:
    assembly_id: str        # "front_end", "body_rear", "interior"
    name: str              # "Front End Assembly"
    category: str          # "body", "mechanical", "electrical"
    components: List[Component] = field(default_factory=list)

@dataclass
class VehicleModel:
    model_id: str          # "vw_tcross_2024", "vw_golf_mk8"
    brand: str             # "Volkswagen"
    model_name: str        # "T-Cross", "Golf"
    year: int              # 2024
    variant: str           # "Comfortline", "R-Line"
    beamng_model: str      # BeamNG internal model name
    assemblies: List[Assembly] = field(default_factory=list)

# ============================================================================
# Parts Domain Models
# ============================================================================

class PartCategory(Enum):
    BODY_EXTERIOR = "body_exterior"
    BODY_INTERIOR = "body_interior"
    MECHANICAL = "mechanical"
    ELECTRICAL = "electrical"
    CONSUMABLES = "consumables"

@dataclass
class PartAvailability:
    in_stock: bool
    lead_time_days: int
    supplier: str
    alternative_parts: List[str] = field(default_factory=list)

@dataclass
class Part:
    part_number: str        # "5NA807221AGRU" (VW part number)
    name: str              # "Front Bumper Cover"
    description: str       # "T-Cross front bumper, unpainted"
    category: PartCategory
    component_id: str      # Which component this part belongs to
    price: Decimal         # Current VW retail price
    currency: str          # "BRL", "USD", "EUR"
    availability: PartAvailability
    specifications: Dict[str, Any] = field(default_factory=dict)

# ============================================================================
# Damage Domain Models  
# ============================================================================

class DamageType(Enum):
    DEFORMATION = "deformation"
    CRACKING = "cracking"
    DETACHMENT = "detachment"
    SCRATCHING = "scratching"
    DESTRUCTION = "destruction"

@dataclass
class ComponentDamage:
    component_id: str       # Reference to vehicle component
    damage_level: float     # 0.0-1.0 severity
    damage_type: DamageType
    repairable: bool        # Can be repaired vs must replace
    estimated_repair_time: timedelta
    confidence: float = 1.0  # AI confidence in damage assessment

@dataclass
class ImpactZone:
    zone_id: str            # "front_center", "left_side", "rear_right"
    severity: float         # 0.0 = no damage, 1.0 = total destruction
    impact_type: str        # "collision", "rollover", "side_impact"
    affected_components: List[ComponentDamage] = field(default_factory=list)

@dataclass
class EnvironmentalContext:
    impact_speed: float     # km/h
    impact_angle: float     # degrees
    surface_type: str       # "asphalt", "concrete", "gravel"
    weather_conditions: str # "dry", "wet", "icy"

@dataclass
class DamageReport:
    report_id: str          # Unique identifier
    session_id: str         # BeamNG session reference
    vehicle_model_id: str   # Which vehicle was damaged
    timestamp: datetime
    crash_severity: float   # Overall severity score (0.0-1.0)
    impact_zones: List[ImpactZone] = field(default_factory=list)
    environmental_factors: Optional[EnvironmentalContext] = None

# ============================================================================
# Repair Domain Models
# ============================================================================

class RepairOperation(Enum):
    REPLACE = "replace"
    REPAIR = "repair"
    PAINT = "paint"
    REALIGN = "realign"
    CALIBRATE = "calibrate"

class RepairUrgency(Enum):
    CRITICAL = "critical"      # Safety-related, must fix
    RECOMMENDED = "recommended" # Important for proper operation
    OPTIONAL = "optional"      # Cosmetic or minor issues

@dataclass
class RepairLineItem:
    item_id: str
    part_number: str        # Reference to Part
    operation: RepairOperation
    quantity: int
    unit_price: Decimal
    labor_hours: float
    total_cost: Decimal
    urgency: RepairUrgency
    description: str = ""

@dataclass
class LaborSummary:
    total_hours: float
    hourly_rate: Decimal
    complexity_multiplier: float  # 1.0 = standard, >1.0 = complex
    total_labor_cost: Decimal

@dataclass
class CostSummary:
    parts_subtotal: Decimal
    labor_subtotal: Decimal
    paint_materials: Decimal
    tax_rate: float
    tax_amount: Decimal
    grand_total: Decimal
    currency: str

@dataclass
class RepairTimeline:
    estimated_start: datetime
    estimated_completion: datetime
    critical_path_items: List[str] = field(default_factory=list)  # Part numbers on critical path

@dataclass
class RepairEstimate:
    estimate_id: str
    damage_report_id: str
    vehicle_model_id: str
    created_at: datetime
    line_items: List[RepairLineItem] = field(default_factory=list)
    labor_summary: Optional[LaborSummary] = None
    cost_summary: Optional[CostSummary] = None
    repair_timeline: Optional[RepairTimeline] = None

# ============================================================================
# Dealer Domain Models
# ============================================================================

@dataclass
class DealerLocation:
    address: str
    city: str
    state: str              # "SP", "RJ", "MG"
    postal_code: str
    latitude: float
    longitude: float
    service_radius_km: float

@dataclass
class ContactInfo:
    phone: str
    email: str
    website: Optional[str] = None

@dataclass
class ServiceCapacity:
    max_concurrent_jobs: int
    current_workload: int
    average_completion_time: timedelta
    next_available_slot: datetime

@dataclass
class InventoryItem:
    part_number: str
    quantity_on_hand: int
    quantity_reserved: int
    quantity_available: int
    last_restocked: datetime
    reorder_point: int

@dataclass
class DealerInventory:
    dealer_id: str
    last_updated: datetime
    stock_items: List[InventoryItem] = field(default_factory=list)

@dataclass
class Dealer:
    dealer_id: str          # "VW_SP_001", "VW_RJ_042"
    name: str               # "Volkswagen São Paulo Centro"
    brand: str              # "Volkswagen"
    dealer_type: str        # "authorized", "certified", "service_only"
    location: DealerLocation
    contact: ContactInfo
    services: List[str]     # ["sales", "service", "parts", "bodyshop"]
    specializations: List[str]  # ["collision_repair", "paint", "electrical"]
    capacity: ServiceCapacity
    inventory: Optional[DealerInventory] = None

# ============================================================================
# Appointment Domain Models
# ============================================================================

class AppointmentStatus(Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

@dataclass
class CustomerInfo:
    customer_id: str
    name: str
    email: str
    phone: str
    preferred_contact: str  # "email", "sms", "phone"

@dataclass
class VehicleInfo:
    vin: Optional[str]      # Vehicle identification number
    model_id: str           # Reference to VehicleModel
    year: int
    color: str
    license_plate: str

@dataclass
class AppointmentScheduling:
    scheduled_date: datetime
    estimated_duration: timedelta
    service_advisor: str
    bay_assignment: str     # "Bay 3", "Paint Booth A"
    special_instructions: str = ""

@dataclass
class StatusChange:
    timestamp: datetime
    old_status: AppointmentStatus
    new_status: AppointmentStatus
    notes: str = ""

@dataclass
class ServiceAppointment:
    appointment_id: str
    estimate_id: str        # Reference to repair estimate
    dealer_id: str          # Which dealer will perform work
    customer: CustomerInfo
    vehicle: VehicleInfo
    scheduling: AppointmentScheduling
    status: AppointmentStatus
    status_history: List[StatusChange] = field(default_factory=list)

# ============================================================================
# BeamNG Integration Models
# ============================================================================

@dataclass
class BeamNGSession:
    session_id: str
    vehicle_model: str
    scenario: str
    start_time: datetime
    end_time: Optional[datetime] = None
    crash_detected: bool = False

@dataclass
class BeamNGTelemetry:
    session_id: str
    timestamp: datetime
    vehicle_position: Tuple[float, float, float]
    vehicle_velocity: float
    damage_data: Dict[str, float]  # Component ID -> damage level
    raw_data: Dict[str, Any] = field(default_factory=dict)  # Raw BeamNG data

# ============================================================================
# API Response Models
# ============================================================================

@dataclass
class APIResponse:
    success: bool
    message: str
    data: Optional[Any] = None
    error_code: Optional[str] = None

@dataclass
class DamageAnalysisResponse(APIResponse):
    damage_report: Optional[DamageReport] = None
    processing_time_ms: Optional[int] = None

@dataclass
class RepairEstimateResponse(APIResponse):
    estimate: Optional[RepairEstimate] = None
    alternative_options: List[RepairEstimate] = field(default_factory=list)

@dataclass
class DealerSearchResponse(APIResponse):
    dealers: List[Dealer] = field(default_factory=list)
    search_criteria: Dict[str, Any] = field(default_factory=dict)