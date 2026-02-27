"""Crash event model for persisting BeamNG crash data."""

from sqlalchemy import Column, String, Integer, Numeric
from sqlalchemy.dialects.postgresql import JSONB

from src.models.base import BaseModel


class CrashEvent(BaseModel):
    """Crash event received from BeamNG Lua mod, persisted to database."""

    __tablename__ = "crash_events"

    # Crash identification
    crash_id = Column(String(100), unique=True, nullable=False, index=True)
    event_type = Column(String(50), nullable=False)

    # Vehicle info (denormalized for quick queries)
    vehicle_model = Column(String(100), nullable=True, index=True)
    vehicle_brand = Column(String(100), nullable=True)

    # Impact summary (extracted for filtering/sorting)
    speed_kmh = Column(Numeric(8, 2), nullable=True)
    total_damage = Column(Numeric(5, 4), nullable=True)
    severity = Column(String(20), nullable=True, index=True)

    # BeamNG unix timestamp
    beamng_timestamp = Column(Integer, nullable=True)

    # Full event payload as JSONB
    event_data = Column(JSONB, nullable=False)

    def __repr__(self):
        return f"<CrashEvent(crash_id={self.crash_id}, severity={self.severity}, total_damage={self.total_damage})>"
