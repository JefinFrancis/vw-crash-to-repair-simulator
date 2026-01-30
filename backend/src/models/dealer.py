"""VW dealer network models."""

from sqlalchemy import Column, String, Text, Numeric, Boolean, ARRAY
from sqlalchemy.orm import relationship

from src.models.base import BaseModel


class Dealer(BaseModel):
    """VW dealer in Brazil."""
    
    __tablename__ = "dealers"
    
    # Dealer identification
    name = Column(String(200), nullable=False, index=True)
    cnpj = Column(String(18), unique=True, nullable=True, index=True)  # Brazilian tax ID
    
    # Location
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False, index=True)
    state = Column(String(2), nullable=False, index=True)  # Brazilian state code
    postal_code = Column(String(9), nullable=True, index=True)  # CEP format
    
    # Contact information
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    website = Column(String(200), nullable=True)
    
    # Location coordinates
    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)
    
    # Services offered
    services = Column(ARRAY(String), nullable=True)  # Array of service types
    specialties = Column(ARRAY(String), nullable=True)  # Array of specialties
    
    # Business information
    working_hours = Column(Text, nullable=True)  # JSON string with schedule
    is_authorized = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    appointments = relationship("Appointment", back_populates="dealer", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Dealer(id={self.id}, name={self.name}, city={self.city})>"