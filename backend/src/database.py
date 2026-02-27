"""Database setup and configuration for async SQLAlchemy."""

import csv
import json
from pathlib import Path
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import NullPool
from sqlalchemy import text
import logging

from src.config import settings

# Create async engine
engine = create_async_engine(
    settings.database_url_async,
    echo=settings.DEBUG,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    poolclass=NullPool if settings.ENVIRONMENT == "test" else None,
)

# Create async session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Create declarative base
Base = declarative_base()

logger = logging.getLogger(__name__)


async def get_async_session():
    """Get async database session."""
    async with async_session_factory() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()


async def close_db():
    """Close database connections."""
    try:
        await engine.dispose()
        logger.info("Database engine disposed successfully")
    except Exception as e:
        logger.error(f"Error disposing database engine: {e}")


async def _apply_pending_migrations(conn):
    """Apply pending schema migrations that create_all cannot handle."""
    # Migration 1: customers.preferred_dealer_cnpj -> preferred_dealer_id
    result = await conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'customers' AND column_name = 'preferred_dealer_cnpj'"
    ))
    if result.scalar():
        logger.info("Migrating customers.preferred_dealer_cnpj -> preferred_dealer_id")
        await conn.execute(text("ALTER TABLE customers DROP COLUMN preferred_dealer_cnpj"))
        await conn.execute(text(
            "ALTER TABLE customers ADD COLUMN preferred_dealer_id UUID "
            "REFERENCES dealers(id) ON DELETE SET NULL"
        ))
        await conn.execute(text(
            "CREATE INDEX ix_customers_preferred_dealer_id ON customers(preferred_dealer_id)"
        ))
        logger.info("Migration complete: preferred_dealer_id column added")

    # Migration 2: vehicles.customer_id (vehicle-customer ownership)
    result = await conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'vehicles' AND column_name = 'customer_id'"
    ))
    if not result.scalar():
        logger.info("Adding vehicles.customer_id column")
        await conn.execute(text(
            "ALTER TABLE vehicles ADD COLUMN customer_id UUID "
            "REFERENCES customers(id) ON DELETE SET NULL"
        ))
        await conn.execute(text(
            "CREATE INDEX ix_vehicles_customer_id ON vehicles(customer_id)"
        ))
        logger.info("Migration complete: vehicles.customer_id added")

    # Migration 3: parts.name_pt (Portuguese name for UI)
    result = await conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'parts' AND column_name = 'name_pt'"
    ))
    if not result.scalar():
        logger.info("Adding parts.name_pt column")
        await conn.execute(text(
            "ALTER TABLE parts ADD COLUMN name_pt VARCHAR(200)"
        ))
        await conn.execute(text(
            "CREATE INDEX ix_parts_name_pt ON parts(name_pt)"
        ))
        logger.info("Migration complete: parts.name_pt added")

    # Migration 4: crash_events table (persist BeamNG crash data)
    result = await conn.execute(text(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
        "WHERE table_name = 'crash_events')"
    ))
    if not result.scalar():
        logger.info("Creating crash_events table")
        await conn.execute(text("""
            CREATE TABLE crash_events (
                id UUID PRIMARY KEY,
                crash_id VARCHAR(100) NOT NULL UNIQUE,
                event_type VARCHAR(50) NOT NULL,
                vehicle_model VARCHAR(100),
                vehicle_brand VARCHAR(100),
                speed_kmh NUMERIC(8, 2),
                total_damage NUMERIC(5, 4),
                severity VARCHAR(20),
                beamng_timestamp INTEGER,
                event_data JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))
        await conn.execute(text("CREATE INDEX ix_crash_events_crash_id ON crash_events(crash_id)"))
        await conn.execute(text("CREATE INDEX ix_crash_events_severity ON crash_events(severity)"))
        await conn.execute(text("CREATE INDEX ix_crash_events_vehicle_model ON crash_events(vehicle_model)"))
        await conn.execute(text("CREATE INDEX ix_crash_events_created_at ON crash_events(created_at DESC)"))
        logger.info("Migration complete: crash_events table created")


async def initialize_db():
    """Initialize database connection and create tables."""
    try:
        # Test database connection
        async with engine.begin() as conn:
            # Import all models to ensure they are registered
            from src.models import vehicle, damage, part, dealer, appointment, customer, crash_event  # noqa

            # Create all tables
            await conn.run_sync(Base.metadata.create_all)

            # Apply any pending migrations that create_all can't handle
            await _apply_pending_migrations(conn)

        logger.info("Database initialized successfully")

    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise


# ---------------------------------------------------------------------------
# Auto-seed parts from VEHICLE_PARTS.csv on first startup
# ---------------------------------------------------------------------------

_PARTS_CSV_CANDIDATES = [
    Path("/app/VEHICLE_PARTS.csv"),                       # Docker mount
    Path(__file__).parent.parent / "VEHICLE_PARTS.csv",   # backend/VEHICLE_PARTS.csv
    Path(__file__).parent.parent.parent / "VEHICLE_PARTS.csv",  # project root
]


def _find_parts_csv() -> Path | None:
    for p in _PARTS_CSV_CANDIDATES:
        if p.exists():
            return p
    return None


def _parse_brl(price_str: str) -> float:
    cleaned = price_str.replace("R$", "").strip().replace(".", "").replace(",", ".")
    return float(cleaned)


def _category_from_name(name: str) -> str:
    n = name.lower()
    if any(k in n for k in ("engine", "turbocharger", "engine mount")):
        return "engine"
    if any(k in n for k in ("transmission", "shifter")):
        return "transmission"
    if "exhaust" in n:
        return "exhaust"
    if "fuel tank" in n:
        return "fuel_system"
    if "radiator" in n:
        return "cooling"
    if any(k in n for k in ("headlight", "taillight", "drl")):
        return "lighting"
    if any(k in n for k in ("suspension", "strut", "shock", "spring", "sway bar", "spindle", "torsion")):
        return "suspension"
    if "steering" in n:
        return "steering"
    if any(k in n for k in ("half shaft", "differential")):
        return "driveshaft"
    if any(k in n for k in ("seat", "interior", "parcel shelf")):
        return "interior"
    if any(k in n for k in ("windshield", "glass")):
        return "glass"
    if any(k in n for k in ("door", "bumper", "fender", "hood", "mirror", "tailgate", "undertray", "unibody")):
        return "body"
    return "general"


_CAT_PREFIX = {
    "engine": "ENG", "transmission": "TRN", "exhaust": "EXH",
    "fuel_system": "FUL", "cooling": "COL", "lighting": "LGT",
    "suspension": "SUS", "steering": "STR", "driveshaft": "DRV",
    "interior": "INT", "glass": "GLS", "body": "BDY", "general": "GEN",
}


async def seed_parts_if_empty():
    """Seed parts table from CSV if it is empty. Called once on startup."""
    csv_path = _find_parts_csv()
    if csv_path is None:
        logger.warning("VEHICLE_PARTS.csv not found, skipping parts seed")
        return

    async with async_session_factory() as session:
        result = await session.execute(text("SELECT count(*) FROM parts"))
        count = result.scalar() or 0
        if count > 0:
            logger.info(f"Parts table already has {count} rows, skipping seed")
            return

        logger.info(f"Parts table empty — seeding from {csv_path}")
        idx = 0
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    name_en = row["Part (English)"].strip()
                    name_pt = row["Peça (Português BR)"].strip()
                    price_brl = _parse_brl(row["Preço Estimado (BRL)"])
                    minutes = row.get("Tempo Estimado de Substituição (minutos)", "").strip()
                    labor_hours = round(int(minutes) / 60, 2) if minutes else 1.0
                    category = _category_from_name(name_en)
                    idx += 1
                    prefix = _CAT_PREFIX.get(category, "GEN")
                    part_number = f"TCR-{prefix}-{idx:03d}"

                    await session.execute(
                        text("""
                            INSERT INTO parts
                                (id, part_number, name, name_pt, category, price_brl,
                                 labor_hours, availability_status, supplier, description,
                                 created_at, updated_at)
                            VALUES
                                (:id, :pn, :name, :name_pt, :cat, :price,
                                 :labor, 'available', 'VW Parts Brazil', :desc,
                                 NOW(), NOW())
                        """),
                        {
                            "id": str(uuid4()),
                            "pn": part_number,
                            "name": name_en,
                            "name_pt": name_pt,
                            "cat": category,
                            "price": price_brl,
                            "labor": labor_hours,
                            "desc": name_pt,
                        },
                    )
                except Exception as e:
                    logger.error(f"Error seeding part row: {e}")

        await session.commit()
        logger.info(f"Seeded {idx} parts from CSV")


# ---------------------------------------------------------------------------
# Auto-seed core entities (dealers, customer, vehicle) on every startup
# ---------------------------------------------------------------------------

_DEALERS_JSON_CANDIDATES = [
    Path("/app/data/dealers/vw_brazil_dealers.json"),
    Path(__file__).parent.parent / "data" / "dealers" / "vw_brazil_dealers.json",
    Path(__file__).parent.parent.parent / "data" / "dealers" / "vw_brazil_dealers.json",
]

_VEHICLES_JSON_CANDIDATES = [
    Path("/app/data/vehicles/vw_models.json"),
    Path(__file__).parent.parent / "data" / "vehicles" / "vw_models.json",
    Path(__file__).parent.parent.parent / "data" / "vehicles" / "vw_models.json",
]


def _find_json(candidates: list) -> Path | None:
    for p in candidates:
        if p.exists():
            return p
    return None


async def seed_core_entities():
    """Seed dealers, customer, and vehicle with relationships on every startup.

    Idempotent: checks by unique fields before inserting.
    Repairs broken relationships if entities exist but FKs are missing.
    """
    async with async_session_factory() as session:
        # ---- PHASE 1: Seed dealers from JSON ----
        dealers_path = _find_json(_DEALERS_JSON_CANDIDATES)
        if dealers_path is None:
            logger.warning("Dealers JSON not found, skipping dealer seed")
        else:
            with open(dealers_path, "r", encoding="utf-8") as f:
                dealers_data = json.load(f)

            for dealer_key, dealer_info in dealers_data.get("dealers", {}).items():
                name = dealer_info.get("name", dealer_key)
                result = await session.execute(
                    text("SELECT id FROM dealers WHERE name = :name"),
                    {"name": name},
                )
                if result.scalar():
                    continue

                address = dealer_info.get("address", {})
                await session.execute(
                    text("""
                        INSERT INTO dealers
                            (id, name, cnpj, address, city, state, postal_code,
                             phone, email, latitude, longitude,
                             services, working_hours,
                             is_authorized, is_active, created_at, updated_at)
                        VALUES
                            (:id, :name, :cnpj, :address, :city, :state, :postal_code,
                             :phone, :email, :latitude, :longitude,
                             :services, :working_hours,
                             true, true, NOW(), NOW())
                    """),
                    {
                        "id": str(uuid4()),
                        "name": name,
                        "cnpj": dealer_info.get("cnpj"),
                        "address": address.get("street", ""),
                        "city": address.get("city", ""),
                        "state": address.get("state", ""),
                        "postal_code": address.get("zipcode", ""),
                        "phone": dealer_info.get("phone", ""),
                        "email": dealer_info.get("email", ""),
                        "latitude": address.get("latitude"),
                        "longitude": address.get("longitude"),
                        "services": dealer_info.get("services", []),
                        "working_hours": json.dumps(dealer_info.get("opening_hours", {})),
                    },
                )
                logger.info(f"Seeded dealer: {name}")

            await session.commit()
            logger.info("Dealers seed complete")

        # ---- PHASE 2: Seed customer "Valmor Castro" ----
        CUSTOMER_PHONE = "5551984336235"
        CUSTOMER_NAME = "Valmor Castro"

        # Look up Volkswagen Morumbi ID
        result = await session.execute(
            text("SELECT id FROM dealers WHERE name = :name"),
            {"name": "Volkswagen Morumbi"},
        )
        morumbi_id = result.scalar()
        morumbi_id_str = str(morumbi_id) if morumbi_id else None

        result = await session.execute(
            text("SELECT id, preferred_dealer_id FROM customers WHERE phone = :phone"),
            {"phone": CUSTOMER_PHONE},
        )
        row = result.first()

        if row is None:
            customer_id = str(uuid4())
            await session.execute(
                text("""
                    INSERT INTO customers (id, name, phone, preferred_dealer_id, created_at, updated_at)
                    VALUES (:id, :name, :phone, :dealer_id, NOW(), NOW())
                """),
                {
                    "id": customer_id,
                    "name": CUSTOMER_NAME,
                    "phone": CUSTOMER_PHONE,
                    "dealer_id": morumbi_id_str,
                },
            )
            logger.info(f"Seeded customer: {CUSTOMER_NAME}")
        else:
            customer_id = str(row[0])
            existing_dealer_id = row[1]
            if existing_dealer_id is None and morumbi_id_str is not None:
                await session.execute(
                    text("UPDATE customers SET preferred_dealer_id = :dealer_id, updated_at = NOW() WHERE id = :cid"),
                    {"dealer_id": morumbi_id_str, "cid": customer_id},
                )
                logger.info(f"Repaired customer {CUSTOMER_NAME} preferred_dealer -> Volkswagen Morumbi")

        await session.commit()

        # ---- PHASE 3: Seed T-Cross vehicle ----
        BEAMNG_MODEL = "vw_tcross"

        result = await session.execute(
            text("SELECT id, customer_id FROM vehicles WHERE beamng_model = :model"),
            {"model": BEAMNG_MODEL},
        )
        row = result.first()

        if row is None:
            vehicles_path = _find_json(_VEHICLES_JSON_CANDIDATES)
            vehicle_info = {}
            if vehicles_path:
                with open(vehicles_path, "r", encoding="utf-8") as f:
                    vehicles_data = json.load(f)
                vehicle_info = vehicles_data.get("vehicles", {}).get("tcross", {})

            vehicle_id = str(uuid4())
            await session.execute(
                text("""
                    INSERT INTO vehicles (id, model, year, vin, beamng_model, beamng_config, customer_id, created_at, updated_at)
                    VALUES (:id, :model, :year, :vin, :beamng_model, :beamng_config, :customer_id, NOW(), NOW())
                """),
                {
                    "id": vehicle_id,
                    "model": vehicle_info.get("model_name", "T-Cross"),
                    "year": vehicle_info.get("year", 2024),
                    "vin": "9BWZZZ6TZWT000001",
                    "beamng_model": BEAMNG_MODEL,
                    "beamng_config": json.dumps(vehicle_info.get("assemblies", [])),
                    "customer_id": customer_id,
                },
            )
            logger.info(f"Seeded vehicle: T-Cross ({BEAMNG_MODEL})")
        else:
            vehicle_id = str(row[0])
            existing_customer_id = row[1]
            if existing_customer_id is None:
                await session.execute(
                    text("UPDATE vehicles SET customer_id = :customer_id, updated_at = NOW() WHERE id = :vid"),
                    {"customer_id": customer_id, "vid": vehicle_id},
                )
                logger.info(f"Repaired vehicle {BEAMNG_MODEL} customer -> {CUSTOMER_NAME}")

        await session.commit()
        logger.info("Core entities seed complete")