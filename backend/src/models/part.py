"""VW parts catalog models."""

from sqlalchemy import Column, String, Text, Numeric, Boolean, ARRAY
from sqlalchemy.dialects.postgresql import ARRAY

from src.models.base import BaseModel


class Part(BaseModel):
    """VW parts catalog."""
    
    __tablename__ = "parts"
    
    # Part identification
    part_number = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    category = Column(String(50), nullable=True, index=True)
    
    # Compatibility
    vehicle_models = Column(ARRAY(String), nullable=True)  # Array of compatible VW models
    
    # Pricing (Brazilian Real)
    price_brl = Column(Numeric(10, 2), nullable=False, index=True)
    labor_hours = Column(Numeric(4, 2), default=0, nullable=False)
    
    # Availability
    availability_status = Column(String(20), default="available", nullable=False, index=True)
    supplier = Column(String(100), nullable=True, index=True)
    
    # Additional information
    description = Column(Text, nullable=True)
    technical_specs = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<Part(id={self.id}, part_number={self.part_number}, name={self.name})>"