"""
Database seeding script for VW crash-to-repair simulator.

Seeds the PostgreSQL database with initial data from JSON files and CSV:
- VW vehicles catalog
- VW parts catalog with Brazilian pricing (from VEHICLE_PARTS.csv)
- Brazilian VW dealer network
"""

import asyncio
import csv
import json
import logging
import re
from pathlib import Path
from uuid import uuid4

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data paths - works both locally and in Docker
BASE_PATH = Path(__file__).parent.parent
DATA_PATH = BASE_PATH / "data"

# Check if running in Docker (data is mounted at /app/data)
if not DATA_PATH.exists():
    DATA_PATH = Path("/app") / "data"

# Also try alternate locations
if not DATA_PATH.exists():
    # Try parent directory from workspace root
    DATA_PATH = Path(__file__).parent.parent.parent / "data"

VEHICLES_FILE = DATA_PATH / "vehicles" / "vw_models.json"
PARTS_FILE = DATA_PATH / "parts" / "vw_parts_catalog.json"
DEALERS_FILE = DATA_PATH / "dealers" / "vw_brazil_dealers.json"

# CSV parts file (root of the project)
PARTS_CSV_FILE = Path(__file__).parent.parent / "VEHICLE_PARTS.csv"
if not PARTS_CSV_FILE.exists():
    PARTS_CSV_FILE = Path("/app") / "VEHICLE_PARTS.csv"

# Database URL - Use environment variable if set, otherwise use Docker network hostname
import os
DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    "postgresql+asyncpg://vw_simulator:vw_simulator_dev@postgres:5432/vw_crash_repair"
)


async def seed_vehicles(session: AsyncSession, vehicles_data: dict) -> int:
    """Seed vehicles table with VW models."""
    count = 0
    
    for model_id, vehicle_info in vehicles_data.get("vehicles", {}).items():
        try:
            # Check if vehicle already exists
            result = await session.execute(
                text("SELECT id FROM vehicles WHERE beamng_model = :model"),
                {"model": vehicle_info.get("beamng_model", model_id)}
            )
            if result.scalar():
                logger.info(f"Vehicle {model_id} already exists, skipping")
                continue
            
            # Generate a valid 17-character VIN
            model_code = vehicle_info.get("beamng_model", model_id)[:6].upper()
            vin = f"WVWZZZ{model_code}A000001"[:17]  # Truncate to exactly 17 chars
            
            vehicle_id = str(uuid4())
            await session.execute(
                text("""
                    INSERT INTO vehicles (id, model, year, vin, beamng_model, beamng_config, created_at, updated_at)
                    VALUES (:id, :model, :year, :vin, :beamng_model, :beamng_config, NOW(), NOW())
                """),
                {
                    "id": vehicle_id,
                    "model": vehicle_info.get("model_name", "Unknown"),
                    "year": vehicle_info.get("year", 2024),
                    "vin": vin,
                    "beamng_model": vehicle_info.get("beamng_model", model_id),
                    "beamng_config": json.dumps(vehicle_info.get("assemblies", []))
                }
            )
            await session.commit()  # Commit each successful insert
            count += 1
            logger.info(f"Seeded vehicle: {vehicle_info.get('model_name', model_id)}")
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error seeding vehicle {model_id}: {e}")

    return count


def _parse_brl_price(price_str: str) -> float:
    """Parse Brazilian Real price string like 'R$ 15.000,00' to float."""
    cleaned = price_str.replace("R$", "").strip()
    cleaned = cleaned.replace(".", "").replace(",", ".")
    return float(cleaned)


