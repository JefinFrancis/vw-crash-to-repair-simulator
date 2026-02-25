"""Customer model for VW Crash-to-Repair Simulator.

This module defines the Customer model representing customers who book
appointments for vehicle repairs at VW dealerships.
"""

from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import BaseModel


class Customer(BaseModel):
    """Customer entity for the VW repair system.

    Represents a customer who owns vehicles in the VW system.
    Stores customer contact information and their preferred dealership.

    Attributes:
        name: Customer's full name
        phone: Mobile phone number in Brazilian format (5511999999999)
        preferred_dealer_id: UUID of the customer's preferred dealer
        preferred_dealer: Relationship to the Dealer model
        vehicles: Relationship to customer's vehicles (one-to-many)
    """

    __tablename__ = "customers"

    # Customer information
    name = Column(String(200), nullable=False, index=True)
    phone = Column(String(13), nullable=False, unique=True, index=True)  # Brazilian mobile: 5511999999999

    # Preferred dealer relationship
    preferred_dealer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("dealers.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Relationships
    preferred_dealer = relationship(
        "Dealer",
        backref="preferred_customers",
        foreign_keys=[preferred_dealer_id]
    )

    vehicles = relationship(
        "Vehicle",
        back_populates="customer",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        """String representation of the customer."""
        return f"<Customer(id={self.id}, name='{self.name}', phone='{self.phone}')>"
