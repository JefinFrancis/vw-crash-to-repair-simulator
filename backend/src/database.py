"""Database setup and configuration for async SQLAlchemy."""

import csv
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
    # Check if customers table has old preferred_dealer_cnpj column
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


async def initialize_db():
    """Initialize database connection and create tables."""
    try:
        # Test database connection
        async with engine.begin() as conn:
            # Import all models to ensure they are registered
            from src.models import vehicle, damage, part, dealer, appointment, customer  # noqa

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