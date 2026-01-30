"""
Appointment Pydantic schemas for VW crash-to-repair simulator.

Provides data validation and serialization for Brazilian dealer appointment operations
including scheduling validation, customer information, and service requirements.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime, date, time
import uuid
import re


class CustomerInfo(BaseModel):
    """Customer information for appointments."""
    
    name: str = Field(..., description="Customer full name", min_length=2, max_length=150)
    cpf: Optional[str] = Field(None, description="Brazilian CPF (individual taxpayer ID)")
    cnpj: Optional[str] = Field(None, description="Brazilian CNPJ (corporate taxpayer ID)")
    phone: str = Field(..., description="Contact phone number")
    email: Optional[str] = Field(None, description="Email address")
    preferred_contact: str = Field("phone", description="Preferred contact method")
    
    @validator('cpf')
    def validate_cpf_format(cls, v):
        """Validate CPF format if provided."""
        if v is None:
            return v
        
        # Remove formatting
        cpf_digits = re.sub(r'[^0-9]', '', v)
        
        if len(cpf_digits) != 11:
            raise ValueError("CPF must have 11 digits")
        
        # Format as XXX.XXX.XXX-XX
        formatted_cpf = f"{cpf_digits[:3]}.{cpf_digits[3:6]}.{cpf_digits[6:9]}-{cpf_digits[9:]}"
        return formatted_cpf
    
    @validator('cnpj')
    def validate_cnpj_format(cls, v):
        """Validate CNPJ format if provided."""
        if v is None:
            return v
        
        # Remove formatting
        cnpj_digits = re.sub(r'[^0-9]', '', v)
        
        if len(cnpj_digits) != 14:
            raise ValueError("CNPJ must have 14 digits")
        
        # Format as XX.XXX.XXX/XXXX-XX
        formatted_cnpj = f"{cnpj_digits[:2]}.{cnpj_digits[2:5]}.{cnpj_digits[5:8]}/{cnpj_digits[8:12]}-{cnpj_digits[12:]}"
        return formatted_cnpj
    
    @validator('preferred_contact')
    def validate_contact_method(cls, v):
        """Validate contact method."""
        valid_methods = ['phone', 'email', 'sms', 'whatsapp']
        if v.lower() not in valid_methods:
            raise ValueError(f"Contact method must be one of: {', '.join(valid_methods)}")
        return v.lower()


class VehicleInfo(BaseModel):
    """Vehicle information for appointments."""
    
    vin: Optional[str] = Field(None, description="Vehicle VIN")
    make: str = Field("Volkswagen", description="Vehicle manufacturer")
    model: str = Field(..., description="Vehicle model")
    year: int = Field(..., ge=1990, le=2030, description="Vehicle year")
    license_plate: Optional[str] = Field(None, description="Brazilian license plate")
    color: Optional[str] = Field(None, description="Vehicle color")
    engine_type: Optional[str] = Field(None, description="Engine type/displacement")
    mileage: Optional[int] = Field(None, ge=0, description="Current mileage")


class AppointmentBase(BaseModel):
    """Base appointment model."""
    
    dealer_cnpj: str = Field(..., description="Dealer CNPJ")
    service_type: str = Field(..., description="Type of service requested")
    appointment_date: date = Field(..., description="Appointment date")
    appointment_time: time = Field(..., description="Appointment time")
    estimated_duration_hours: Optional[float] = Field(None, ge=0.5, le=40, description="Estimated duration")
    priority: str = Field("normal", description="Appointment priority")
    notes: Optional[str] = Field(None, max_length=1000, description="Additional notes")
    
    @validator('appointment_date')
    def validate_future_date(cls, v):
        """Validate appointment is in the future."""
        if v < date.today():
            raise ValueError("Appointment date cannot be in the past")
        return v
    
    @validator('priority')
    def validate_priority(cls, v):
        """Validate priority level."""
        valid_priorities = ['low', 'normal', 'high', 'urgent']
        if v.lower() not in valid_priorities:
            raise ValueError(f"Priority must be one of: {', '.join(valid_priorities)}")
        return v.lower()
    
    @validator('service_type')
    def validate_service_type(cls, v):
        """Validate service type."""
        valid_services = [
            'crash_repair', 'maintenance', 'inspection', 'warranty',
            'diagnostic', 'body_work', 'engine_repair', 'transmission_repair',
            'brake_service', 'tire_service', 'electrical_repair'
        ]
        if v.lower() not in valid_services:
            raise ValueError(f"Service type must be one of: {', '.join(valid_services)}")
        return v.lower()


class AppointmentCreate(AppointmentBase):
    """Schema for creating a new appointment."""
    
    customer_info: CustomerInfo = Field(..., description="Customer information")
    vehicle_info: VehicleInfo = Field(..., description="Vehicle information")
    damage_assessment: Optional[Dict[str, Any]] = Field(None, description="Pre-assessment damage data")
    insurance_info: Optional[Dict[str, Any]] = Field(None, description="Insurance information")
    special_requirements: Optional[List[str]] = Field(default_factory=list, description="Special requirements")
    preferred_technician: Optional[str] = Field(None, description="Preferred technician name")


class AppointmentUpdate(BaseModel):
    """Schema for updating an appointment."""
    
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    service_type: Optional[str] = None
    estimated_duration_hours: Optional[float] = Field(None, ge=0.5, le=40)
    priority: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=1000)
    customer_info: Optional[CustomerInfo] = None
    vehicle_info: Optional[VehicleInfo] = None
    special_requirements: Optional[List[str]] = None


class AppointmentStatus(BaseModel):
    """Appointment status information."""
    
    status: str = Field(..., description="Current appointment status")
    status_description: str = Field(..., description="Human-readable status description")
    last_updated: datetime = Field(..., description="Last status update timestamp")
    next_actions: List[str] = Field(default_factory=list, description="Required next actions")
    can_reschedule: bool = Field(True, description="Whether appointment can be rescheduled")
    can_cancel: bool = Field(True, description="Whether appointment can be cancelled")
    
    @validator('status')
    def validate_status(cls, v):
        """Validate appointment status."""
        valid_statuses = [
            'pending', 'confirmed', 'in_progress', 'completed',
            'cancelled', 'rescheduled', 'no_show'
        ]
        if v.lower() not in valid_statuses:
            raise ValueError(f"Status must be one of: {', '.join(valid_statuses)}")
        return v.lower()


class AppointmentResponse(AppointmentBase):
    """Schema for appointment response."""
    
    id: uuid.UUID = Field(..., description="Appointment unique identifier")
    booking_id: str = Field(..., description="Human-readable booking ID")
    confirmation_number: str = Field(..., description="Confirmation number")
    customer_info: CustomerInfo = Field(..., description="Customer information")
    vehicle_info: VehicleInfo = Field(..., description="Vehicle information")
    dealer_info: Dict[str, Any] = Field(..., description="Dealer information")
    status_info: AppointmentStatus = Field(..., description="Current status")
    cost_estimate: Optional[Dict[str, Any]] = Field(None, description="Service cost estimate")
    technician_assigned: Optional[Dict[str, str]] = Field(None, description="Assigned technician")
    special_requirements: List[str] = Field(default_factory=list, description="Special requirements")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat(),
            time: lambda v: v.strftime('%H:%M'),
            uuid.UUID: lambda v: str(v)
        }


class AppointmentAvailability(BaseModel):
    """Appointment availability information."""
    
    appointment_date: date = Field(..., description="Available date")
    available_slots: List[Dict[str, Any]] = Field(..., description="Available time slots")
    technician_info: Dict[str, Any] = Field(..., description="Technician availability")
    special_notes: List[str] = Field(default_factory=list, description="Special availability notes")
    
    class Config:
        json_encoders = {
            date: lambda v: v.isoformat()
        }


class AvailabilityRequest(BaseModel):
    """Request schema for checking availability."""
    
    dealer_cnpj: str = Field(..., description="Dealer CNPJ")
    service_type: str = Field(..., description="Required service type")
    preferred_dates: List[str] = Field(..., description="Preferred dates (YYYY-MM-DD format)")
    vehicle_data: Optional[VehicleInfo] = Field(None, description="Vehicle information for service requirements")
    
    @validator('preferred_dates')
    def validate_date_formats(cls, v):
        """Validate date formats in preferred dates."""
        for date_str in v:
            try:
                datetime.strptime(date_str, '%Y-%m-%d')
            except ValueError:
                raise ValueError(f"Invalid date format '{date_str}'. Use YYYY-MM-DD format.")
        return v


class BookingConfirmation(BaseModel):
    """Booking confirmation information."""
    
    booking_id: str = Field(..., description="Unique booking identifier")
    confirmation_number: str = Field(..., description="Human-readable confirmation number")
    dealer_info: Dict[str, Any] = Field(..., description="Dealer information")
    appointment_details: Dict[str, Any] = Field(..., description="Appointment details")
    customer_info: CustomerInfo = Field(..., description="Customer information")
    vehicle_info: VehicleInfo = Field(..., description="Vehicle information")
    cost_estimate: Dict[str, Any] = Field(..., description="Service cost estimate")
    special_requirements: List[Dict[str, str]] = Field(..., description="Required documents and preparations")
    next_steps: List[str] = Field(..., description="Next steps for customer")
    booking_created_at: datetime = Field(..., description="Booking creation timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class AppointmentReschedule(BaseModel):
    """Appointment reschedule information."""
    
    new_date: str = Field(..., description="New appointment date (YYYY-MM-DD)")
    new_time: str = Field(..., description="New appointment time (HH:MM)")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for rescheduling")
    
    @validator('new_date')
    def validate_new_date_format(cls, v):
        """Validate new date format."""
        try:
            new_date = datetime.strptime(v, '%Y-%m-%d').date()
            if new_date < date.today():
                raise ValueError("New appointment date cannot be in the past")
        except ValueError as e:
            if "does not match format" in str(e):
                raise ValueError("Date must be in YYYY-MM-DD format")
            raise
        return v
    
    @validator('new_time')
    def validate_new_time_format(cls, v):
        """Validate new time format."""
        try:
            datetime.strptime(v, '%H:%M')
        except ValueError:
            raise ValueError("Time must be in HH:MM format")
        return v


class AppointmentCancellation(BaseModel):
    """Appointment cancellation information."""
    
    reason: Optional[str] = Field(None, max_length=500, description="Reason for cancellation")
    request_refund: bool = Field(False, description="Whether to request deposit refund")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }