# VW Crash-to-Repair Simulator - Developer Guide

> **For AI Agents**: This document contains comprehensive project context, setup instructions, and technical details. Read this entire document before making any changes to understand the architecture, conventions, and current state of the project.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Getting Started](#getting-started)
6. [Project Structure](#project-structure)
7. [Running the Application](#running-the-application)
8. [API Reference](#api-reference)
9. [Frontend Development](#frontend-development)
10. [Backend Development](#backend-development)
11. [BeamNG Integration](#beamng-integration)
12. [Database](#database)
13. [Testing](#testing)
14. [Troubleshooting](#troubleshooting)
15. [AI Agent Context](#ai-agent-context)

---

## 🎯 Project Overview

The **VW Crash-to-Repair Simulator** is a full-stack application that integrates with BeamNG.drive to:

1. **Detect vehicle crashes** in BeamNG.drive game via Lua mod
2. **Analyze damage** from crash telemetry data
3. **Generate repair estimates** with VW parts catalog
4. **Find nearby dealers** for repair services
5. **Book service appointments** at VW dealerships

### Business Flow

```
User plays BeamNG → Crashes vehicle → Lua mod detects crash → 
Sends data to backend → Backend analyzes damage → 
Frontend shows repair estimate → User selects dealer → 
Books appointment
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HOST MACHINE                                     │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    BeamNG.drive (Game)                              │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  VW Damage Reporter Mod (Lua)                                │  │ │
│  │  │  - Monitors damage state                                     │  │ │
│  │  │  - Detects crashes                                           │  │ │
│  │  │  - Sends HTTP POST to backend                                │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                 │                                        │
│                                 │ HTTP POST (port 8000)                  │
│                                 ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    Docker Compose Stack                             │ │
│  │                                                                     │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────┐     │ │
│  │  │  Frontend   │  │   Backend   │  │ Postgres │  │  Redis   │     │ │
│  │  │  (React)    │  │  (FastAPI)  │  │          │  │          │     │ │
│  │  │  Port 3000  │  │  Port 8000  │  │ Port 5432│  │ Port 6379│     │ │
│  │  └─────────────┘  └─────────────┘  └──────────┘  └──────────┘     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 5.x | Build Tool |
| Tailwind CSS | 3.x | Styling |
| Zustand | 4.x | State Management |
| TanStack Query | 5.x | Server State |
| Framer Motion | 10.x | Animations |
| React Router | 6.x | Routing |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11 | Runtime |
| FastAPI | 0.109+ | Web Framework |
| SQLAlchemy | 2.0 | ORM |
| Alembic | 1.13+ | Migrations |
| Pydantic | 2.x | Validation |
| structlog | 24.x | Logging |
| asyncpg | 0.29+ | Async Postgres |

### Infrastructure
| Technology | Version | Purpose |
|------------|---------|---------|
| Docker | 24+ | Containerization |
| Docker Compose | 2.x | Orchestration |
| PostgreSQL | 15 | Database |
| Redis | 7 | Caching |

### BeamNG Integration
| Technology | Purpose |
|------------|---------|
| Lua Mod | In-game crash detection |
| BeamNGpy | Python API (fallback) |
| HTTP/REST | Communication protocol |

---

## 📦 Prerequisites

Before setting up, ensure you have:

### Required Software

```bash
# Check Docker
docker --version      # Required: 24.0+
docker compose version # Required: 2.0+

# Check Git
git --version         # Required: 2.0+

# Optional: Node.js (for local frontend dev)
node --version        # Optional: 18.0+
npm --version         # Optional: 9.0+

# Optional: Python (for local backend dev)
python3 --version     # Optional: 3.11+
```

### System Requirements

- **OS**: Linux (Ubuntu 20.04+), macOS, or Windows with WSL2
- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 10GB free space
- **Ports**: 3000, 8000, 5432, 6379 must be available

---

## 🚀 Getting Started

### Step 1: Clone the Repository

```bash
# Clone via HTTPS
git clone https://github.com/JefinFrancis/vw-crash-to-repair-simulator.git

# OR clone via SSH
git clone git@github.com:JefinFrancis/vw-crash-to-repair-simulator.git

# Navigate to project
cd vw-crash-to-repair-simulator
```

### Step 2: Environment Setup

No `.env` file is required for local development. Default values are configured in `docker-compose.yml`.

**Optional**: Create `.env` for custom configuration:

```bash
# Copy example (if exists)
cp .env.example .env

# Or create manually with these optional overrides:
cat > .env << 'EOF'
# Database
POSTGRES_USER=vw_simulator
POSTGRES_PASSWORD=vw_simulator_dev
POSTGRES_DB=vw_crash_repair

# Backend
DATABASE_URL=postgresql+asyncpg://vw_simulator:vw_simulator_dev@postgres:5432/vw_crash_repair
REDIS_URL=redis://redis:6379
ENVIRONMENT=local
DEBUG=true

# Frontend
VITE_API_URL=http://localhost:8000
EOF
```

### Step 3: Start the Application

```bash
# Start all services (first time will build images)
sudo docker compose up -d

# Watch logs (optional)
sudo docker compose logs -f
```

### Step 4: Verify Installation

```bash
# Check all containers are running
sudo docker compose ps

# Expected output:
# NAME                    STATUS
# vw_simulator_frontend   Up (healthy)
# vw_simulator_backend    Up
# vw_simulator_postgres   Up (healthy)
# vw_simulator_redis      Up (healthy)

# Test backend health
curl http://localhost:8000/api/v1/health

# Test frontend
curl -I http://localhost:3000
```

### Step 5: Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | React application |
| Backend API | http://localhost:8000 | FastAPI server |
| API Docs | http://localhost:8000/docs | Swagger UI |
| ReDoc | http://localhost:8000/redoc | Alternative API docs |

---

## 📁 Project Structure

```
vw-crash-to-repair-simulator/
│
├── backend/                      # FastAPI Backend
│   ├── src/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Pydantic settings
│   │   ├── database.py          # SQLAlchemy async setup
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── router.py    # API router aggregation
│   │   │       ├── health.py    # Health endpoints
│   │   │       ├── beamng.py    # BeamNG integration endpoints
│   │   │       ├── vehicles.py  # Vehicle CRUD
│   │   │       ├── parts.py     # Parts catalog
│   │   │       ├── dealers.py   # Dealer network
│   │   │       ├── damage.py    # Damage analysis
│   │   │       └── appointments.py # Booking
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic
│   │   ├── repositories/        # Data access layer
│   │   └── utils/               # Utilities
│   ├── tests/                   # Pytest tests
│   ├── alembic/                 # Database migrations
│   ├── Dockerfile
│   └── pyproject.toml           # Python dependencies
│
├── frontend/                     # React Frontend
│   ├── src/
│   │   ├── main.tsx             # Entry point
│   │   ├── App.tsx              # Root component
│   │   ├── Router.tsx           # Route definitions
│   │   ├── pages/               # Page components
│   │   │   ├── LandingPage.tsx
│   │   │   ├── DamageReportsPage.tsx
│   │   │   ├── ResultsPage.tsx
│   │   │   ├── DealerNetworkPage.tsx
│   │   │   ├── AppointmentPage.tsx
│   │   │   ├── VehicleManagementPage.tsx
│   │   │   └── PartsPage.tsx
│   │   ├── components/          # Reusable components
│   │   ├── services/            # API client services
│   │   ├── store/               # Zustand stores
│   │   ├── hooks/               # Custom React hooks
│   │   └── types/               # TypeScript interfaces
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── beamng-mod/                   # BeamNG.drive Mod
│   ├── README.md
│   └── vw_damage_reporter/
│       ├── mod_info.json
│       └── lua/vehicle/extensions/
│           └── vw_damage_reporter.lua
│
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md
│   ├── BEAMNG_INSTALLATION.md
│   ├── BEAMNG_INTEGRATION_PLAN.md
│   ├── MIGRATION_PLAN.md
│   └── DOMAIN_MODEL.md
│
├── docker-compose.yml            # Docker orchestration
├── Makefile                      # Development commands
├── README.md                     # Project overview
└── DEVELOPER_GUIDE.md            # This file
```

---

## 🖥️ Running the Application

### Docker Commands (Recommended)

```bash
# Start all services
sudo docker compose up -d

# Start with rebuild
sudo docker compose up -d --build

# Rebuild specific service
sudo docker compose up -d --build frontend
sudo docker compose up -d --build backend

# Stop all services
sudo docker compose down

# Stop and remove volumes (reset database)
sudo docker compose down -v

# View logs
sudo docker compose logs -f              # All services
sudo docker compose logs -f backend      # Backend only
sudo docker compose logs -f frontend     # Frontend only

# Restart a service
sudo docker compose restart backend

# Execute command in container
sudo docker compose exec backend bash
sudo docker compose exec frontend sh
sudo docker compose exec postgres psql -U vw_simulator -d vw_crash_repair
```

### Local Development (Without Docker)

#### Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install poetry
poetry install

# Run migrations (requires PostgreSQL running)
alembic upgrade head

# Start development server
uvicorn src.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## 🔌 API Reference

### Base URL
```
http://localhost:8000/api/v1
```

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health check |
| GET | `/health/ready` | Readiness probe |
| GET | `/health/live` | Liveness probe |

### Vehicle Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vehicles/` | List all vehicles |
| GET | `/vehicles/{id}` | Get vehicle by ID |
| POST | `/vehicles/` | Create vehicle |
| PUT | `/vehicles/{id}` | Update vehicle |
| DELETE | `/vehicles/{id}` | Delete vehicle |

### Parts Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/parts/` | List all parts |
| GET | `/parts/{id}` | Get part by ID |
| POST | `/parts/` | Create part |
| GET | `/parts/search` | Search parts |

### Dealer Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dealers/` | List all dealers |
| GET | `/dealers/{id}` | Get dealer by ID |
| POST | `/dealers/` | Create dealer |
| GET | `/dealers/nearby` | Find nearby dealers |

### BeamNG Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/beamng/health` | BeamNG connection status |
| POST | `/beamng/connect` | Connect to BeamNG |
| POST | `/beamng/crash-event` | Receive crash from Lua mod |
| GET | `/beamng/latest-crash` | Get most recent crash |
| GET | `/beamng/crash-history` | List crash history |
| GET | `/beamng/crash/{id}` | Get crash by ID |

### Damage Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/damage/` | List damage reports |
| GET | `/damage/{id}` | Get damage report |
| POST | `/damage/analyze` | Analyze damage |
| GET | `/damage/{id}/estimate` | Get repair estimate |

### Appointment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/appointments/` | List appointments |
| POST | `/appointments/` | Create appointment |
| GET | `/appointments/{id}` | Get appointment |
| PUT | `/appointments/{id}` | Update appointment |
| DELETE | `/appointments/{id}` | Cancel appointment |

---

## 🎨 Frontend Development

### Page Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | LandingPage | Dashboard home with stats and navigation |
| `/damage-reports` | DamageReportsPage | Crash list with DB-driven costs + detail view |
| `/results` | ResultsPage | Repair estimate results |
| `/dealers` | DealerNetworkPage | Dealer network with create modal |
| `/appointment` | AppointmentPage | Book service at VW dealer |
| `/vehicles` | VehicleManagementPage | Vehicle CRUD management |
| `/parts` | PartsPage | Parts catalog with create modal |

### State Management

The app uses **Zustand** for client state:

```typescript
// Example: src/store/simulationStore.ts
import { create } from 'zustand'

interface SimulationState {
  isConnected: boolean
  selectedVehicle: Vehicle | null
  setConnected: (connected: boolean) => void
  setVehicle: (vehicle: Vehicle) => void
}

export const useSimulationStore = create<SimulationState>((set) => ({
  isConnected: false,
  selectedVehicle: null,
  setConnected: (connected) => set({ isConnected: connected }),
  setVehicle: (vehicle) => set({ selectedVehicle: vehicle }),
}))
```

### API Services

API calls are centralized in `src/services/`:

```typescript
// Example: src/services/vehicleService.ts
import { apiClient } from './api'
import { Vehicle } from '../types'

export const vehicleService = {
  getAll: (): Promise<Vehicle[]> => 
    apiClient.get('/vehicles/'),
    
  getById: (id: string): Promise<Vehicle> => 
    apiClient.get(`/vehicles/${id}`),
}
```

### Important Notes for Frontend

1. **API returns arrays directly**, NOT paginated responses
   - Correct: `const vehicles = await vehicleService.getAll()` returns `Vehicle[]`
   - Wrong: Expecting `{ items: Vehicle[], total: number }`

2. **Vehicle model doesn't include `make` field** - use hardcoded "Volkswagen"

3. **UI text is in Brazilian Portuguese** - this is a VW Brazil product

4. **Parts pricing is DB-driven** - 51 parts auto-seeded from `VEHICLE_PARTS.csv` on startup with PT names, BRL prices, and labor hours

5. **CSS class naming** - use `vw-button-primary` and `vw-button-secondary` (NOT `vw-btn-*`)

---

## ⚙️ Backend Development

### Adding a New Endpoint

1. **Create schema** in `backend/src/schemas/`:
```python
from pydantic import BaseModel

class MyItemCreate(BaseModel):
    name: str
    value: int

class MyItemResponse(BaseModel):
    id: str
    name: str
    value: int
```

2. **Create model** in `backend/src/models/`:
```python
from sqlalchemy import Column, String, Integer
from src.models.base import Base

class MyItem(Base):
    __tablename__ = "my_items"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    value = Column(Integer, default=0)
```

3. **Create repository** in `backend/src/repositories/`:
```python
class MyItemRepository:
    def __init__(self, db_session):
        self.db = db_session
    
    async def get_all(self):
        result = await self.db.execute(select(MyItem))
        return result.scalars().all()
```

4. **Create service** in `backend/src/services/`:
```python
class MyItemService:
    def __init__(self, repository: MyItemRepository):
        self.repo = repository
    
    async def get_items(self):
        return await self.repo.get_all()
```

5. **Create endpoint** in `backend/src/api/v1/`:
```python
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_items():
    return await service.get_items()
```

6. **Register router** in `backend/src/api/v1/router.py`:
```python
from src.api.v1 import my_items
api_router.include_router(my_items.router, prefix="/my-items", tags=["my-items"])
```

### Database Migrations

```bash
# Create new migration
cd backend
alembic revision --autogenerate -m "Add my_items table"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

---

## 🎮 BeamNG Integration

### How It Works

1. **Lua Mod** (`beamng-mod/vw_damage_reporter/`) runs inside BeamNG
2. Monitors vehicle damage every 0.5 seconds
3. When damage increases by threshold (default 10%), sends HTTP POST
4. Backend receives at `POST /api/v1/beamng/crash-event`
5. Frontend polls `GET /api/v1/beamng/latest-crash` for new crashes

### Installing the Mod

```bash
# Copy mod to BeamNG mods folder

# Windows
cp -r beamng-mod/vw_damage_reporter "%USERPROFILE%\AppData\Local\BeamNG.drive\mods\"

# Linux (if using Proton/Wine)
cp -r beamng-mod/vw_damage_reporter ~/.local/share/BeamNG.drive/mods/
```

### Testing Without BeamNG

```bash
# Simulate a crash event
curl -X POST http://localhost:8000/api/v1/beamng/crash-event \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "crash_detected",
    "timestamp": 1706620800,
    "vehicle": {"id": "v1", "name": "T-Cross", "model": "tcross", "brand": "Volkswagen", "year": 2024, "config": "default"},
    "position": {"x": 0, "y": 0, "z": 0},
    "velocity": {"x": 0, "y": 0, "z": 0, "speed_ms": 12.6, "speed_kmh": 45.5, "speed_mph": 28.3},
    "rotation": {"x": 0, "y": 0, "z": 0, "w": 1},
    "damage": {
      "total_damage": 0.35,
      "previous_damage": 0.1,
      "damage_delta": 0.25,
      "part_damage": {"front_bumper": 0.8, "hood": 0.5},
      "damage_by_zone": {"front": 0.8, "rear": 0, "left": 0.2, "right": 0, "top": 0, "bottom": 0},
      "broken_parts": ["front_bumper"],
      "broken_parts_count": 1
    },
    "metadata": {"mod_version": "1.0.0", "beamng_version": "0.31", "damage_threshold": 0.1}
  }'

# Check latest crash
curl http://localhost:8000/api/v1/beamng/latest-crash
```

---

## 🗄️ Database

### Connection Details (Local)

```
Host: localhost
Port: 5432
Database: vw_crash_repair
User: vw_simulator
Password: vw_simulator_dev
```

### Access Database

```bash
# Via Docker
sudo docker compose exec postgres psql -U vw_simulator -d vw_crash_repair

# Common queries
\dt                    # List tables
\d+ vehicles          # Describe table
SELECT * FROM vehicles LIMIT 10;
```

### Main Tables

| Table | Description |
|-------|-------------|
| `vehicles` | VW vehicles for simulation |
| `parts` | Parts catalog (auto-seeded from CSV) |
| `dealers` | Dealer network |
| `customers` | Customer profiles |
| `damage_reports` | Crash damage reports |
| `damage_components` | Individual damaged parts |
| `estimates` | Repair cost estimates |
| `appointments` | Service appointments |

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=src

# Run specific test file
pytest tests/unit/test_services/test_damage_service.py

# Run with verbose output
pytest -v
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### API Testing

```bash
# Health check
curl http://localhost:8000/api/v1/health

# List vehicles
curl http://localhost:8000/api/v1/vehicles/

# List dealers
curl http://localhost:8000/api/v1/dealers/

# List parts
curl http://localhost:8000/api/v1/parts/
```

---

## 🔧 Troubleshooting

### Container Won't Start

```bash
# Check container status
sudo docker compose ps

# Check logs
sudo docker compose logs backend
sudo docker compose logs frontend

# Rebuild from scratch
sudo docker compose down -v
sudo docker compose up -d --build
```

### Port Already in Use

```bash
# Check what's using the port
sudo lsof -i :3000
sudo lsof -i :8000

# Kill process
sudo kill -9 <PID>
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
sudo docker compose ps postgres

# Check logs
sudo docker compose logs postgres

# Reset database
sudo docker compose down -v
sudo docker compose up -d
```

### Frontend Not Loading

```bash
# Check container logs
sudo docker compose logs frontend

# Rebuild frontend
sudo docker compose up -d --build frontend

# Check TypeScript errors
cd frontend && npx tsc --noEmit
```

### API Returns 500 Error

```bash
# Check backend logs
sudo docker compose logs -f backend

# Check error details in response
curl -v http://localhost:8000/api/v1/endpoint
```

---

## 🤖 AI Agent Context

> **Important**: This section provides essential context for AI coding agents working on this project.

### Project Summary

This is a **VW Crash-to-Repair Simulator** that:
- Integrates with BeamNG.drive game via Lua mod
- Provides repair estimates based on crash damage
- Uses React frontend + FastAPI backend + PostgreSQL
- Runs entirely in Docker

### Critical Information

1. **API Response Format**: Backend returns **arrays directly**, not paginated objects
   ```typescript
   // CORRECT - API returns: Vehicle[]
   const vehicles = await fetch('/api/v1/vehicles/').then(r => r.json())
   
   // WRONG - Do NOT expect: { items: Vehicle[], total: number }
   ```

2. **Vehicle Model**: No `make` field exists - hardcode "Volkswagen"
   ```typescript
   // CORRECT
   <span>Volkswagen {vehicle.model}</span>
   
   // WRONG - vehicle.make doesn't exist
   <span>{vehicle.make} {vehicle.model}</span>
   ```

3. **Language**: UI text is in **Brazilian Portuguese** (this is a VW Brazil product)

4. **Docker Required**: Always use `sudo docker compose` commands on Linux

5. **Ports**:
   - Frontend: 3000
   - Backend: 8000
   - PostgreSQL: 5432
   - Redis: 6379

### Common Tasks

#### Add a New Page

1. Create component in `frontend/src/pages/NewPage.tsx`
2. Add route in `frontend/src/Router.tsx`
3. Import and add `<Route path="/new" element={<NewPage />} />`

#### Add a New API Endpoint

1. Add schema in `backend/src/schemas/`
2. Add endpoint in `backend/src/api/v1/`
3. Register router in `backend/src/api/v1/router.py`
4. Rebuild: `sudo docker compose up -d --build backend`

#### Fix TypeScript Errors

```bash
cd frontend
npx tsc --noEmit
```

#### Rebuild After Changes

```bash
# Backend changes
sudo docker compose up -d --build backend

# Frontend changes  
sudo docker compose up -d --build frontend

# Both
sudo docker compose up -d --build
```

### File Patterns

| Pattern | Location | Purpose |
|---------|----------|---------|
| `*Page.tsx` | `frontend/src/pages/` | Page components |
| `*Service.ts` | `frontend/src/services/` | API clients |
| `*Store.ts` | `frontend/src/store/` | Zustand stores |
| `*.py` | `backend/src/api/v1/` | API endpoints |
| `*.py` | `backend/src/schemas/` | Pydantic models |
| `*.py` | `backend/src/models/` | SQLAlchemy models |

### When Making Changes

1. **Always verify** TypeScript compiles: `cd frontend && npx tsc --noEmit`
2. **Always rebuild** container after backend changes
3. **Check API docs** at http://localhost:8000/docs
4. **Test endpoints** with curl before frontend integration
5. **Use existing patterns** - look at similar files for reference

---

## 📚 Additional Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [BeamNG Installation Guide](docs/BEAMNG_INSTALLATION.md)
- [BeamNG Integration Plan](docs/BEAMNG_INTEGRATION_PLAN.md)
- [Migration Plan](docs/MIGRATION_PLAN.md)
- [Domain Model](docs/DOMAIN_MODEL.md)

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes
3. Run tests: `npm test` / `pytest`
4. Commit: `git commit -m "feat: Add my feature"`
5. Push: `git push origin feature/my-feature`
6. Create Pull Request

---

## 📞 Support

For issues or questions:
- Check [Troubleshooting](#troubleshooting) section
- Review existing documentation in `docs/`
- Open a GitHub issue

---

**Last Updated**: February 19, 2026
