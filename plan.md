# Plan: Persist Crash Events to PostgreSQL

Replace in-memory `_crash_events` list in `beamng.py` with database-backed storage, following existing project patterns.

## Design Decisions

- **JSONB for nested data**: Store the full crash event payload as JSONB (same pattern as `DamageReport.beamng_data`), with frequently-queried fields extracted as proper indexed columns
- **No separate service/repository**: Since crash events are simple CRUD with no business logic, we'll keep it lightweight — a `CrashEventRepository` used directly from the route (via DB session dependency), no service layer needed
- **Backward compatible**: All existing API response shapes stay identical

## Steps

### 1. Create `CrashEvent` model (`backend/src/models/crash_event.py`)
- Inherits `BaseModel` (UUID PK + timestamps)
- Indexed columns: `crash_id` (unique), `event_type`, `vehicle_model`, `severity`, `total_damage`, `speed_kmh`
- JSONB column `event_data` stores the full crash payload (vehicle, position, velocity, damage, metadata)

### 2. Create `CrashEventRepository` (`backend/src/repositories/crash_event.py`)
- Inherits `BaseRepository`
- Custom methods: `get_by_crash_id()`, `get_latest()`, `get_history(limit, offset)`, `delete_by_crash_id()`, `clear_all()`

### 3. Add dependency injection (`backend/src/api/dependencies.py`)
- Add `get_crash_event_repository()` dependency that creates repo with DB session
- Add `CrashEventRepoDep` type alias

### 4. Update `beamng.py` endpoints
- Remove `_crash_events` global list and `MAX_CRASH_HISTORY`
- Inject `CrashEventRepoDep` into crash event endpoints
- `POST /crash-event`: Create CrashEvent row via repo + commit
- `GET /latest-crash`: Query most recent row
- `GET /crash-history`: Query with limit/offset + total count
- `GET /crash/{crash_id}`: Query by crash_id
- `DELETE /crash/{crash_id}`: Delete by crash_id
- `DELETE /crash-history`: Delete all rows

### 5. Register model in `database.py`
- Add `from src.models import crash_event` to the `initialize_db()` imports so `create_all` creates the table

### 6. Add Migration 4 to `database.py`
- For existing Cloud SQL instances where `create_all` won't create the table (since other tables already exist), add a migration that creates `crash_events` table if it doesn't exist

## Files Changed
1. `backend/src/models/crash_event.py` — **new**
2. `backend/src/repositories/crash_event.py` — **new**
3. `backend/src/api/dependencies.py` — **modified** (add repo dependency)
4. `backend/src/api/v1/beamng.py` — **modified** (replace in-memory with DB)
5. `backend/src/database.py` — **modified** (register model + migration 4)
