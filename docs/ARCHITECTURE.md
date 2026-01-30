# VW Crash-to-Repair Simulator - System Architecture

## Overview

The VW Brand Day Crash-to-Repair Experience is built as a modular Python application with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   BeamNG.tech   │────│  Damage Engine  │────│   Parts Engine  │
│   Simulator     │    │  (Telemetry)    │    │   (Ontology)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │────│   API Gateway   │────│ Dealer Network  │
│     (React)     │    │   (FastAPI)     │    │   & Inventory   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │Invoice Generator│
                       │   & Pricing     │
                       └─────────────────┘
```

## Core Components

### 1. BeamNG Integration (`src/beamng/`)

**Purpose**: Interface with BeamNG.tech to capture vehicle damage data

**Key Modules**:
- `simulator.py` - BeamNGpy wrapper and session management
- `telemetry.py` - Damage data extraction and normalization  
- `triggers.py` - "Repair My Car" workflow triggers
- `models.py` - Vehicle model management (T-Cross, Golf)

**Data Flow**:
1. Monitor BeamNG.tech for crash events
2. Extract damage telemetry on race completion
3. Normalize damage data into standard format
4. Trigger repair workflow in main application

### 2. Parts Ontology & Mapping (`src/parts/`)

**Purpose**: Map vehicle damage to VW parts and pricing

**Key Modules**:
- `ontology.py` - Vehicle → Assembly → Parts hierarchy
- `mapping.py` - Damage → Parts logic engine
- `pricing.py` - Parts cost calculation
- `database.py` - Parts data access layer

**Knowledge Structure**:
```
Vehicle Model (T-Cross, Golf)
├── Assemblies (Front End, Body, Engine, etc.)
│   ├── Components (Bumper, Fender, Hood, etc.)
│   │   ├── Parts (Part Numbers, Names, Prices)
│   │   └── Labor (Hours, Rates)
```

### 3. Dealer Network (`src/dealers/`)

**Purpose**: Manage VW dealer directory and inventory simulation

**Key Modules**:
- `network.py` - Dealer directory and filtering
- `inventory.py` - Parts availability simulation
- `optimization.py` - Cross-dealer parts transfer logic
- `appointments.py` - Booking simulation

### 4. Invoice Generation (`src/invoicing/`)

**Purpose**: Generate repair estimates and invoices

**Key Modules**:
- `calculator.py` - Cost calculation engine
- `generator.py` - Invoice document creation
- `templates.py` - Invoice formatting and presentation

### 5. API Layer (`src/api/`)

**Purpose**: REST API for frontend communication

**Endpoints**:
- `POST /api/damage/analyze` - Process damage telemetry
- `GET /api/parts/estimate/{damage_id}` - Get repair estimate
- `GET /api/dealers/search` - Find dealers by location
- `POST /api/appointments/book` - Schedule repair appointment
- `GET /api/invoice/{appointment_id}` - Retrieve final invoice

### 6. Web Frontend (`src/frontend/`)

**Purpose**: User interface for crash-to-repair workflow

**Key Views**:
- **Landing** - Waiting for crash data
- **Damage Summary** - Visual damage assessment
- **Repair Estimate** - Parts list and pricing
- **Dealer Selection** - Choose repair location
- **Appointment Confirmation** - Final booking details

## Data Models

### Damage Report
```python
@dataclass
class DamageReport:
    vehicle_model: str
    session_id: str
    crash_timestamp: datetime
    components: List[ComponentDamage]
    severity_score: float
```

### Component Damage
```python
@dataclass
class ComponentDamage:
    component_name: str  # "front_bumper", "left_fender"
    damage_level: float  # 0.0 to 1.0
    damage_type: str     # "impact", "scratch", "destroyed"
    location: Tuple[float, float, float]  # 3D coordinates
```

### Parts Requirement
```python
@dataclass
class PartsRequirement:
    part_number: str
    part_name: str
    quantity: int
    unit_price: Decimal
    category: str  # "body", "mechanical", "electrical"
    labor_hours: float
```

### Repair Estimate
```python
@dataclass
class RepairEstimate:
    estimate_id: str
    vehicle_model: str
    damage_report_id: str
    parts: List[PartsRequirement]
    labor_total: Decimal
    parts_total: Decimal
    tax: Decimal
    grand_total: Decimal
    estimated_duration: timedelta
