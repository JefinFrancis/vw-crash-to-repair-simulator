"""
Dealer repository implementation for VW crash-to-repair simulator.

Provides dealer-specific database operations including CNPJ validation,
Brazilian location search, and service capability management.
"""

from typing import List, Optional, Tuple
from uuid import UUID
import logging
import re

from sqlalchemy import select, and_, or_, func, text
from sqlalchemy.ext.asyncio import AsyncSession

# Temporary placeholder until dealer schemas are created
from typing import Dict, Any as DealerCreate, Any as DealerUpdate
from .base import BaseRepository

logger = logging.getLogger(__name__)


class DealerRepository:
    """
    Repository for Dealer model with Brazilian market operations.
    
    Handles CNPJ validation, geographic location search, and VW dealer
    network management for Brazilian repair shops.
    """

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def get_by_unique_field(self, field_name: str, field_value: str) -> Optional[Dealer]:
        """
        Get dealer by unique identifier (CNPJ or name).
        
        Args:
            field_name: Field name ('cnpj' or 'name')
            field_value: Field value to search for
            
        Returns:
            Dealer instance or None if not found
        """
        try:
            if field_name not in ['cnpj', 'name']:
                raise ValueError(f"Invalid field name: {field_name}")
            
            query = select(self.model).where(
                getattr(self.model, field_name) == field_value
            )
            
            result = await self.db_session.execute(query)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Error getting dealer by {field_name} {field_value}: {str(e)}")
            raise

    async def get_by_cnpj(self, cnpj: str) -> Optional[Dealer]:
        """
        Get dealer by CNPJ (Brazilian company registration number).
        
        Args:
            cnpj: 14-digit CNPJ (formatted or unformatted)
            
        Returns:
            Dealer instance or None if not found
        """
        # Normalize CNPJ (remove formatting)
        normalized_cnpj = re.sub(r'\D', '', cnpj)
        return await self.get_by_unique_field('cnpj', normalized_cnpj)

    async def get_by_city_state(self, city: str, state: str) -> List[Dealer]:
        """
        Get dealers by city and state.
        
        Args:
            city: City name
            state: Brazilian state code (e.g., 'SP', 'RJ')
            
        Returns:
            List of dealers in the specified location
        """
        try:
            query = select(self.model).where(
                and_(
                    func.lower(self.model.city) == city.lower(),
                    func.upper(self.model.state) == state.upper()
                )
            )
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting dealers by city {city}, state {state}: {str(e)}")
            raise

    async def find_nearby_dealers(
        self, 
        latitude: float, 
        longitude: float, 
        radius_km: float = 50
    ) -> List[Tuple[Dealer, float]]:
        """
        Find dealers within a specified radius of coordinates.
        
        Args:
            latitude: Latitude coordinate
            longitude: Longitude coordinate
            radius_km: Search radius in kilometers (default: 50km)
            
        Returns:
            List of tuples (dealer, distance_km)
        """
        try:
            # Calculate distance using Haversine formula (simplified for PostgreSQL)
            distance_formula = text(
                f"""
                6371 * acos(
                    cos(radians({latitude})) * 
                    cos(radians(latitude)) * 
                    cos(radians(longitude) - radians({longitude})) + 
                    sin(radians({latitude})) * 
                    sin(radians(latitude))
                )
                """
            )
            
            query = select(
                self.model,
                distance_formula.label('distance')
            ).where(
                distance_formula <= radius_km
            ).order_by('distance')
            
            result = await self.db_session.execute(query)
            rows = result.fetchall()
            
            return [(row[0], row[1]) for row in rows]
            
        except Exception as e:
            logger.error(f"Error finding nearby dealers: {str(e)}")
            raise

    async def get_by_service_type(self, service_types: List[str]) -> List[Dealer]:
        """
        Get dealers that provide specific service types.
        
        Args:
            service_types: List of service types to filter by
            
        Returns:
            List of dealers that provide all specified services
        """
        try:
            # Use JSONB contains operator for service filtering
            conditions = []
            
            for service_type in service_types:
                conditions.append(
                    self.model.services.op('@>')(
                        func.jsonb_build_array(service_type)
                    )
                )
            
            query = select(self.model)
            if conditions:
                query = query.where(and_(*conditions))
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting dealers by service types {service_types}: {str(e)}")
            raise

    async def validate_cnpj(self, cnpj: str) -> bool:
        """
        Validate CNPJ format and uniqueness.
        
        Args:
            cnpj: Brazilian CNPJ number
            
        Returns:
            True if CNPJ is valid and unique
        """
        try:
            # Remove formatting
            normalized_cnpj = re.sub(r'\D', '', cnpj)
            
            # Basic format validation
            if len(normalized_cnpj) != 14:
                return False
            
            # Check for known invalid patterns
            if normalized_cnpj in ['00000000000000', '11111111111111']:
                return False
            
            # Check uniqueness in database
            existing = await self.get_by_cnpj(normalized_cnpj)
            return existing is None
            
        except Exception as e:
            logger.error(f"Error validating CNPJ {cnpj}: {str(e)}")
            return False

    async def get_vw_authorized_dealers(self) -> List[Dealer]:
        """
        Get VW authorized dealers in Brazil.
        
        Returns:
            List of VW authorized repair shops
        """
        try:
            # Filter for VW authorized services
            vw_services = ['vw_warranty', 'vw_parts', 'collision_repair']
            
            query = select(self.model)
            
            # Check if dealer has VW authorization services
            conditions = []
            for service in vw_services:
                conditions.append(
                    self.model.services.op('@>')(
                        func.jsonb_build_array(service)
                    )
                )
            
            query = query.where(or_(*conditions))
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting VW authorized dealers: {str(e)}")
            raise

    async def search_by_name_or_address(self, search_term: str) -> List[Dealer]:
        """
        Search dealers by name or address.
        
        Args:
            search_term: Text to search for in name or address
            
        Returns:
            List of matching dealers
        """
        try:
            search_pattern = f"%{search_term.lower()}%"
            
            query = select(self.model).where(
                or_(
                    func.lower(self.model.name).like(search_pattern),
                    func.lower(self.model.address).like(search_pattern)
                )
            )
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error searching dealers by '{search_term}': {str(e)}")
            raise

    async def get_dealers_with_appointment_availability(self) -> List[Dealer]:
        """
        Get dealers that currently accept appointments.
        
        Returns:
            List of dealers with appointment availability
        """
        try:
            # Check for dealers with appointment booking service
            query = select(self.model).where(
                self.model.services.op('@>')(
                    func.jsonb_build_array('appointment_booking')
                )
            )
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting dealers with appointment availability: {str(e)}")
            raise

    async def update_coordinates(self, dealer_id: UUID, latitude: float, longitude: float) -> Optional[Dealer]:
        """
        Update dealer coordinates for location services.
        
        Args:
            dealer_id: Dealer UUID
            latitude: Latitude coordinate
            longitude: Longitude coordinate
            
        Returns:
            Updated dealer instance or None if not found
        """
        try:
            dealer = await self.get_by_id(dealer_id)
            if not dealer:
                return None
            
            dealer.latitude = latitude
            dealer.longitude = longitude
            
            await self.db_session.flush()
            await self.db_session.refresh(dealer)
            
            logger.info(f"Updated coordinates for dealer {dealer_id}")
            return dealer
            
        except Exception as e:
            logger.error(f"Error updating coordinates for dealer {dealer_id}: {str(e)}")
            raise