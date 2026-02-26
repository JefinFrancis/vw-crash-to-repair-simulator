# Agent Context - VW Crash-to-Repair Simulator

> **For AI Agents**: Read this file at the start of every session. It contains the current project state, active workstreams, and coordination rules.

**Last Updated**: 2026-02-26
**Repository**: github.com/JefinFrancis/vw-crash-to-repair-simulator

---

## Project Summary

A full-stack VW crash-to-repair simulator that integrates with BeamNG.drive to detect crashes, analyze damage, generate repair estimates, and book dealer appointments. Built for VW Brand Day demo.

**Tech Stack**: React 18 + TypeScript + Vite | FastAPI + Python 3.11 + SQLAlchemy 2.0 | PostgreSQL 15 | Docker
**Note**: Redis removed in favor of Node.js proxy for BeamNG event forwarding.

**Cloud Platform**: GCP (Google Cloud Platform)
- **Project ID**: `vw-beamng`
- **Region**: `us-central1`
- **Environments**: `dev` (scale-to-zero) and `prod` (always-on)
- **Services**: Cloud Run, Cloud SQL (PostgreSQL 15), Memorystore (Redis 7), Secret Manager, Artifact Registry

---

## Active Workstreams

| PM | Agent | Focus Area | Branch | Status | Started |
|----|-------|------------|--------|--------|---------|
| Jefin | GitHub Copilot | GCP Infrastructure & Deployment | main | ✅ Complete | 2026-01-30 |
| Rohit | Claude Code | TBD | main | Starting | 2026-01-30 |
| TBD | GitHub Copilot | TBD | TBD | Not started | - |

---

## Component Ownership

### Backend (`/backend/src/`)

| Component | Owner | Files | Notes |
|-----------|-------|-------|-------|
| BeamNG Integration | Unassigned | `api/v1/beamng.py`, `services/beamng.py` | Crash events via proxy, in-memory storage |
| Vehicle Management | Unassigned | `api/v1/vehicles.py`, `services/vehicle.py` | CRUD + customer ownership FK |
| Damage Analysis | Unassigned | `api/v1/damage.py`, `services/damage_report.py` | Zone-based damage scoring |
| Parts Catalog | Unassigned | `api/v1/parts.py`, `services/part.py` | VW parts with BRL pricing (auto-seeded from CSV) |
| Repair Estimates | Unassigned | `api/v1/estimates.py`, `services/estimate.py` | Cost calculation with tax |
| Dealer Network | Unassigned | `api/v1/dealers.py`, `services/dealer.py` | Geographic search, CNPJ validation, get by ID |
| Appointments | Unassigned | `api/v1/appointments.py`, `services/appointment.py` | Booking workflow |
| Customers | Unassigned | `api/v1/customers.py`, `services/customer.py` | CRUD, phone validation, dealer preference |
| WhatsApp | Unassigned | `api/v1/whatsapp.py` | Backend proxy for WhatsApp collision notifications |
| Data Seeding | Unassigned | `database.py` | Auto-seed parts, dealers, customer, vehicle on startup |

### Frontend (`/frontend/src/`)

| Component | Owner | Files | Notes |
|-----------|-------|-------|-------|
| Landing Page | Unassigned | `pages/LandingPage.tsx` | Dashboard with stats and navigation |
| Simulation | Unassigned | `pages/SimulationPage.tsx` | Vehicle selection + crash simulation |
| Analysis | Unassigned | `pages/AnalysisPage.tsx` | Crash analysis + WhatsApp customer notification |
| Damage Reports | Unassigned | `pages/DamageReportsPage.tsx` | Crash list with DB-driven costs, per-part breakdown |
| Results Display | Unassigned | `pages/ResultsPage.tsx` | Repair estimate results |
| Appointment Booking | Unassigned | `pages/AppointmentPage.tsx` | Multi-step wizard |
| Vehicle Management | Unassigned | `pages/VehicleManagementPage.tsx` | CRUD with edit modal + customer owner selector |
| Customer Management | Unassigned | `pages/CustomerManagementPage.tsx` | CRUD with +55 phone badge, dealer preference |
| Dealer Network | Unassigned | `pages/DealerNetworkPage.tsx` | Dealer list with create modal |
| Parts Catalog | Unassigned | `pages/PartsPage.tsx` | Catalog browser with create modal |

