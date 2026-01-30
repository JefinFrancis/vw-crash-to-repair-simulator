"""Part Pydantic schemas for validation and serialization."""

from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from datetime import datetime
from decimal import Decimal


class PartBase(BaseModel):
    """Base part schema."""
    part_number: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: str = Field(..., max_length=50)
    price_brl: Decimal = Field(..., ge=0)
    labor_hours: Optional[Decimal] = Field(None, ge=0)
    supplier: Optional[str] = Field(None, max_length=100)
    availability_status: str = Field(default="available", max_length=20)
    vehicle_models: Optional[List[str]] = None


class PartCreate(PartBase):
    """Part creation schema."""
    pass


class PartUpdate(BaseModel):
    """Part update schema."""
    part_number: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=50)
    price_brl: Optional[Decimal] = Field(None, ge=0)
    labor_hours: Optional[Decimal] = Field(None, ge=0)
    supplier: Optional[str] = Field(None, max_length=100)
    availability_status: Optional[str] = Field(None, max_length=20)
    vehicle_models: Optional[List[str]] = None


class PartResponse(PartBase):
    """Part response schema."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True