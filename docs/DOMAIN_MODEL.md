# VW Crash-to-Repair Simulator - Domain Model

## Overview

This document defines the data models, ontologies, and knowledge structures for the VW Brand Day Crash-to-Repair Experience.

## Core Entities

### 1. Vehicle Domain

#### Vehicle Model
```python
@dataclass
class VehicleModel:
    model_id: str           # "vw_tcross_2024", "vw_golf_mk8"
    brand: str              # "Volkswagen"
    model_name: str         # "T-Cross", "Golf"
    year: int               # 2024
    variant: str            # "Comfortline", "R-Line"
    beamng_model: str       # BeamNG internal model name
    assemblies: List[Assembly]
    
class Assembly:
    assembly_id: str        # "front_end", "body_rear", "interior"
    name: str               # "Front End Assembly"
    category: str           # "body", "mechanical", "electrical"
    components: List[Component]

class Component:
    component_id: str       # "front_bumper", "left_headlight"
    name: str               # "Front Bumper"
    assembly_id: str        # Foreign key to assembly
    parts: List[Part]
    repairability: float    # 0.0 = replace only, 1.0 = fully repairable
```

### 2. Parts Domain

#### Parts Catalog
```python
@dataclass
class Part:
    part_number: str        # "5NA807221AGRU" (VW part number)
    name: str               # "Front Bumper Cover"
    description: str        # "T-Cross front bumper, unpainted"
    category: str           # "body_exterior", "mechanical", "electrical"
    component_id: str       # Which component this part belongs to
    price: Decimal          # Current VW retail price
    currency: str           # "BRL", "USD", "EUR"
    availability: PartAvailability
    specifications: Dict[str, Any]  # Technical specs
    
class PartAvailability:
    in_stock: bool
    lead_time_days: int
    supplier: str
    alternative_parts: List[str]  # Compatible part numbers
```

#### Parts Ontology
```
VW Parts Hierarchy:
├── Body Parts
│   ├── Exterior
│   │   ├── Bumpers (Front, Rear)
│   │   ├── Fenders (Left, Right, Front, Rear)
│   │   ├── Doors (Front Left/Right, Rear Left/Right)
│   │   ├── Hood & Trunk
│   │   └── Glass (Windshield, Windows, Mirrors)
│   └── Interior
│       ├── Dashboard Components
│       ├── Seats & Trim
│       └── Safety Systems (Airbags, Seatbelts)
├── Mechanical Parts
│   ├── Engine Components
│   ├── Transmission Parts
│   ├── Suspension Systems
│   ├── Brake Components
│   └── Exhaust Systems
├── Electrical Parts
│   ├── Lighting (Headlights, Taillights, Indicators)
│   ├── Control Units (ECUs)
│   ├── Wiring Harnesses
│   └── Sensors & Actuators
└── Consumables
    ├── Fluids (Oil, Coolant, Brake Fluid)
    ├── Filters (Air, Oil, Fuel)
    └── Wear Items (Brake Pads, Wiper Blades)
```

### 3. Damage Domain

#### Damage Assessment
```python
@dataclass
class DamageReport:
    report_id: str          # Unique identifier
    session_id: str         # BeamNG session reference
    vehicle_model_id: str   # Which vehicle was damaged
    timestamp: datetime     # When crash occurred
    crash_severity: float   # Overall severity score (0.0-1.0)
    impact_zones: List[ImpactZone]
    environmental_factors: EnvironmentalContext
    
class ImpactZone:
    zone_id: str            # "front_center", "left_side", "rear_right"
    severity: float         # 0.0 = no damage, 1.0 = total destruction
    impact_type: str        # "collision", "rollover", "side_impact"
    affected_components: List[ComponentDamage]
    
class ComponentDamage:
    component_id: str       # Reference to vehicle component
    damage_level: float     # 0.0-1.0 severity
    damage_type: DamageType # "deformation", "cracking", "detachment"
    repairable: bool        # Can be repaired vs must replace
    estimated_repair_time: timedelta
    
class EnvironmentalContext:
    impact_speed: float     # km/h
    impact_angle: float     # degrees
    surface_type: str       # "asphalt", "concrete", "gravel"
    weather_conditions: str # "dry", "wet", "icy"
```

### 4. Repair Domain

#### Repair Estimate
```python
@dataclass
class RepairEstimate:
    estimate_id: str
    damage_report_id: str
    vehicle_model_id: str
    created_at: datetime
    line_items: List[RepairLineItem]
    labor_summary: LaborSummary
    cost_summary: CostSummary
    repair_timeline: RepairTimeline
    
class RepairLineItem:
    item_id: str
    part_number: str        # Reference to Part
    operation: str          # "replace", "repair", "paint"
    quantity: int
    unit_price: Decimal
    labor_hours: float
    total_cost: Decimal
    urgency: str           # "critical", "recommended", "optional"
    
class LaborSummary:
    total_hours: float
    hourly_rate: Decimal
    complexity_multiplier: float  # 1.0 = standard, >1.0 = complex
    total_labor_cost: Decimal
    
class CostSummary:
    parts_subtotal: Decimal
    labor_subtotal: Decimal
    paint_materials: Decimal
    tax_rate: float
    tax_amount: Decimal
    grand_total: Decimal
    currency: str
    
class RepairTimeline:
    estimated_start: datetime
    estimated_completion: datetime
    critical_path_items: List[str]  # Part numbers on critical path
    dependencies: List[Dependency]
```

