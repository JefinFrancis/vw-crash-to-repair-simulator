"""Customer schemas for API request/response validation.

This module defines Pydantic models for customer data validation,
ensuring proper format for Brazilian phone numbers and CNPJ codes.
"""

import re
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class CustomerBase(BaseModel):
    """Base customer schema with common fields and validators."""

    name: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Customer's full name"
    )
    phone: str = Field(
        ...,
        pattern=r"^55\d{2}9\d{8}$",
        description="Mobile phone number in Brazilian format (5511999999999)"
    )
    preferred_dealer_cnpj: Optional[str] = Field(
        None,
        pattern=r"^\d{14}$",
        description="CNPJ of the customer's preferred dealer (14 digits)"
    )

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Validate Brazilian mobile phone number format.

        Format: 55 (country code) + 2 digits (area code) + 9 + 8 digits
        Example: 5511999999999

        Args:
            v: Phone number string

        Returns:
            Validated phone number

        Raises:
            ValueError: If phone format is invalid
        """
        if not re.match(r"^55\d{2}9\d{8}$", v):
            raise ValueError(
                "Phone must be in Brazilian mobile format: 55 + area code (2 digits) + 9 + number (8 digits). "
                "Example: 5511999999999"
            )
        return v

    @field_validator("preferred_dealer_cnpj")
    @classmethod
    def validate_cnpj(cls, v: Optional[str]) -> Optional[str]:
        """Validate CNPJ format.

        Args:
            v: CNPJ string

        Returns:
            Validated CNPJ or None

        Raises:
            ValueError: If CNPJ format is invalid
        """
        if v is None:
            return v

        # Remove any non-digit characters
        cnpj = re.sub(r"\D", "", v)

        if len(cnpj) != 14:
            raise ValueError("CNPJ must have exactly 14 digits")

        return cnpj


class CustomerCreate(CustomerBase):
    """Schema for creating a new customer.

    Used in POST /customers/ requests.
    """
    pass


class CustomerUpdate(BaseModel):
    """Schema for updating a customer.

    All fields are optional to allow partial updates.
    Used in PUT/PATCH /customers/{id} requests.
    """

    name: Optional[str] = Field(
        None,
        min_length=2,
        max_length=200,
        description="Customer's full name"
    )
    phone: Optional[str] = Field(
        None,
        pattern=r"^55\d{2}9\d{8}$",
        description="Mobile phone number in Brazilian format"
    )
    preferred_dealer_cnpj: Optional[str] = Field(
        None,
        pattern=r"^\d{14}$",
        description="CNPJ of the customer's preferred dealer"
    )

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        """Validate Brazilian mobile phone number format."""
        if v is None:
            return v

        if not re.match(r"^55\d{2}9\d{8}$", v):
            raise ValueError(
                "Phone must be in Brazilian mobile format: 55 + area code (2 digits) + 9 + number (8 digits). "
                "Example: 5511999999999"
            )
        return v

    @field_validator("preferred_dealer_cnpj")
    @classmethod
    def validate_cnpj(cls, v: Optional[str]) -> Optional[str]:
        """Validate CNPJ format."""
        if v is None:
            return v

        cnpj = re.sub(r"\D", "", v)

        if len(cnpj) != 14:
            raise ValueError("CNPJ must have exactly 14 digits")

        return cnpj


class CustomerResponse(CustomerBase):
    """Schema for customer responses.

    Includes read-only fields like id and timestamps.
    Used in GET responses.
    """

    id: str = Field(..., description="Customer UUID")
    created_at: datetime = Field(..., description="Customer creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        """Pydantic configuration."""
        from_attributes = True  # Enable ORM mode for SQLAlchemy compatibility


class CustomerListResponse(BaseModel):
    """Schema for paginated customer list responses."""

    customers: list[CustomerResponse] = Field(..., description="List of customers")
    total: int = Field(..., description="Total number of customers")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Items per page")

    class Config:
        """Pydantic configuration."""
        from_attributes = True