def _determine_category(name_en: str) -> str:
    """Determine part category from English name."""
    name_lower = name_en.lower()

    if any(kw in name_lower for kw in ["engine", "turbocharger", "engine mount"]):
        return "engine"
    if any(kw in name_lower for kw in ["transmission", "shifter"]):
        return "transmission"
    if any(kw in name_lower for kw in ["exhaust"]):
        return "exhaust"
    if any(kw in name_lower for kw in ["fuel tank"]):
        return "fuel_system"
    if any(kw in name_lower for kw in ["radiator"]):
        return "cooling"
    if any(kw in name_lower for kw in ["headlight", "taillight", "drl"]):
        return "lighting"
    if any(kw in name_lower for kw in ["suspension", "strut", "shock", "spring", "sway bar", "spindle", "torsion"]):
        return "suspension"
    if any(kw in name_lower for kw in ["steering"]):
        return "steering"
    if any(kw in name_lower for kw in ["half shaft", "differential"]):
        return "driveshaft"
    if any(kw in name_lower for kw in ["seat", "interior", "parcel shelf"]):
        return "interior"
    if any(kw in name_lower for kw in ["windshield", "glass"]):
        return "glass"
    if any(kw in name_lower for kw in ["door", "bumper", "fender", "hood", "mirror", "tailgate", "undertray", "unibody"]):
        return "body"
    return "general"


def _generate_part_number(index: int, category: str) -> str:
    """Generate a VW-style part number based on category and index."""
    category_prefixes = {
        "engine": "ENG",
        "transmission": "TRN",
        "exhaust": "EXH",
        "fuel_system": "FUL",
        "cooling": "COL",
        "lighting": "LGT",
        "suspension": "SUS",
        "steering": "STR",
        "driveshaft": "DRV",
        "interior": "INT",
        "glass": "GLS",
        "body": "BDY",
        "general": "GEN",
    }
    prefix = category_prefixes.get(category, "GEN")
    return f"TCR-{prefix}-{index:03d}"


