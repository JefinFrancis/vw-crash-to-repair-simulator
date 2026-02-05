# Testing Data Guide

This document describes the test data that has been generated for the VW Crash-to-Repair Simulator application.

## Overview

Test data has been seeded into the PostgreSQL database to enable local development and testing. The data includes realistic Brazilian dealership information, VW vehicle models, parts catalog, damage reports, and service appointments.

## How to Regenerate Test Data

### Option 1: Automatic Seeding (First Time)

When you start the application for the first time, the database will automatically seed with test data if it's empty.

### Option 2: Manual Seeding

To manually reseed the database with test data:

```bash
# From the backend directory
cd backend
poetry run python seed_data.py

# Or via Docker
docker-compose exec backend poetry run python seed_data.py
```

### Option 3: Reset Database and Reseed

To completely reset the database and start fresh:

```bash
# Stop containers and remove volumes
sudo docker-compose down -v

# Start fresh
sudo docker-compose up -d

# Manually seed if not automatic
docker-compose exec backend poetry run python seed_data.py
```

## Test Data Inventory

### 🚗 Vehicles (7 total)

Popular VW models available in Brazil with BeamNG integration:

| Model | Year | VIN | Engine | Notes |
|-------|------|-----|--------|-------|
| T-Cross | 2024 | 9BWUD41J24D000001 | 1.0L TSI | Compact SUV |
| T-Cross | 2023 | 9BWUD41J23D000002 | 1.0L TSI | Previous year |
| Polo | 2024 | 9BWUP21L24P000003 | 1.6L MPI | Subcompact car |
| Polo | 2023 | 9BWUP21L23P000004 | 1.6L MPI | Previous year |
| Golf | 2024 | WVWZZZ3C74E000005 | 1.4L TSI | Compact car |
| Jetta | 2024 | 3VWC21C54LM000006 | 1.4L TSI | Sedan |
| Tiguan | 2024 | WVGZZZ3CZ4E000007 | 2.0L TDI | Midsize SUV |

All vehicles have BeamNG configuration for crash simulation testing.

### 🔧 Parts (12 total)

OEM VW parts with realistic Brazilian pricing (BRL):

#### Bumpers
- **Front Bumper - T-Cross** (R$ 1,200.00) - 2.5 labor hours
- **Rear Bumper - T-Cross** (R$ 950.00) - 2.0 labor hours

#### Hood/Fenders
- **Hood - T-Cross/Polo** (R$ 800.00) - 1.5 labor hours
- **Front Left Fender - T-Cross/Polo** (R$ 650.00) - 2.0 labor hours
- **Front Right Fender - T-Cross/Polo** (R$ 650.00) - 2.0 labor hours

#### Doors
- **Front Left Door - T-Cross** (R$ 2,100.00) - 3.5 labor hours
- **Front Right Door - T-Cross** (R$ 2,100.00) - 3.5 labor hours
- **Rear Left Door - T-Cross** (R$ 1,900.00) - 3.0 labor hours
- **Rear Right Door - T-Cross** (R$ 1,900.00) - 3.0 labor hours

#### Glass & Lighting
- **Windshield - T-Cross** (R$ 1,800.00) - 2.5 labor hours
- **Left Headlight Assembly - T-Cross** (R$ 2,500.00) - 1.5 labor hours
- **Right Headlight Assembly - T-Cross** (R$ 2,500.00) - 1.5 labor hours

All parts are marked as "available" and sourced from VW Original Parts or authorized suppliers.

### 🏪 Dealers (5 total)

Authorized VW dealers across Brazil with realistic locations and services:

#### São Paulo - Centro
- **Location:** Avenida Paulista, 1500
- **Services:** Inspection, repair, maintenance, parts
- **Specialties:** T-Cross, Polo, Golf
- **Hours:** Mon-Fri 8:00-18:00, Sat 9:00-14:00
- **Contact:** (11) 3088-5000

#### São Paulo - Zona Leste
- **Location:** Avenida Brasil, 3000
- **Services:** Inspection, repair, maintenance, parts
- **Specialties:** T-Cross, Polo, Jetta, Tiguan
- **Hours:** Mon-Fri 8:00-19:00, Sat 9:00-16:00
- **Contact:** (11) 2965-1000

#### Campinas
- **Location:** Avenida Anchieta, 500
- **Services:** Inspection, repair, maintenance
- **Specialties:** T-Cross, Polo, Golf
- **Hours:** Mon-Fri 8:00-18:00, Sat 9:00-13:00
- **Contact:** (19) 3237-2000

#### Belo Horizonte
- **Location:** Avenida Brasil, 3000
- **Services:** Inspection, repair, maintenance, parts
- **Specialties:** T-Cross, Jetta, Tiguan
- **Hours:** Mon-Fri 8:00-18:00, Sat 9:00-14:00
- **Contact:** (31) 3207-7000

#### Rio de Janeiro
- **Location:** Avenida Rio Branco, 181
- **Services:** Inspection, repair, maintenance, parts
- **Specialties:** T-Cross, Polo, Golf, Jetta
- **Hours:** Mon-Fri 8:00-18:00, Sat 9:00-14:00
- **Contact:** (21) 2131-1000

All dealers are authorized VW dealers with accurate GPS coordinates for location-based testing.

### 📋 Damage Reports (3 total)

Sample damage reports from simulated crashes:

| Report | Vehicle | Severity | Speed | Impact Force |
|--------|---------|----------|-------|--------------|
| sim_test_1 | T-Cross 2024 | Low | 45 km/h | 1,500 N |
| sim_test_2 | T-Cross 2023 | Medium | 55 km/h | 2,000 N |
| sim_test_3 | Polo 2024 | High | 65 km/h | 2,500 N |

