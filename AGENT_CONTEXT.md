# Agent Context - VW Crash-to-Repair Simulator

> **For AI Agents**: Read this file at the start of every session. It contains the current project state, active workstreams, and coordination rules.

**Last Updated**: 2026-01-30
**Repository**: github.com/JefinFrancis/vw-crash-to-repair-simulator

---

## Project Summary

A full-stack VW crash-to-repair simulator that integrates with BeamNG.drive to detect crashes, analyze damage, generate repair estimates, and book dealer appointments. Built for VW Brand Day demo.

**Tech Stack**: React 18 + TypeScript | FastAPI + Python 3.11 | PostgreSQL 15 | Redis 7 | Docker

---

## Active Workstreams

| PM | Agent | Focus Area | Branch | Status | Started |
|----|-------|------------|--------|--------|---------|
| Rohit | Claude Code | TBD | main | Starting | 2026-01-30 |
| TBD | GitHub Copilot | TBD | TBD | Not started | - |
| TBD | GitHub Copilot | TBD | TBD | Not started | - |

---

## Component Ownership

### Backend (`/backend/src/`)

| Component | Owner | Files | Notes |
|-----------|-------|-------|-------|
| BeamNG Integration | Unassigned | `api/v1/beamng.py`, `services/beamng.py` | WebSocket connection to game |
| Vehicle Management | Unassigned | `api/v1/vehicles.py`, `services/vehicle.py` | VIN validation, BeamNG mapping |
| Damage Analysis | Unassigned | `api/v1/damage.py`, `services/damage_report.py` | Zone-based damage scoring |
| Parts Catalog | Unassigned | `api/v1/parts.py`, `services/part.py` | VW parts with BRL pricing |
| Repair Estimates | Unassigned | `api/v1/estimates.py`, `services/estimate.py` | Cost calculation with tax |
| Dealer Network | Unassigned | `api/v1/dealers.py`, `services/dealer.py` | Geographic search, CNPJ validation |
| Appointments | Unassigned | `api/v1/appointments.py`, `services/appointment.py` | Booking workflow |

### Frontend (`/frontend/src/`)

| Component | Owner | Files | Notes |
|-----------|-------|-------|-------|
| Landing Page | Unassigned | `pages/LandingPage.tsx` | Hero, workflow overview |
| Simulation Flow | Unassigned | `pages/SimulationPage.tsx` | BeamNG connection, crash scenarios |
| Analysis View | Unassigned | `pages/AnalysisPage.tsx` | AI analysis progress |
| Results Display | Unassigned | `pages/ResultsPage.tsx` | Damage breakdown, estimates |
| Appointment Booking | Unassigned | `pages/AppointmentPage.tsx` | Multi-step wizard |
| Vehicle Management | Unassigned | `pages/VehicleManagementPage.tsx` | CRUD interface |
| Dealer Network | Unassigned | `pages/DealerNetworkPage.tsx` | Map and list views |
| Parts Catalog | Unassigned | `pages/PartsPage.tsx` | Catalog browser |

### BeamNG Mod (`/beamng-mod/`)

| Component | Owner | Files | Notes |
|-----------|-------|-------|-------|
| Lua Damage Reporter | Unassigned | `vw_damage_reporter/` | Auto crash detection |

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

---

## Architectural Decisions

See `/docs/adr/` for full decision records. Key decisions:

| ID | Decision | Date | Rationale |
|----|----------|------|-----------|
| ADR-001 | Zustand for state management | 2026-01-30 | Simpler than Redux, sufficient for app size |
| ADR-002 | BRL-only pricing | 2026-01-30 | Brazilian market focus, no multi-currency needed |
| ADR-003 | WebSocket for BeamNG | 2026-01-30 | Real-time telemetry requires persistent connection |
| ADR-004 | API returns arrays directly | 2026-01-30 | No pagination wrapper objects |

---

## Integration Points

Critical areas where changes affect multiple components:

### 1. Crash Event Schema
- **Backend**: `POST /api/v1/beamng/crash-event`
- **BeamNG Mod**: `vw_damage_reporter.lua`
- **Frontend**: `services/beamngService.ts`
- **Rule**: Any schema change requires updating all three

### 2. Damage Report Flow
- `beamng.py` -> `damage_report.py` -> `estimate.py`
- **Rule**: Severity levels must match across all services

### 3. Appointment Booking
- `appointments.py` -> `dealers.py` (availability check)
- **Rule**: Service types must be consistent

---

## API Conventions

- **Base URL**: `http://localhost:8000/api/v1`
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

---

## Quick Reference

| Port | Service |
|------|---------|
| 3000 | Frontend (React) |
| 8000 | Backend (FastAPI) |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 5050 | pgAdmin (optional) |

---

## Questions?

- Check `VW_DEVELOPER_GUIDE.md` for detailed technical docs
- Check `/docs/adr/` for architectural decisions
- Check GitHub Issues for task tracking