async def seed_parts_from_csv(session: AsyncSession) -> int:
    """Seed parts table from VEHICLE_PARTS.csv, removing all existing parts first."""

    # Remove all existing parts
    await session.execute(text("DELETE FROM parts"))
    await session.commit()
    logger.info("Cleared all existing parts from database")

    if not PARTS_CSV_FILE.exists():
        logger.warning(f"Parts CSV file not found: {PARTS_CSV_FILE}")
        return 0

    count = 0
    with open(PARTS_CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                name_en = row["Part (English)"].strip()
                name_pt = row["Peça (Português BR)"].strip()
                price_str = row["Preço Estimado (BRL)"].strip()
                labor_minutes_str = row.get("Tempo Estimado de Substituição (minutos)", "").strip()

                price_brl = _parse_brl_price(price_str)
                labor_hours = round(int(labor_minutes_str) / 60, 2) if labor_minutes_str else 1.0
                category = _determine_category(name_en)
                count += 1
                part_number = _generate_part_number(count, category)

                part_id = str(uuid4())
                await session.execute(
                    text("""
                        INSERT INTO parts (id, part_number, name, name_pt, category, price_brl, labor_hours,
                                          availability_status, supplier, description, created_at, updated_at)
                        VALUES (:id, :part_number, :name, :name_pt, :category, :price_brl, :labor_hours,
                               :availability_status, :supplier, :description, NOW(), NOW())
                    """),
                    {
                        "id": part_id,
                        "part_number": part_number,
                        "name": name_en,
                        "name_pt": name_pt,
                        "category": category,
                        "price_brl": price_brl,
                        "labor_hours": labor_hours,
                        "availability_status": "available",
                        "supplier": "VW Parts Brazil",
                        "description": name_pt,
                    }
                )
                await session.commit()
                logger.info(f"Seeded part: {part_number} - {name_en} / {name_pt}")

            except Exception as e:
                await session.rollback()
                logger.error(f"Error seeding part from CSV row: {e}")

    return count


async def seed_parts(session: AsyncSession, parts_data: dict) -> int:
    """Seed parts table - delegates to CSV-based seeding."""
    return await seed_parts_from_csv(session)


async def seed_dealers(session: AsyncSession, dealers_data: dict) -> int:
    """Seed dealers table with Brazilian VW dealer network."""
    count = 0
    
    for dealer_id, dealer_info in dealers_data.get("dealers", {}).items():
        try:
            # Check if dealer already exists
            result = await session.execute(
                text("SELECT id FROM dealers WHERE name = :name"),
                {"name": dealer_info.get("name", dealer_id)}
            )
            if result.scalar():
                logger.info(f"Dealer {dealer_id} already exists, skipping")
                continue
            
            location = dealer_info.get("location", {})
            contact = dealer_info.get("contact", {})
            
            db_dealer_id = str(uuid4())
            await session.execute(
                text("""
                    INSERT INTO dealers (id, name, cnpj, address, city, state, postal_code,
                                        phone, email, website, latitude, longitude,
                                        services, specialties, working_hours, is_authorized, is_active,
                                        created_at, updated_at)
                    VALUES (:id, :name, :cnpj, :address, :city, :state, :postal_code,
                           :phone, :email, :website, :latitude, :longitude,
                           :services, :specialties, :working_hours, :is_authorized, :is_active,
                           NOW(), NOW())
                """),
                {
                    "id": db_dealer_id,
                    "name": dealer_info.get("name", dealer_id),
                    "cnpj": f"{dealer_id[-14:]}" if len(dealer_id) >= 14 else None,
                    "address": location.get("address", ""),
                    "city": location.get("city", "São Paulo"),
                    "state": location.get("state", "SP"),
                    "postal_code": location.get("postal_code", ""),
                    "phone": contact.get("phone", ""),
                    "email": contact.get("email", ""),
                    "website": contact.get("website", ""),
                    "latitude": location.get("latitude"),
                    "longitude": location.get("longitude"),
                    "services": dealer_info.get("services", []),
                    "specialties": dealer_info.get("specializations", []),
                    "working_hours": json.dumps({"default": "08:00-18:00"}),
                    "is_authorized": dealer_info.get("dealer_type") == "authorized",
                    "is_active": True
                }
            )
            await session.commit()  # Commit each successful insert
            count += 1
            logger.info(f"Seeded dealer: {dealer_info.get('name', dealer_id)}")
            
        except Exception as e:
            await session.rollback()  # Rollback on error
            logger.error(f"Error seeding dealer {dealer_id}: {e}")
    
    return count


async def run_seeding():
    """Main seeding function."""
    logger.info("=" * 60)
    logger.info("VW Crash-to-Repair Simulator - Database Seeding")
    logger.info("=" * 60)
    
    # Create engine
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            # Load data files
            logger.info("\n📂 Loading data files...")
            
            vehicles_data = {}
            parts_data = {}
            dealers_data = {}
            
            if VEHICLES_FILE.exists():
                with open(VEHICLES_FILE, 'r', encoding='utf-8') as f:
                    vehicles_data = json.load(f)
                logger.info(f"  ✅ Loaded {len(vehicles_data.get('vehicles', {}))} vehicles")
            else:
                logger.warning(f"  ⚠️ Vehicles file not found: {VEHICLES_FILE}")
            
            if PARTS_FILE.exists():
                with open(PARTS_FILE, 'r', encoding='utf-8') as f:
                    parts_data = json.load(f)
                logger.info(f"  ✅ Loaded {len(parts_data.get('parts', {}))} parts")
            else:
                logger.warning(f"  ⚠️ Parts file not found: {PARTS_FILE}")
            
            if DEALERS_FILE.exists():
                with open(DEALERS_FILE, 'r', encoding='utf-8') as f:
                    dealers_data = json.load(f)
                logger.info(f"  ✅ Loaded {len(dealers_data.get('dealers', {}))} dealers")
            else:
                logger.warning(f"  ⚠️ Dealers file not found: {DEALERS_FILE}")
            
            # Seed vehicles
            logger.info("\n🚗 Seeding vehicles...")
            vehicles_count = await seed_vehicles(session, vehicles_data)
            logger.info(f"  ✅ Seeded {vehicles_count} vehicles")
            
            # Seed parts
            logger.info("\n🔧 Seeding parts...")
            parts_count = await seed_parts(session, parts_data)
            logger.info(f"  ✅ Seeded {parts_count} parts")
            
            # Seed dealers
            logger.info("\n🏪 Seeding dealers...")
            dealers_count = await seed_dealers(session, dealers_data)
            logger.info(f"  ✅ Seeded {dealers_count} dealers")
            
            # Commit all changes
            await session.commit()
            
            logger.info("\n" + "=" * 60)
            logger.info("✅ Database seeding completed successfully!")
            logger.info(f"   Vehicles: {vehicles_count}")
            logger.info(f"   Parts: {parts_count}")
            logger.info(f"   Dealers: {dealers_count}")
            logger.info("=" * 60)
            
    except Exception as e:
        logger.error(f"❌ Seeding failed: {e}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_seeding())