### BeamNG Mod (`/beamng-mod/`)

| Component | Owner | Files | Notes |
|-----------|-------|-------|-------|
| Lua Damage Reporter | Unassigned | `vw_damage_reporter/lua/` | Auto crash detection, sends to backend |
| Mod Configuration | Unassigned | `vw_damage_reporter/config.lua` | **Configurable backend URL** (local/dev/prod) |

### Infrastructure (`/terraform/`)

| Component | Owner | Files | Notes |
|-----------|-------|-------|-------|
| Root Module | Jefin | `main.tf`, `variables.tf`, `outputs.tf` | VPC, APIs, orchestrates modules |
| Cloud Run Module | Jefin | `modules/cloud-run/` | Backend & Frontend services |
| Cloud SQL Module | Jefin | `modules/cloud-sql/` | PostgreSQL with private networking |
| Redis Module | Jefin | `modules/redis/` | Memorystore instance |
| Environment Configs | Jefin | `environments/dev.tfvars`, `environments/prod.tfvars` | Per-environment settings |

### CI/CD (Root Directory)

| Component | Owner | Files | Notes |
|-----------|-------|-------|-------|
| Dev Pipeline | Jefin | `cloudbuild.yaml` | Triggered on `develop` branch |
| Prod Pipeline | Jefin | `cloudbuild-prod.yaml` | Triggered on `main` branch/tags |

---

## Locked Files (Do Not Modify)

Files currently being actively edited by another agent:

```
# None currently locked
```

When you start working on a file, add it here with your name and date:
```
# Example:
# /frontend/src/pages/AppointmentPage.tsx - Rohit - 2026-01-30
```

---

## Recent Changes

| Date | PM | Change | Files |
|------|-----|--------|-------|
| 2026-01-30 | Jefin (original) | Initial implementation complete | All |
| 2026-01-30 | Rohit | Joined project, set up agent coordination | AGENT_CONTEXT.md |
| 2026-01-30 | Jefin | Created GCP Terraform infrastructure | `terraform/*`, `cloudbuild.yaml`, `cloudbuild-prod.yaml` |
| 2026-01-30 | Jefin | Updated Dockerfiles for Cloud Run (port 8080) | `backend/Dockerfile`, `frontend/Dockerfile` |
| 2026-01-30 | Jefin | Added nginx config for Cloud Run | `frontend/nginx.conf` |
| 2026-01-30 | Jefin | Made BeamNG mod backend URL configurable | `beamng-mod/vw_damage_reporter/config.lua` |
| 2026-01-30 | Jefin | Created Terraform state bucket | `gs://vw-beamng-terraform-state` |
| 2026-01-30 | Jefin | Enabled GCP APIs, initialized Terraform | Infrastructure ready for deploy |
| 2026-01-30 | Jefin | Built and pushed Docker images to Artifact Registry | `backend:latest`, `frontend:latest` |
| 2026-01-30 | Jefin | Fixed database config for Cloud Run env vars | `backend/src/config.py` |
| 2026-01-30 | Jefin | Deployed dev environment to Cloud Run | All infrastructure live |
| 2026-02-19 | Valmor | Game reporting flow: damage reports list with DB-driven pricing, action buttons, BRT timezone fix | `frontend/src/pages/DamageReportsPage.tsx` |
| 2026-02-19 | Valmor | Auto-seed parts from CSV on startup (51 VW T-Cross parts) | `backend/src/database.py`, `backend/src/main.py`, `docker-compose.yml` |
| 2026-02-19 | Valmor | Added create functionality for dealers, parts, customers | Backend API + frontend modals |
| 2026-02-19 | Valmor | Customer management page and /customers route | `frontend/src/pages/CustomerManagementPage.tsx`, `AppRouter.tsx` |
| 2026-02-19 | Valmor | Updated documentation to reflect current state | `README.md`, `MIGRATION_STATUS.md`, `DEVELOPER_GUIDE.md`, `PROGRESS.md`, `AGENT_CONTEXT.md` |
| 2026-02-24 | Valmor | Removed Redis, added Node.js proxy for crash event forwarding | `docker-compose.yml`, `proxy/proxy.js` |
| 2026-02-25 | Valmor | Customer UUID FK migration: `preferred_dealer_cnpj` → `preferred_dealer_id` (UUID) | `models/customer.py`, `schemas/customer.py`, `services/customer.py`, `repositories/customer.py` |
| 2026-02-25 | Valmor | Vehicle-Customer ownership: vehicles have `customer_id` FK, owner selector in UI | `models/vehicle.py`, `VehicleManagementPage.tsx` |
| 2026-02-25 | Valmor | WhatsApp integration: backend proxy + customer notification from crash analysis | `api/v1/whatsapp.py`, `AnalysisPage.tsx`, `whatsappService.ts` |
| 2026-02-25 | Valmor | Phone +55 visible prefix, vehicle edit modal, customer CRUD fixes | `CustomerManagementPage.tsx`, `customerService.ts`, `VehicleManagementPage.tsx` |
| 2026-02-25 | Valmor | Dealer `getById` endpoint, customer service `commit()` fix | `api/v1/dealers.py`, `services/customer.py` |
| 2026-02-26 | Valmor | Auto-seed core entities (dealers, customer, vehicle) on startup with relationship repair | `database.py`, `main.py` |

