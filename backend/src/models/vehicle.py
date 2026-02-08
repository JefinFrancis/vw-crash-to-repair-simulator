"""Vehicle model."""

from sqlalchemy import Column, String, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

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

    # Owner relationship (many-to-one: many vehicles can belong to one customer)
    customer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Relationships
    customer = relationship("Customer", back_populates="vehicles")
    damage_reports = relationship("DamageReport", back_populates="vehicle", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Vehicle(id={self.id}, model={self.model}, year={self.year}, customer_id={self.customer_id})>"