### 5. Dealer Domain

#### Dealer Network
```python
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
    inventory: DealerInventory
    
class DealerLocation:
    address: str
    city: str
    state: str              # "SP", "RJ", "MG"
    postal_code: str
    latitude: float
    longitude: float
    service_radius_km: float
    
class ServiceCapacity:
    max_concurrent_jobs: int
    current_workload: int
    average_completion_time: timedelta
    next_available_slot: datetime
    
class DealerInventory:
    dealer_id: str
    last_updated: datetime
    stock_items: List[InventoryItem]
    
class InventoryItem:
    part_number: str
    quantity_on_hand: int
    quantity_reserved: int
    quantity_available: int
    last_restocked: datetime
    reorder_point: int
    supplier_lead_time: int
```

### 6. Appointment Domain

#### Service Appointment
```python
@dataclass
class ServiceAppointment:
    appointment_id: str
    estimate_id: str        # Reference to repair estimate
    dealer_id: str          # Which dealer will perform work
    customer: CustomerInfo
    vehicle: VehicleInfo
    scheduling: AppointmentScheduling
    status: AppointmentStatus
    invoice: ServiceInvoice  # Generated after completion
    
class CustomerInfo:
    customer_id: str
    name: str
    email: str
    phone: str
    preferred_contact: str  # "email", "sms", "phone"
    
class AppointmentScheduling:
    scheduled_date: datetime
    estimated_duration: timedelta
    service_advisor: str
    bay_assignment: str     # "Bay 3", "Paint Booth A"
    special_instructions: str
    
class AppointmentStatus:
    current_status: str     # "scheduled", "in_progress", "completed"
    status_history: List[StatusChange]
    estimated_completion: datetime
    actual_completion: Optional[datetime]
```

## Knowledge Graph Relationships

### Entity Relationships
```
Vehicle Model ──has_many──→ Assembly
Assembly ──has_many──→ Component  
Component ──has_many──→ Part
Component ──can_have──→ ComponentDamage
ComponentDamage ──requires──→ RepairLineItem
RepairLineItem ──references──→ Part
Part ──stocked_at──→ Dealer
Dealer ──can_perform──→ RepairEstimate
RepairEstimate ──becomes──→ ServiceAppointment
ServiceAppointment ──generates──→ ServiceInvoice
```

### Business Rules

#### Damage Assessment Rules
1. **Total Loss Threshold**: If crash_severity > 0.8, recommend total loss
2. **Critical Safety**: Damage to safety systems (airbags, seatbelts) = mandatory replacement
3. **Structural Integrity**: Frame damage requires certified bodyshop
4. **Paint Requirements**: Any body panel replacement requires paint matching

#### Parts Selection Rules  
1. **OEM Priority**: Always prefer original VW parts for warranty compliance
2. **Compatibility**: Only use parts certified for specific model year/variant
3. **Availability**: If OEM unavailable, suggest compatible alternatives with customer approval
4. **Quality Grades**: Offer premium/standard/economy options where applicable

#### Dealer Assignment Rules
1. **Proximity**: Prefer dealers within 50km of customer location
2. **Specialization**: Match repair requirements to dealer capabilities
3. **Capacity**: Only suggest dealers with availability within acceptable timeframe  
4. **Inventory**: Prioritize dealers with required parts in stock
5. **Customer Preference**: Respect customer's preferred dealer if available

#### Pricing Rules
1. **Regional Pricing**: Apply correct price list for dealer location
2. **Labor Rates**: Use local market rates adjusted for dealer tier
3. **Tax Calculation**: Apply correct tax rates for jurisdiction
4. **Discounts**: Apply applicable VW warranty/goodwill discounts
5. **Currency**: Always quote in customer's local currency

## Data Validation & Constraints

### Business Constraints
- **Part Numbers**: Must follow VW format (e.g., "5NA807221AGRU")
- **Price Ranges**: Parts prices must be within realistic bounds for category
- **Geographic Limits**: Dealer assignments limited to same country/region
- **Appointment Windows**: Service appointments only during business hours
- **Inventory Levels**: Cannot reserve more parts than available

### Data Quality Rules
- **Mandatory Fields**: All entities must have required fields populated
- **Referential Integrity**: Foreign keys must reference valid entities  
- **Temporal Consistency**: Timestamps must be logically ordered
- **Numerical Bounds**: Percentages (0-1), currencies (positive), quantities (non-negative)
- **Enumeration Values**: Status fields must use predefined valid values

## Extension Points

### Future Enhancements
1. **Insurance Integration**: Add InsuranceClaim entity linking to DamageReport
2. **Customer History**: Track repeat customers and service history  
3. **Warranty Tracking**: Link parts to warranty coverage and claims
4. **Supply Chain**: Model parts suppliers and logistics networks
5. **Quality Metrics**: Track dealer performance and customer satisfaction
6. **Predictive Analytics**: ML models for demand forecasting and optimization

### API Evolution
- **Versioning Strategy**: Semantic versioning for all data schemas
- **Backward Compatibility**: Maintain previous versions during transitions
- **Migration Scripts**: Automated data transformation between schema versions
- **Documentation**: Auto-generated API docs from data models