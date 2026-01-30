"""
Appointment repository implementation for VW crash-to-repair simulator.

Provides appointment scheduling operations for Brazilian VW dealers,
including availability management and customer data handling.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from datetime import datetime, timedelta

from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

# Temporary placeholders until schemas are created
from typing import Dict, Any as AppointmentCreate, Any as AppointmentUpdate
from .base import BaseRepository

logger = logging.getLogger(__name__)


class AppointmentRepository:
    """
    Repository for Appointment model with Brazilian dealer operations.
    
    Handles appointment scheduling, availability management, and customer
    data for VW repair services in Brazil.
    """

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def get_by_unique_field(self, field_name: str, field_value: Any) -> Optional[Appointment]:
        """
        Get appointment by unique identifier (typically by ID or confirmation number).
        
        Args:
            field_name: Field name to search by
            field_value: Field value to search for
            
        Returns:
            Appointment instance or None if not found
        """
        try:
            if not hasattr(self.model, field_name):
                raise ValueError(f"Invalid field name: {field_name}")
            
            query = select(self.model).where(
                getattr(self.model, field_name) == field_value
            ).options(selectinload(self.model.dealer))
            
            result = await self.db_session.execute(query)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Error getting appointment by {field_name} {field_value}: {str(e)}")
            raise

    async def get_by_dealer_id(self, dealer_id: UUID, skip: int = 0, limit: int = 100) -> List[Appointment]:
        """
        Get appointments for a specific dealer.
        
        Args:
            dealer_id: Dealer UUID
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of appointments for the dealer
        """
        try:
            query = select(self.model).where(
                self.model.dealer_id == dealer_id
            ).order_by(self.model.scheduled_date).offset(skip).limit(limit).options(
                selectinload(self.model.dealer)
            )
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting appointments for dealer {dealer_id}: {str(e)}")
            raise

    async def get_appointments_by_date_range(
        self, 
        start_date: datetime, 
        end_date: datetime,
        dealer_id: Optional[UUID] = None
    ) -> List[Appointment]:
        """
        Get appointments within a specific date range.
        
        Args:
            start_date: Start of date range
            end_date: End of date range
            dealer_id: Optional dealer ID to filter by
            
        Returns:
            List of appointments in the date range
        """
        try:
            query = select(self.model).where(
                and_(
                    self.model.scheduled_date >= start_date,
                    self.model.scheduled_date <= end_date
                )
            )
            
            if dealer_id:
                query = query.where(self.model.dealer_id == dealer_id)
            
            query = query.order_by(self.model.scheduled_date).options(
                selectinload(self.model.dealer)
            )
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting appointments by date range: {str(e)}")
            raise

    async def get_todays_appointments(self, dealer_id: Optional[UUID] = None) -> List[Appointment]:
        """
        Get appointments scheduled for today.
        
        Args:
            dealer_id: Optional dealer ID to filter by
            
        Returns:
            List of today's appointments
        """
        try:
            today = datetime.now().date()
            start_time = datetime.combine(today, datetime.min.time())
            end_time = datetime.combine(today, datetime.max.time())
            
            return await self.get_appointments_by_date_range(
                start_time, end_time, dealer_id
            )
            
        except Exception as e:
            logger.error(f"Error getting today's appointments: {str(e)}")
            raise

    async def get_upcoming_appointments(
        self, 
        days_ahead: int = 7, 
        dealer_id: Optional[UUID] = None
    ) -> List[Appointment]:
        """
        Get upcoming appointments within specified days.
        
        Args:
            days_ahead: Number of days to look ahead
            dealer_id: Optional dealer ID to filter by
            
        Returns:
            List of upcoming appointments
        """
        try:
            start_date = datetime.utcnow()
            end_date = start_date + timedelta(days=days_ahead)
            
            return await self.get_appointments_by_date_range(
                start_date, end_date, dealer_id
            )
            
        except Exception as e:
            logger.error(f"Error getting upcoming appointments: {str(e)}")
            raise

    async def search_by_customer_info(self, search_term: str) -> List[Appointment]:
        """
        Search appointments by customer information (name, phone, email, CPF).
        
        Args:
            search_term: Text to search for in customer data
            
        Returns:
            List of matching appointments
        """
        try:
            search_pattern = f"%{search_term.lower()}%"
            
            # Search in customer_data JSONB field
            query = select(self.model).where(
                or_(
                    func.lower(self.model.customer_data['name'].astext).like(search_pattern),
                    func.lower(self.model.customer_data['email'].astext).like(search_pattern),
                    func.lower(self.model.customer_data['phone'].astext).like(search_pattern),
                    func.lower(self.model.customer_data['cpf'].astext).like(search_pattern)
                )
            ).options(selectinload(self.model.dealer))
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error searching appointments by customer info '{search_term}': {str(e)}")
            raise

    async def get_available_slots(
        self, 
        dealer_id: UUID, 
        date: datetime, 
        duration_minutes: int = 120
    ) -> List[datetime]:
        """
        Get available appointment slots for a dealer on a specific date.
        
        Args:
            dealer_id: Dealer UUID
            date: Target date
            duration_minutes: Appointment duration in minutes
            
        Returns:
            List of available appointment times
        """
        try:
            # Get existing appointments for the day
            start_of_day = datetime.combine(date.date(), datetime.min.time())
            end_of_day = datetime.combine(date.date(), datetime.max.time())
            
            existing_appointments = await self.get_appointments_by_date_range(
                start_of_day, end_of_day, dealer_id
            )
            
            # Define business hours (9 AM to 6 PM)
            business_start = datetime.combine(date.date(), datetime.min.time().replace(hour=9))
            business_end = datetime.combine(date.date(), datetime.min.time().replace(hour=18))
            
            # Generate potential slots every 30 minutes
            available_slots = []
            current_time = business_start
            
            while current_time + timedelta(minutes=duration_minutes) <= business_end:
                # Check if this slot conflicts with existing appointments
                slot_end = current_time + timedelta(minutes=duration_minutes)
                
                conflict = any(
                    (
                        appointment.scheduled_date < slot_end and
                        appointment.scheduled_date + timedelta(minutes=duration_minutes) > current_time
                    )
                    for appointment in existing_appointments
                )
                
                if not conflict:
                    available_slots.append(current_time)
                
                current_time += timedelta(minutes=30)
            
            return available_slots
            
        except Exception as e:
            logger.error(f"Error getting available slots for dealer {dealer_id}: {str(e)}")
            raise

    async def get_appointment_statistics(self, dealer_id: Optional[UUID] = None) -> Dict[str, Any]:
        """
        Get appointment statistics for reporting.
        
        Args:
            dealer_id: Optional dealer ID to filter by
            
        Returns:
            Dictionary with appointment statistics
        """
        try:
            query = select(self.model)
            if dealer_id:
                query = query.where(self.model.dealer_id == dealer_id)
            
            # Get total appointments
            total_query = select(func.count(self.model.id))
            if dealer_id:
                total_query = total_query.where(self.model.dealer_id == dealer_id)
            
            total_result = await self.db_session.execute(total_query)
            total_appointments = total_result.scalar() or 0
            
            # Get appointments by status
            status_query = select(
                self.model.status,
                func.count(self.model.id).label('count')
            ).group_by(self.model.status)
            
            if dealer_id:
                status_query = status_query.where(self.model.dealer_id == dealer_id)
            
            status_result = await self.db_session.execute(status_query)
            status_counts = {row[0]: row[1] for row in status_result.fetchall()}
            
            return {
                'total_appointments': total_appointments,
                'status_breakdown': status_counts,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting appointment statistics: {str(e)}")
            raise

    async def update_status(self, appointment_id: UUID, new_status: str) -> Optional[Appointment]:
        """
        Update appointment status.
        
        Args:
            appointment_id: Appointment UUID
            new_status: New status ('scheduled', 'confirmed', 'completed', 'cancelled')
            
        Returns:
            Updated appointment or None if not found
        """
        try:
            return await self.update(
                appointment_id,
                {'status': new_status, 'updated_at': datetime.utcnow()}
            )
            
        except Exception as e:
            logger.error(f"Error updating status for appointment {appointment_id}: {str(e)}")
            raise