"""Appointment booking models."""

from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from src.models.base import BaseModel


class Appointment(BaseModel):
    """Repair appointment at VW dealer."""
    
    __tablename__ = "appointments"
    
    # Foreign keys
    dealer_id = Column(UUID(as_uuid=True), ForeignKey("dealers.id"), nullable=False, index=True)
    damage_report_id = Column(UUID(as_uuid=True), ForeignKey("damage_reports.id"), nullable=True, index=True)
    
    # Customer information
    customer_name = Column(String(200), nullable=False)
    customer_phone = Column(String(20), nullable=True)
    customer_email = Column(String(100), nullable=True)
    customer_cpf = Column(String(14), nullable=True, index=True)  # Brazilian individual tax ID
    
    # Vehicle information
    vehicle_vin = Column(String(17), nullable=True, index=True)
    vehicle_license_plate = Column(String(8), nullable=True, index=True)
    
    # Appointment details
    scheduled_date = Column(DateTime(timezone=True), nullable=False, index=True)
    estimated_duration_hours = Column(String(10), nullable=True)
    service_type = Column(String(50), nullable=False, index=True)  # inspection, repair, maintenance
    
    # Status tracking
    status = Column(String(20), default="scheduled", nullable=False, index=True)  # scheduled, confirmed, in_progress, completed, cancelled
    notes = Column(Text, nullable=True)
    
    # Relationships
    dealer = relationship("Dealer", back_populates="appointments")
    
    def __repr__(self):
        return f"<Appointment(id={self.id}, customer={self.customer_name}, status={self.status})>"