---

## Architectural Decisions

See `/docs/adr/` for full decision records. Key decisions:

| ID | Decision | Date | Rationale |
|----|----------|------|-----------|
| ADR-001 | Zustand for state management | 2026-01-30 | Simpler than Redux, sufficient for app size |
| ADR-002 | BRL-only pricing | 2026-01-30 | Brazilian market focus, no multi-currency needed |
| ADR-003 | WebSocket for BeamNG | 2026-01-30 | Real-time telemetry requires persistent connection |
| ADR-004 | API returns arrays directly | 2026-01-30 | No pagination wrapper objects |
| ADR-005 | GCP Cloud Run for hosting | 2026-01-30 | Serverless, auto-scaling, cost-effective for demo |
| ADR-006 | Terraform for IaC | 2026-01-30 | Reproducible infrastructure, multi-environment support |
| ADR-007 | Private VPC networking | 2026-01-30 | Cloud SQL and Redis not exposed to internet |
| ADR-008 | Separate dev/prod environments | 2026-01-30 | Dev scales to zero, prod always-on for reliability |

---

## Integration Points

Critical areas where changes affect multiple components:

### 1. Crash Event Schema
- **Backend**: `POST /api/v1/beamng/crash-event`
- **BeamNG Mod**: `vw_damage_reporter/lua/vw_damage_reporter.lua`
- **Frontend**: `services/beamngService.ts`
- **Rule**: Any schema change requires updating all three

### 2. Damage Report Flow
- `beamng.py` -> `damage_report.py` -> `estimate.py`
- **Rule**: Severity levels must match across all services

### 3. Appointment Booking
- `appointments.py` -> `dealers.py` (availability check)
- **Rule**: Service types must be consistent

### 4. Cloud Deployment URLs
- **BeamNG Mod**: `beamng-mod/vw_damage_reporter/config.lua` - Backend URL setting
- **Frontend**: Environment variable `VITE_API_URL`
- **Terraform**: `terraform/environments/*.tfvars` - Service URLs
- **Rule**: When deploying, update BeamNG mod config to point to correct Cloud Run URL

### 5. Parts Catalog Auto-Seed
- **CSV Source**: `VEHICLE_PARTS.csv` (project root, mounted into Docker)
- **Backend**: `database.py` → `seed_parts_if_empty()` called on startup
- **Frontend**: `DamageReportsPage.tsx` fetches parts via `partService.list()` for DB-driven pricing
- **Rule**: If parts schema changes, update CSV headers and `seed_parts_if_empty()` parser

### 6. Core Entity Auto-Seed (Dealers, Customer, Vehicle)
- **Backend**: `database.py` → `seed_core_entities()` called on startup after parts seed
- **Dealers JSON**: `data/dealers/vw_brazil_dealers.json` (10 VW dealers)
- **Vehicles JSON**: `data/vehicles/vw_models.json` (T-Cross definition)
- **Fixed relationships**: T-Cross → Valmor Castro → VW Morumbi (repaired on every startup)
- **Rule**: Add new seed entities to `seed_core_entities()`, ensure idempotent checks by unique field

