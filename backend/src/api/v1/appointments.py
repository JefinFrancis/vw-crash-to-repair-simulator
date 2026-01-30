"""
Appointments API endpoints for VW crash simulation.

Provides comprehensive appointment management endpoints with Brazilian dealer scheduling,
CNPJ validation, availability checking, and appointment booking with compliance features.
"""

from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import List, Optional, Dict, Any
import uuid
import structlog

from ..dependencies import AppointmentServiceDep
from ...schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from ...utils.exceptions import ValidationException, ServiceException

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.post("/check-availability", response_model=Dict[str, Any])
async def check_dealer_availability(
    availability_data: Dict[str, Any],
    appointment_service: AppointmentServiceDep
) -> Dict[str, Any]:
    """
    Check appointment availability at a VW dealer.
    
    Checks dealer availability for specified dates and service types
    with Brazilian business hours and scheduling requirements.
    """
    try:
        dealer_cnpj = availability_data.get("dealer_cnpj")
        service_type = availability_data.get("service_type")
        preferred_dates = availability_data.get("preferred_dates", [])
        vehicle_data = availability_data.get("vehicle_data")
        
        logger.info("Checking dealer availability", dealer_cnpj=dealer_cnpj, service_type=service_type)
        
        availability_result = await appointment_service.check_dealer_availability(
            dealer_cnpj=dealer_cnpj,
            service_type=service_type,
            preferred_dates=preferred_dates,
            vehicle_data=vehicle_data
        )
        
        logger.info("Successfully checked dealer availability", dealer_cnpj=dealer_cnpj, 
                   available_slots=len(availability_result.get('availability', [])))
        return availability_result
        
    except ValidationException as e:
        logger.warning("Availability check validation error", error=str(e), dealer_cnpj=dealer_cnpj)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Validation Error", "message": str(e)}
        )
    except ServiceException as e:
        logger.error("Availability check service error", error=str(e), dealer_cnpj=dealer_cnpj)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Service Error", "message": str(e)}
        )
    except Exception as e:
        logger.error("Unexpected error checking availability", error=str(e), dealer_cnpj=dealer_cnpj, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to check dealer availability"}
        )


@router.post("/book", response_model=Dict[str, Any])
async def book_appointment(
    booking_data: Dict[str, Any],
    appointment_service: AppointmentServiceDep
) -> Dict[str, Any]:
    """
    Book an appointment at a VW dealer.
    
    Creates appointment booking with Brazilian compliance requirements,
    document validation, and confirmation details.
    """
    try:
        dealer_cnpj = booking_data.get("dealer_cnpj")
        service_type = booking_data.get("service_type")
        appointment_date = booking_data.get("appointment_date")
        
        logger.info("Booking appointment", dealer_cnpj=dealer_cnpj, service_type=service_type, date=appointment_date)
        
        booking_confirmation = await appointment_service.book_appointment(booking_data)
        
        booking_id = booking_confirmation.get('booking_id')
        logger.info("Successfully booked appointment", booking_id=booking_id, dealer_cnpj=dealer_cnpj)
        return booking_confirmation
        
    except ValidationException as e:
        logger.warning("Appointment booking validation error", error=str(e), dealer_cnpj=dealer_cnpj)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Validation Error", "message": str(e)}
        )
    except ServiceException as e:
        logger.error("Appointment booking service error", error=str(e), dealer_cnpj=dealer_cnpj)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Service Error", "message": str(e)}
        )
    except Exception as e:
        logger.error("Unexpected error booking appointment", error=str(e), dealer_cnpj=dealer_cnpj, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to book appointment"}
        )


@router.get("/{booking_id}/status", response_model=Dict[str, Any])
async def get_appointment_status(
    booking_id: str,
    appointment_service: AppointmentServiceDep
) -> Dict[str, Any]:
    """
    Get appointment status and details.
    
    Returns current appointment status, next actions, and contact information.
    """
    try:
        logger.info("Getting appointment status", booking_id=booking_id)
        
        status_info = await appointment_service.get_appointment_status(booking_id)
        
        logger.info("Successfully retrieved appointment status", booking_id=booking_id, 
                   status=status_info.get('status'))
        return status_info
        
    except Exception as e:
        logger.error("Unexpected error getting appointment status", error=str(e), booking_id=booking_id, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to get appointment status"}
        )


@router.put("/{booking_id}/reschedule", response_model=Dict[str, Any])
async def reschedule_appointment(
    booking_id: str,
    reschedule_data: Dict[str, Any],
    appointment_service: AppointmentServiceDep
) -> Dict[str, Any]:
    """
    Reschedule an existing appointment.
    
    Updates appointment date and time with validation and confirmation.
    """
    try:
        new_date = reschedule_data.get("new_date")
        new_time = reschedule_data.get("new_time")
        reason = reschedule_data.get("reason")
        
        logger.info("Rescheduling appointment", booking_id=booking_id, new_date=new_date, new_time=new_time)
        
        reschedule_result = await appointment_service.reschedule_appointment(
            booking_id=booking_id,
            new_date=new_date,
            new_time=new_time,
            reason=reason
        )
        
        logger.info("Successfully rescheduled appointment", booking_id=booking_id)
        return reschedule_result
        
    except ValidationException as e:
        logger.warning("Appointment reschedule validation error", error=str(e), booking_id=booking_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Validation Error", "message": str(e)}
        )
    except Exception as e:
        logger.error("Unexpected error rescheduling appointment", error=str(e), booking_id=booking_id, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to reschedule appointment"}
        )


@router.delete("/{booking_id}", response_model=Dict[str, Any])
async def cancel_appointment(
    booking_id: str,
    appointment_service: AppointmentServiceDep,
    cancellation_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Cancel an existing appointment.
    
    Cancels appointment with optional reason and refund information.
    """
    try:
        reason = cancellation_data.get("reason") if cancellation_data else None
        
        logger.info("Cancelling appointment", booking_id=booking_id, reason=reason)
        
        cancellation_result = await appointment_service.cancel_appointment(
            booking_id=booking_id,
            reason=reason
        )
        
        logger.info("Successfully cancelled appointment", booking_id=booking_id)
        return cancellation_result
        
    except Exception as e:
        logger.error("Unexpected error cancelling appointment", error=str(e), booking_id=booking_id, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "message": "Failed to cancel appointment"}
        )