```

## Technology Choices

### Backend Stack
- **Python 3.9+** - Main language
- **FastAPI** - Async REST API framework
- **Pydantic** - Data validation and serialization
- **SQLAlchemy** - Database abstraction (for future persistence)
- **BeamNGpy** - Official BeamNG.tech Python API

### Frontend Stack
- **HTML5/CSS3/JavaScript** - Core web technologies
- **Fetch API** - HTTP client for API communication
- **CSS Grid/Flexbox** - Responsive layouts
- **Chart.js** - Damage visualization (optional)

### Data Storage
- **JSON Files** - Development/demo data (parts, dealers)
- **In-Memory** - Runtime state (damage reports, estimates)
- **Future**: PostgreSQL for production persistence

## Deployment Architecture

### Event Day Setup (Local)
```
┌─────────────────────────────────────────────────────────────┐
│                    Event Machine (Windows/Linux)             │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────────┐  │
│  │   BeamNG.tech   │    │  VW Crash-to-Repair App        │  │
│  │   Simulator     │    │                                 │  │
│  │                 │    │  ┌─────────────┐ ┌─────────────┐ │  │
│  │  - T-Cross      │────│  │   Backend   │ │  Frontend   │ │  │
│  │  - Golf         │    │  │   :8000     │ │   :8080     │ │  │
│  │  - Custom Maps  │    │  └─────────────┘ └─────────────┘ │  │
│  └─────────────────┘    └─────────────────────────────────┘  │
│                                      │                      │
│                                      ▼                      │
│                         ┌─────────────────────────────────┐  │
│                         │        Big Screen Display       │  │
│                         │      (Browser: :8080)         │  │
│                         └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Development Setup
- **Local BeamNG.tech** instance
- **Python virtual environment**
- **Hot reload** for rapid development
- **Mock data** for parts and dealers

## Security Considerations

### Demo Environment
- **Local-only hosting** - No external internet required
- **Stub authentication** - Demo accounts only
- **Mock data** - No real VW proprietary information
- **Isolated network** - Event machine not connected to production systems

### Future Production
- **OAuth 2.0** - VW SSO integration
- **HTTPS/TLS** - Encrypted communications  
- **API rate limiting** - Protect against abuse
- **Data encryption** - Sensitive parts/pricing data
- **Audit logging** - Track all repair estimates

## Performance Requirements

### Event Day Targets
- **Crash → Estimate**: ≤ 3-5 seconds end-to-end
- **UI Responsiveness**: ≤ 100ms interactions
- **Concurrent Sessions**: Support 5-10 simultaneous demos
- **Uptime**: 8+ hours continuous operation

### Optimization Strategies
- **Async processing** - Non-blocking damage analysis
- **Caching** - Pre-load parts database and dealer data
- **Connection pooling** - Reuse BeamNG connections
- **Graceful degradation** - Fallback to cached estimates if BeamNG fails

## Integration Points

### BeamNG.tech Integration
- **BeamNGpy library** - Official Python API
- **WebSocket** - Real-time telemetry (future)
- **File export** - CSV/JSON damage reports (fallback)
- **Custom lua scripts** - In-game "Repair My Car" button (optional)

### VW Data Integration (Future)
- **GCP BigQuery** - Parts catalog and pricing
- **SAP integration** - Real dealer inventory
- **VW APIs** - Appointment scheduling
- **Dealer portals** - Direct booking integration

## Error Handling & Recovery

### Critical Failure Points
1. **BeamNG.tech crashes** → Restart simulator, use cached damage data
2. **Telemetry extraction fails** → Manual damage input fallback
3. **Parts mapping errors** → Show generic estimate with manual override
4. **API server crashes** → Restart services, maintain session state
5. **Frontend freezes** → Browser refresh, restore session via URL

### Monitoring & Alerting
- **Health check endpoints** - `/api/health`, `/api/beamng/status`
- **Error logging** - Structured logs with correlation IDs
- **Performance metrics** - Response times, success rates
- **Manual oversight** - Event staff monitoring dashboard

## Future Enhancements

### Phase 2 - Production Features
- **Real-time telemetry** - Live damage updates during crash
- **ML damage recognition** - Computer vision for damage assessment  
- **Advanced optimization** - Multi-objective dealer/parts routing
- **Customer portal** - Post-crash customer experience
- **Insurance integration** - Automated claims processing

### Phase 3 - Business Intelligence  
- **Analytics dashboard** - Crash patterns, parts demand forecasting
- **Inventory optimization** - Predictive parts stocking
- **Connected car integration** - Automatic crash detection and reporting
- **Mobile app** - Customer self-service repair estimates