### 7. WhatsApp Notification Flow
- **Backend proxy**: `POST /api/v1/whatsapp/send-collision` → external WhatsApp API
- **API key**: `WPP_API_KEY` in backend environment (NOT in frontend)
- **Frontend**: `AnalysisPage.tsx` → fetches customer via `selectedVehicle.customer_id` → confirms → sends
- **Rule**: Vehicle must have `customer_id` set for WhatsApp flow to work

### 8. Vehicle-Customer-Dealer Chain
- **Vehicle** → `customer_id` → **Customer** → `preferred_dealer_id` → **Dealer**
- Used in: WhatsApp flow, crash analysis, appointment booking
- Auto-seeded on startup for T-Cross → Valmor Castro → VW Morumbi
- **Rule**: Breaking any link in this chain breaks the WhatsApp notification flow

### 6. Docker Port Configuration
- **Backend/Frontend Dockerfiles**: Must use port `8080` for Cloud Run
- **Local docker-compose**: Maps to ports `8000` and `3000`
- **Rule**: Cloud Run requires port 8080; local dev uses standard ports

---

## API Conventions

- **Local Base URL**: `http://localhost:8000/api/v1`
- **Cloud Base URL (dev)**: `https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app/api/v1`
- **Cloud Base URL (prod)**: `https://vw-crash-simulator-api-prod-XXXXX.us-central1.run.app/api/v1` *(not yet deployed)*
- **Response Format**: Arrays returned directly (no `{ items: [], total: n }` wrapper)
- **Currency**: All prices in BRL (Brazilian Real)
- **IDs**: UUIDs for all entities
- **Validation**: CNPJ for dealers, CPF for customers, VIN for vehicles

---

## Branch Naming Convention

```
feature/{owner}-{feature-name}
bugfix/{owner}-{issue-description}
refactor/{owner}-{component}
```

Examples:
- `feature/rohit-appointment-reminders`
- `bugfix/pm2-beamng-timeout`
- `refactor/pm3-dealer-search`

---

## Before You Start

1. Pull latest from `main`
2. Check "Locked Files" section above
3. Create your feature branch
4. Add your files to "Locked Files" section
5. Update "Active Workstreams" table

## When You Finish

1. Remove your files from "Locked Files"
2. Add entry to "Recent Changes"
3. Update any affected "Integration Points"
4. Create PR with clear description
5. Update "Active Workstreams" status

---

## Communication Protocol

When making changes that affect other workstreams:

1. **Add a note** in this file under "Pending Sync Required"
2. **Create GitHub issue** tagged with affected owners
3. **Do not merge** until sync is confirmed

### Pending Sync Required

```
# None currently
```

---

## Environment Setup

### Local Development
```bash
# Clone and start
git clone https://github.com/JefinFrancis/vw-crash-to-repair-simulator.git
cd vw-crash-to-repair-simulator
docker compose up -d

# Access points
Frontend: http://localhost:3000
Backend:  http://localhost:8000
API Docs: http://localhost:8000/docs
```

### GCP Deployment
```bash
# Prerequisites
gcloud auth login
gcloud config set project vw-beamng
gcloud auth application-default login

# Deploy dev environment
cd terraform
terraform init
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars

# Deploy prod environment
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
```

### BeamNG Mod Setup (for Cloud)
1. Edit `beamng-mod/vw_damage_reporter/config.lua`
2. Set `BACKEND_URL` to Cloud Run URL
3. Copy `vw_damage_reporter/` to BeamNG mods folder

---

## Quick Reference

### Local Ports
| Port | Service |
|------|---------|
| 3000 | Frontend (React + Vite) |
| 8000 | Backend (FastAPI) |
| 5432 | PostgreSQL |
| 9000 | Node.js Proxy (BeamNG crash event forwarding) |
| 5050 | pgAdmin (optional) |

### GCP Resources
| Resource | Dev | Prod |
|----------|-----|------|
| Cloud Run Backend | `vw-crash-simulator-api-dev` | `vw-crash-simulator-api-prod` |
| Cloud Run Frontend | `vw-crash-simulator-web-dev` | `vw-crash-simulator-web-prod` |
| Cloud SQL | `vw-crash-simulator-db-dev` | `vw-crash-simulator-db-prod` |
| Redis | `vw-crash-simulator-redis-dev` | `vw-crash-simulator-redis-prod` |
| Artifact Registry | `us-central1-docker.pkg.dev/vw-beamng/vw-crash-simulator` |
| Terraform State | `gs://vw-beamng-terraform-state` |

### Key Files for Infrastructure Changes
| File | Purpose |
|------|---------|
| `terraform/main.tf` | Root Terraform module |
| `terraform/environments/dev.tfvars` | Dev environment config |
| `terraform/environments/prod.tfvars` | Prod environment config |
| `cloudbuild.yaml` | Dev CI/CD pipeline |
| `cloudbuild-prod.yaml` | Prod CI/CD pipeline |
| `beamng-mod/vw_damage_reporter/config.lua` | BeamNG backend URL config |

---

## GCP Deployment Status

**Current State**: ✅ Dev environment fully deployed and operational
**Deployed**: 2026-01-30

### Live URLs (Dev Environment)

| Service | URL |
|---------|-----|
| **Backend API** | https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app |
| **Frontend** | https://vw-crash-simulator-web-dev-755002618864.us-central1.run.app |
| **Health Check** | https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app/api/v1/health/ |
| **API Docs** | https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app/docs |

### Deployed Infrastructure

| Resource | Status | Details |
|----------|--------|---------|
| Cloud Run Backend | ✅ Active | `vw-crash-simulator-api-dev` |
| Cloud Run Frontend | ✅ Active | `vw-crash-simulator-web-dev` |
| Cloud SQL PostgreSQL 15 | ✅ Running | Private IP: 172.24.0.3 |
| Redis Memorystore | ✅ Running | IP: 10.47.138.243 |
| VPC Connector | ✅ Active | `vw-connector-dev` |
| Secret Manager | ✅ Configured | Database password stored |
| Artifact Registry | ✅ Active | `us-central1-docker.pkg.dev/vw-beamng/vw-crash-simulator` |

### Next Steps for Production

1. Create `prod.tfvars` with production settings (always-on instances)
2. Run `terraform apply -var-file=environments/prod.tfvars`
3. Set up Cloud Build triggers for CI/CD automation
4. Configure custom domain (optional)
5. Update BeamNG mod `config.lua` with production URL for demos

### To Update BeamNG Mod for Cloud

The BeamNG mod runs **locally on the user's Windows PC** where BeamNG.drive is installed. It connects to the backend API via HTTP.

**For cloud deployment**, edit `beamng-mod/vw_damage_reporter/config.lua`:
```lua
-- Comment out the local line:
-- local BACKEND_URL = "http://localhost:8000"

-- Uncomment the cloud line:
local BACKEND_URL = "https://vw-crash-simulator-api-dev-34a3uja3ga-uc.a.run.app"
```

**Installation Steps:**
1. Edit `config.lua` with the correct backend URL
2. Copy `beamng-mod/vw_damage_reporter/` folder to:
   - `%USERPROFILE%/AppData/Local/BeamNG.drive/0.34/mods/unpacked/` (Windows)
3. Launch BeamNG.drive and enable the mod
4. The mod will automatically send crash data to the cloud backend

**Note**: BeamNG.drive is Windows-only. The mod connects to whatever backend URL is configured - local Docker or cloud.

**APIs Enabled**:
- ✅ Cloud Run
- ✅ Cloud SQL Admin
- ✅ Redis (Memorystore)
- ✅ Secret Manager
- ✅ Artifact Registry
- ✅ Cloud Build
- ✅ Compute Engine
- ✅ Service Networking
- ✅ VPC Access Connector

---

## Questions?

- Check `VW_DEVELOPER_GUIDE.md` for detailed technical docs
- Check `/docs/adr/` for architectural decisions
- Check GitHub Issues for task tracking
