"""Vehicle Pydantic schemas for validation and serialization."""

from pydantic import BaseModel, Field
from typing import Optional
import uuid
from datetime import datetime


class VehicleBase(BaseModel):
    """Base vehicle schema."""
    model: str = Field(..., min_length=1, max_length=50)
    year: int = Field(..., ge=1900, le=2030)
    vin: Optional[str] = Field(None, min_length=17, max_length=17)
    beamng_model: Optional[str] = Field(None, max_length=100)
    beamng_config: Optional[str] = None


class VehicleCreate(VehicleBase):
    """Vehicle creation schema."""
    pass


class VehicleUpdate(BaseModel):
    """Vehicle update schema."""
    model: Optional[str] = Field(None, min_length=1, max_length=50)
    year: Optional[int] = Field(None, ge=1900, le=2030)
    vin: Optional[str] = Field(None, min_length=17, max_length=17)
    beamng_model: Optional[str] = Field(None, max_length=100)
    beamng_config: Optional[str] = None


class VehicleResponse(VehicleBase):
    """Vehicle response schema."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True