### 🔨 Damage Components (6 total)

Individual component damage from the damage reports:

- Front bumper (dent) - Low/Medium severity
- Hood (crack) - Low/Medium severity
- Left fender (dent) - Low/Medium severity
- Front bumper (crack) - Medium/High severity
- Hood (dent) - Medium/High severity
- Left fender (crack) - Medium/High severity

### 📅 Appointments (6 total)

Service appointments for testing the booking system:

| Customer | Dealer | Service | Status | Date (from today) |
|----------|--------|---------|--------|------------------|
| João Silva Test 1 | SP Centro | Inspection | Scheduled | +3 days |
| João Silva Test 2 | SP Zona Leste | Repair | Confirmed | +4 days |
| João Silva Test 3 | Campinas | Maintenance | Scheduled | +5 days |
| João Silva Test 4 | BH | Inspection | Confirmed | +6 days |
| João Silva Test 5 | Rio | Repair | Scheduled | +7 days |
| João Silva Test 6 | SP Centro | Maintenance | Confirmed | +8 days |

All appointments include:
- Brazilian CPF format customer identification
- Valid license plates (VW00100-VW00105)
- Estimated duration: 2.5-3.5 hours
- Linked to damage reports where applicable

## Testing Workflows

### 1. Full Damage Assessment Flow

1. View vehicles list via `/api/v1/vehicles/`
2. Check damage reports via `/api/v1/damage/`
3. View damaged components in each report
4. See associated parts needed for repair

### 2. Dealer Network Testing

1. List all dealers via `/api/v1/dealers/`
2. Search dealers by city or specialty
3. View dealer services and working hours
4. Calculate distances from user location

### 3. Repair Estimation Flow

1. Create a damage report (or use existing ones)
2. Analyze which parts are needed
3. Calculate total repair cost from parts data
4. Factor in labor hours per part

### 4. Appointment Booking Flow

1. Select dealer from available network
2. View appointment times via `/api/v1/appointments/`
3. Create new appointment
4. Link to damage report for context
5. Track appointment status (scheduled → confirmed → completed)

## API Endpoints for Testing

### Vehicles
```bash
# List all vehicles
curl http://localhost:8000/api/v1/vehicles/

# Get specific vehicle
curl http://localhost:8000/api/v1/vehicles/{vehicle_id}
```

### Parts
```bash
# List all parts
curl http://localhost:8000/api/v1/parts/

# Search parts
curl "http://localhost:8000/api/v1/parts/search?query=bumper"

# Get specific part
curl http://localhost:8000/api/v1/parts/{part_id}
```

### Dealers
```bash
# List all dealers
curl http://localhost:8000/api/v1/dealers/

# Get specific dealer
curl http://localhost:8000/api/v1/dealers/{dealer_id}

# Find nearby dealers (with lat/long)
curl "http://localhost:8000/api/v1/dealers/nearby?latitude=-23.5505&longitude=-46.6333&distance_km=25"
```

### Damage Reports
```bash
# List all reports
curl http://localhost:8000/api/v1/damage/

# Get specific report
curl http://localhost:8000/api/v1/damage/{report_id}
```

### Appointments
```bash
# List all appointments
curl http://localhost:8000/api/v1/appointments/

# Get specific appointment
curl http://localhost:8000/api/v1/appointments/{appointment_id}
```

## Frontend Testing

### Accessing the Application

Navigate to **http://localhost:3000** to access the React frontend.

### Test Scenarios

1. **Landing Page**: View the home page with sample data
2. **Vehicle Management**: Browse available VW vehicles
3. **Parts Catalog**: Search and filter VW parts by category
4. **Dealer Network**: View dealer map with location services
5. **Damage Reports**: Review sample damage assessments
6. **Appointment Booking**: Schedule service at any dealer

## Database Access

To directly query test data:

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U vw_simulator -d vw_crash_repair

# Common queries
SELECT * FROM vehicles;
SELECT * FROM parts WHERE price_brl > 1000 ORDER BY price_brl;
SELECT * FROM dealers WHERE state = 'SP';
SELECT * FROM damage_reports;
SELECT * FROM appointments WHERE status = 'scheduled';
```

## Performance Testing

Test data is sized for realistic performance assessment:

- **Small dataset**: 7 vehicles, 12 parts, 5 dealers → Testing basic functionality
- **Medium dataset**: 3 damage reports, 6 components → Testing damage analysis
- **Appointment volume**: 6 sample appointments → Testing booking system

For production-scale testing, you can extend the seed script to generate larger datasets.

## Notes

- All phone numbers follow Brazilian format (with area codes)
- All prices are in Brazilian Real (BRL)
- All addresses are real Brazilian locations with accurate GPS coordinates
- CPF numbers in appointments are test format (not real Brazilian CPFs)
- License plates follow Brazilian format (e.g., VW00100)
- Working hours reflect typical Brazilian business hours

## Troubleshooting

### Data Not Appearing
- Verify database is running: `docker-compose ps postgres`
- Check for errors: `docker-compose logs backend`
- Reseed manually: `docker-compose exec backend poetry run python seed_data.py`

### Duplicate Data
- The seed script checks for existing vehicles and skips if found
- To reset: `docker-compose down -v && docker-compose up -d`

### Wrong Data Format
- Ensure backend is fully initialized before testing
- Check API response format matches schemas
- Review logs for validation errors

---

**Last Updated:** January 30, 2026
