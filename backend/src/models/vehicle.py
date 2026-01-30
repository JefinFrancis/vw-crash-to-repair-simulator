"""Vehicle model."""

from sqlalchemy import Column, String, Integer, Text
from sqlalchemy.orm import relationship

from src.models.base import BaseModel


class Vehicle(BaseModel):
    """Vehicle model for VW vehicles."""
    
    __tablename__ = "vehicles"
    
    # Vehicle identification
    model = Column(String(50), nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    vin = Column(String(17), unique=True, nullable=True, index=True)
    
    # BeamNG integration
    beamng_model = Column(String(100), nullable=True)
    beamng_config = Column(Text, nullable=True)  # JSON config for BeamNG
    
    # Relationships
    damage_reports = relationship("DamageReport", back_populates="vehicle", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Vehicle(id={self.id}, model={self.model}, year={self.year})>"