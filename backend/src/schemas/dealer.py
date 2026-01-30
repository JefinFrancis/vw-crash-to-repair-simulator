"""
Dealer Pydantic schemas for VW crash-to-repair simulator.

Provides data validation and serialization for Brazilian VW dealer operations
including CNPJ validation, location data, and service capabilities.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import re


class DealerBase(BaseModel):
    """Base dealer model with common fields."""
    
    name: str = Field(..., description="Dealer business name", min_length=3, max_length=200)
    cnpj: str = Field(..., description="Brazilian CNPJ (corporate taxpayer ID)")
    address: str = Field(..., description="Dealer street address")
    city: str = Field(..., description="City name")
    state: str = Field(..., description="Brazilian state code (2 letters)")
    postal_code: str = Field(..., description="Brazilian postal code (CEP)")
    phone: str = Field(..., description="Primary contact phone number")
    email: Optional[str] = Field(None, description="Contact email address")
    latitude: Optional[float] = Field(None, description="Geographic latitude")
    longitude: Optional[float] = Field(None, description="Geographic longitude")
    
    @validator('cnpj')
    def validate_cnpj_format(cls, v):
        """Validate CNPJ format."""
        if not v:
            raise ValueError("CNPJ is required")
        
        # Remove formatting
        cnpj_digits = re.sub(r'[^0-9]', '', v)
        
        if len(cnpj_digits) != 14:
            raise ValueError("CNPJ must have 14 digits")
        
        # Restore formatting
        formatted_cnpj = f"{cnpj_digits[:2]}.{cnpj_digits[2:5]}.{cnpj_digits[5:8]}/{cnpj_digits[8:12]}-{cnpj_digits[12:]}"
        return formatted_cnpj
    
    @validator('state')
    def validate_state_code(cls, v):
        """Validate Brazilian state code."""
        valid_states = {
            'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
            'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
            'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
        }
        
        if v.upper() not in valid_states:
            raise ValueError(f"Invalid state code. Must be one of: {', '.join(sorted(valid_states))}")
        
        return v.upper()
    
    @validator('postal_code')
    def validate_postal_code(cls, v):
        """Validate Brazilian postal code (CEP)."""
        if not v:
            return v
        
        # Remove formatting
        cep_digits = re.sub(r'[^0-9]', '', v)
        
        if len(cep_digits) != 8:
            raise ValueError("CEP must have 8 digits")
        
        # Format as XXXXX-XXX
        formatted_cep = f"{cep_digits[:5]}-{cep_digits[5:]}"
        return formatted_cep
    
    @validator('latitude')
    def validate_latitude(cls, v):
        """Validate latitude range for Brazil."""
        if v is not None and not (-33.75 <= v <= 5.27):
            raise ValueError("Latitude must be within Brazil's geographic bounds")
        return v
    
    @validator('longitude')
    def validate_longitude(cls, v):
        """Validate longitude range for Brazil."""
        if v is not None and not (-73.98 <= v <= -34.79):
            raise ValueError("Longitude must be within Brazil's geographic bounds")
        return v


class ServiceCapability(BaseModel):
    """Service capability model."""
    
    service_type: str = Field(..., description="Type of service offered")
    description: str = Field(..., description="Service description")
    available: bool = Field(True, description="Whether service is currently available")
    estimated_duration_hours: Optional[float] = Field(None, description="Estimated service duration in hours")
    price_range_min: Optional[float] = Field(None, description="Minimum service price in BRL")
    price_range_max: Optional[float] = Field(None, description="Maximum service price in BRL")


class WorkingHours(BaseModel):
    """Working hours model for a specific day."""
    
    day: str = Field(..., description="Day of the week")
    start_time: Optional[str] = Field(None, description="Opening time (HH:MM format)")
    end_time: Optional[str] = Field(None, description="Closing time (HH:MM format)")
    is_open: bool = Field(True, description="Whether dealer is open on this day")
    
    @validator('start_time', 'end_time')
    def validate_time_format(cls, v):
        """Validate time format."""
        if v is not None:
            try:
                hour, minute = map(int, v.split(':'))
                if not (0 <= hour <= 23 and 0 <= minute <= 59):
                    raise ValueError("Invalid time format")
            except ValueError:
                raise ValueError("Time must be in HH:MM format")
        return v


class DealerCreate(DealerBase):
    """Schema for creating a new dealer."""
    
    service_capabilities: Optional[List[ServiceCapability]] = Field(default_factory=list, description="Available services")
    working_hours: Optional[List[WorkingHours]] = Field(default_factory=list, description="Operating hours")
    specializations: Optional[List[str]] = Field(default_factory=list, description="Dealer specializations")
    technician_count: Optional[int] = Field(None, ge=1, le=100, description="Number of technicians")
    service_bay_count: Optional[int] = Field(None, ge=1, le=50, description="Number of service bays")


class DealerUpdate(BaseModel):
    """Schema for updating a dealer."""
    
    name: Optional[str] = Field(None, min_length=3, max_length=200)
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    service_capabilities: Optional[List[ServiceCapability]] = None
    working_hours: Optional[List[WorkingHours]] = None
    specializations: Optional[List[str]] = None
    technician_count: Optional[int] = Field(None, ge=1, le=100)
    service_bay_count: Optional[int] = Field(None, ge=1, le=50)


class DealerResponse(BaseModel):
    """Schema for dealer response."""
    
    id: uuid.UUID = Field(..., description="Dealer unique identifier")
    name: str = Field(..., description="Dealer business name")
    cnpj: Optional[str] = Field(None, description="Brazilian CNPJ (corporate taxpayer ID)")
    address: str = Field("", description="Dealer street address")
    city: str = Field("", description="City name")
    state: str = Field("", description="Brazilian state code (2 letters)")
    postal_code: str = Field("", description="Brazilian postal code (CEP)")
    phone: str = Field("", description="Primary contact phone number")
    email: Optional[str] = Field(None, description="Contact email address")
    website: Optional[str] = Field(None, description="Dealer website URL")
    latitude: Optional[float] = Field(None, description="Geographic latitude")
    longitude: Optional[float] = Field(None, description="Geographic longitude")
    services: Optional[List[str]] = Field(default_factory=list, description="Available services")
    specialties: Optional[List[str]] = Field(default_factory=list, description="Dealer specialties")
    working_hours: Optional[Any] = Field(None, description="Operating hours")
    is_authorized: bool = Field(True, description="Whether dealer is VW authorized")
    is_active: bool = Field(True, description="Whether dealer is active")
    distance_km: Optional[float] = Field(None, description="Distance from search location in kilometers")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            uuid.UUID: lambda v: str(v)
        }


class DealerSearchFilters(BaseModel):
    """Schema for dealer search filters."""
    
    state: Optional[str] = Field(None, description="Filter by state")
    city: Optional[str] = Field(None, description="Filter by city")
    service_type: Optional[str] = Field(None, description="Required service type")
    latitude: Optional[float] = Field(None, description="Search center latitude")
    longitude: Optional[float] = Field(None, description="Search center longitude")
    radius_km: Optional[float] = Field(None, ge=1, le=500, description="Search radius in kilometers")
    max_distance_km: Optional[float] = Field(None, ge=1, description="Maximum distance filter")
    min_rating: Optional[float] = Field(None, ge=0, le=5, description="Minimum rating filter")


class DealerPerformanceMetrics(BaseModel):
    """Schema for dealer performance metrics."""
    
    average_rating: float = Field(0.0, ge=0, le=5, description="Average customer rating")
    total_reviews: int = Field(0, ge=0, description="Total number of reviews")
    completion_rate: float = Field(0.0, ge=0, le=1, description="Service completion rate (0-1)")
    average_service_time_hours: float = Field(0.0, ge=0, description="Average service duration")
    customer_satisfaction_score: float = Field(0.0, ge=0, le=10, description="Customer satisfaction (0-10)")
    repeat_customer_rate: float = Field(0.0, ge=0, le=1, description="Repeat customer rate (0-1)")
    on_time_delivery_rate: float = Field(0.0, ge=0, le=1, description="On-time delivery rate (0-1)")
    warranty_claim_rate: float = Field(0.0, ge=0, le=1, description="Warranty claim rate (0-1)")
    monthly_service_volume: int = Field(0, ge=0, description="Monthly service volume")
    
    class Config:
        json_encoders = {
            float: lambda v: round(v, 2) if v is not None else None
        }