# VW Brand Day - Crash-to-Repair Experience

**Version:** 2.0 (Modern Architecture)  
**Event:** Volkswagen Dealer Brand Day (March 2026)  
**Client:** Volkswagen Brazil  
**Stack:** React + TypeScript + FastAPI + PostgreSQL

## Overview

Production-ready "Crash-to-Repair" digital experience featuring:
- **BeamNG.tech Integration**: Realistic vehicle damage simulation and analysis
- **Modern React Frontend**: TypeScript, Tailwind CSS, responsive design
- **Robust FastAPI Backend**: Repository/Service pattern, async SQLAlchemy, structured logging
- **PostgreSQL Database**: ACID compliance, migrations, Brazilian dealer/parts data
- **Docker Development**: Consistent environments, one-command setup
- **Brazilian Localization**: VW dealer network, parts catalog, pricing in BRL

🎯 **Demonstrates Object Edge's expertise in modern full-stack development with enterprise-grade architecture.**

---

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** (required)
- **Python 3.11+** (for backend development)  
- **Node.js 18+** (for frontend development)
- **BeamNG.tech** (optional, for full simulation)

### 1. Initial Setup

```bash
# Clone and navigate to project
git clone <repo-url> && cd VW

# Start all services
docker-compose up -d
```

### 2. Start Development Environment

```bash
# Start all services with hot-reload
make dev
```

**🎉 That's it! All services are now running:**

- **Frontend (React)**: http://localhost:3000
- **Backend (FastAPI)**: http://localhost:8000  
- **API Documentation**: http://localhost:8000/docs
- **Database**: PostgreSQL on localhost:5432
- **Cache**: Redis on localhost:6379

### 3. Demo the System

```bash
# Run complete crash-to-repair workflow demo
make demo

# Test BeamNG connection (if installed)
make beamng-test
```

---

## 🏗️ Architecture Overview

### Modern Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React 18 + TypeScript + Vite | Component-based UI, type safety, fast builds |
| **State Management** | Zustand + React Query | Client state + server state caching |
| **Styling** | Tailwind CSS | Utility-first, responsive design |
| **Backend** | FastAPI + SQLAlchemy 2.0 | Async API, ORM, automatic docs |
| **Database** | PostgreSQL 15 | ACID compliance, jsonb support, full-text search |
| **Cache** | Redis | Session storage, API response caching |
| **Development** | Docker Compose | Consistent environments, easy onboarding |

### Project Structure

```
vw-crash-to-repair-simulator/
├── backend/                    # FastAPI application
│   ├── src/
│   │   ├── api/               # API routes (health, damage, estimates, dealers, appointments)
│   │   ├── models/            # SQLAlchemy models (vehicle, damage, parts, dealers)
│   │   ├── schemas/           # Pydantic schemas for request/response
│   │   ├── services/          # Business logic (BeamNG, damage analysis, estimates)
│   │   ├── repositories/      # Data access layer
│   │   ├── integrations/      # External integrations (BeamNG client)
│   │   └── utils/             # Logging, caching, Brazilian utilities
│   ├── tests/                 # Unit and integration tests
│   ├── alembic/               # Database migrations
│   └── Dockerfile
│
├── frontend/                   # React application  
│   ├── src/
│   │   ├── pages/             # Route components (Landing, DamageReports, Results, Parts, Dealers, etc.)
│   │   ├── components/        # Reusable UI components
│   │   ├── api/               # API client functions
│   │   ├── hooks/             # Custom React hooks
│   │   ├── store/             # Zustand state management
│   │   ├── types/             # TypeScript interfaces
│   │   └── utils/             # Formatters, validators, constants
│   ├── tests/                 # Frontend tests
│   └── Dockerfile
│
├── docs/                       # Documentation
├── docker-compose.yml          # Local development services
├── Makefile                    # Development commands
└── .env.example                # Environment template
```

---

## 🔄 Migration Status

| Component | Status | Progress |
|-----------|--------|----------|
| **📋 Architecture Planning** | ✅ Complete | Migration strategy documented |
| **🐳 Development Infrastructure** | ✅ Complete | Docker Compose, Makefile, environments |
| **🗄️ Database Migration** | ✅ Complete | PostgreSQL schema, auto-seed from CSV on startup |
| **⚙️ Backend Restructuring** | ✅ Complete | Repository/Service pattern, async SQLAlchemy |
| **⚛️ Frontend React Migration** | ✅ Complete | React+TypeScript, Zustand, Tailwind CSS |
| **🔗 API Integration** | ✅ Complete | React Query, proper error handling |
| **🎮 Game Reporting** | ✅ Complete | Crash-to-repair flow with DB-driven pricing |

---

## 💻 Development

### Available Commands

```bash
# Development workflow
make setup          # Initial project setup
make dev             # Start all services  
make backend         # Start only backend
make frontend        # Start only frontend

# Database operations  
make migrate         # Run database migrations
make migrate-create  # Create new migration
make seed-data       # Populate with sample data

# Testing
make test            # Run all tests
make test-integration # Integration tests only
make lint            # Run linting
make format          # Format code

# Demo and utilities
make demo            # Run complete demo
make beamng-test     # Test BeamNG connection
make logs            # View service logs
make db-shell        # Access database
make clean           # Clean up containers
```

### Individual Service Development

**Backend Development:**
```bash
cd backend
poetry install
poetry shell
uvicorn src.main:app --reload --port 8000
```

**Frontend Development:**  
```bash
cd frontend
npm install
npm run dev
```

**Database Operations:**
```bash
# Create migration
cd backend
poetry run alembic revision --autogenerate -m "Add new table"

# Apply migrations
poetry run alembic upgrade head

# Connect to database
docker-compose exec postgres psql -U vw_simulator -d vw_crash_repair
```

---

## 🚗 BeamNG Integration

### Installation
1. Register for BeamNG.tech research license: https://register.beamng.tech/
2. Download and install BeamNG.drive research version
3. Follow setup instructions in [docs/BEAMNG_INSTALLATION.md](docs/BEAMNG_INSTALLATION.md)

### Usage Workflow
1. **Launch BeamNG** with VW vehicle models
2. **Drive and crash** VW vehicle (T-Cross, Golf, etc.)  
3. **API captures** damage telemetry automatically
4. **Frontend displays** damage analysis and repair estimates
5. **Book appointment** at nearest VW dealer

### Without BeamNG
The system includes sample crash data for demonstrations without BeamNG installed.

---

## 🌎 Brazilian Market Features

### VW Dealer Network
- **200+ VW dealerships** across Brazil
- **Real addresses** and contact information
- **Inventory checking** and part availability
- **Appointment scheduling** with Brazilian business hours

### Parts Catalog
- **51 VW T-Cross parts** seeded automatically from `VEHICLE_PARTS.csv` on startup
- **BRL pricing** and Portuguese part names (`name_pt`)
- **Labor time estimates** in hours (converted from CSV minutes)
- **Availability tracking** across dealer network
- **DB-driven pricing** used in damage report cost calculations

### Localization
- **Portuguese interface** with Brazilian terminology
- **CPF/CNPJ validation** for customer data
- **Brazilian postal codes** and address formats
- **BRL currency** formatting and tax calculations

---

## 📊 Technical Features

### Performance
- **Sub-2-second** page loads with React and caching
- **Real-time updates** via WebSocket connections
- **Optimistic updates** for responsive user experience
- **Background prefetching** for smooth workflow

### Security
- **Input validation** with Pydantic schemas
- **SQL injection prevention** with SQLAlchemy ORM
- **Rate limiting** on API endpoints
- **CORS configuration** for secure API access

### Monitoring
- **Structured JSON logging** with correlation IDs
- **Health check endpoints** for system monitoring
- **Error tracking** and automatic retries
- **Performance metrics** and query optimization

---

## 📝 Documentation

| Document | Purpose |
|----------|---------|
| [MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md) | Complete architecture migration strategy |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design and patterns |
| [BEAMNG_INSTALLATION.md](docs/BEAMNG_INSTALLATION.md) | BeamNG setup guide |
| [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | API endpoints and schemas |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment guide |

---

## 🎯 Event Preparation

### For Volkswagen Brand Day (March 2026)

**Demo Script:**
1. **System Overview** (2 min) - Architecture and capabilities
2. **Live Crash Simulation** (3 min) - BeamNG integration  
3. **Damage Analysis** (2 min) - AI-powered component assessment
4. **Repair Estimation** (2 min) - Parts pricing and dealer integration
5. **Appointment Booking** (1 min) - Complete workflow

**Technical Requirements:**
- High-performance laptops with dedicated GPUs (BeamNG)
- Stable internet connection for dealer network integration
- Large displays for audience viewing
- Backup data for demo without internet

---

## 🤝 Contributing

### Code Standards
- **TypeScript** for all new frontend code
- **Python 3.11+** with type hints for backend
- **Async/await** patterns for I/O operations  
- **Repository pattern** for data access
- **Comprehensive tests** for all business logic

### Development Workflow
1. Create feature branch from `main`
2. Follow coding standards and add tests
3. Run `make lint` and `make test` before commit
4. Create pull request with detailed description
5. Ensure all checks pass before merge

---

## 📄 License

MIT License - Object Edge Internal Project

**Contact:** Object Edge Development Team  
**Project Manager:** Jefin  
**Event Date:** March 2026  
**Status:** ✅ Modern Architecture Complete | Game Reporting Flow Operational