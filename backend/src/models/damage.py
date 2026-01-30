"""Damage report models."""

from sqlalchemy import Column, String, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from src.models.base import BaseModel


class DamageReport(BaseModel):
    """Damage report from BeamNG analysis."""
    
    __tablename__ = "damage_reports"
    
    # Foreign keys
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False, index=True)
    
    # Simulation data
    simulation_id = Column(String(100), unique=True, nullable=True, index=True)
    beamng_data = Column(JSONB, nullable=True)  # Raw BeamNG telemetry data
    
    # Analysis results
    overall_severity = Column(String(20), nullable=True, index=True)  # low, medium, high, critical
    
    # Relationships
    vehicle = relationship("Vehicle", back_populates="damage_reports")
    damage_components = relationship("DamageComponent", back_populates="damage_report", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<DamageReport(id={self.id}, vehicle_id={self.vehicle_id}, severity={self.overall_severity})>"


class DamageComponent(BaseModel):
    """Individual damaged component."""
    
    __tablename__ = "damage_components"
    
    # Foreign keys
    damage_report_id = Column(UUID(as_uuid=True), ForeignKey("damage_reports.id"), nullable=False, index=True)
    
    # Component information
    component_name = Column(String(100), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)  # low, medium, high, critical
    damage_type = Column(String(50), nullable=True)  # dent, scratch, crack, broken, etc.
    
    # Repair information
    repair_required = Column(Boolean, default=True, nullable=False)
    replacement_required = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    damage_report = relationship("DamageReport", back_populates="damage_components")
    
    def __repr__(self):
        return f"<DamageComponent(id={self.id}, component={self.component_name}, severity={self.severity})>"