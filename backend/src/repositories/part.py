"""
Part repository implementation for VW crash-to-repair simulator.

Provides VW parts catalog operations including part number lookup,
Brazilian pricing in BRL, and parts availability management.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from decimal import Decimal
import logging

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..schemas.part import PartCreate, PartUpdate
from .base import BaseRepository

logger = logging.getLogger(__name__)


class PartRepository:
    """
    Repository for Part model with VW parts catalog operations.
    
    Handles VW part numbers, Brazilian pricing in BRL, and parts
    availability management for repair cost estimation.
    """

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def get_by_unique_field(self, field_name: str, field_value: str) -> Optional[Part]:
        """
        Get part by unique identifier (part_number or name).
        
        Args:
            field_name: Field name ('part_number' or 'name')
            field_value: Field value to search for
            
        Returns:
            Part instance or None if not found
        """
        try:
            if field_name not in ['part_number', 'name']:
                raise ValueError(f"Invalid field name: {field_name}")
            
            query = select(self.model).where(
                getattr(self.model, field_name) == field_value
            )
            
            result = await self.db_session.execute(query)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Error getting part by {field_name} {field_value}: {str(e)}")
            raise

    async def get_by_part_number(self, part_number: str) -> Optional[Part]:
        """
        Get part by VW part number.
        
        Args:
            part_number: VW part number
            
        Returns:
            Part instance or None if not found
        """
        return await self.get_by_unique_field('part_number', part_number)

    async def get_by_category(self, category: str, skip: int = 0, limit: int = 100) -> List[Part]:
        """
        Get parts by category.
        
        Args:
            category: Part category (e.g., 'engine', 'body', 'suspension')
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of parts in the specified category
        """
        try:
            query = select(self.model).where(
                func.lower(self.model.category) == category.lower()
            ).offset(skip).limit(limit)
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting parts by category {category}: {str(e)}")
            raise

    async def search_by_name_or_part_number(self, search_term: str) -> List[Part]:
        """
        Search parts by name or part number.
        
        Args:
            search_term: Text to search for in name or part number
            
        Returns:
            List of matching parts
        """
        try:
            search_pattern = f"%{search_term.upper()}%"
            
            query = select(self.model).where(
                or_(
                    func.upper(self.model.name).like(search_pattern),
                    func.upper(self.model.part_number).like(search_pattern)
                )
            )
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error searching parts by '{search_term}': {str(e)}")
            raise

    async def get_vw_genuine_parts(self, skip: int = 0, limit: int = 100) -> List[Part]:
        """
        Get VW genuine parts (typically have VW part number prefix).
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of VW genuine parts
        """
        try:
            # VW genuine parts typically start with specific prefixes
            vw_prefixes = ['1J0', '5G0', '2E0', '6R0', '5C0', '1T0']
            
            conditions = []
            for prefix in vw_prefixes:
                conditions.append(
                    self.model.part_number.like(f"{prefix}%")
                )
            
            query = select(self.model).where(
                or_(*conditions)
            ).offset(skip).limit(limit)
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting VW genuine parts: {str(e)}")
            raise

    async def calculate_total_repair_cost(self, part_ids: List[UUID]) -> Decimal:
        """
        Calculate total repair cost for a list of parts.
        
        Args:
            part_ids: List of part UUIDs
            
        Returns:
            Total cost in BRL
        """
        try:
            query = select(func.sum(self.model.price_brl)).where(
                self.model.id.in_(part_ids)
            )
            
            result = await self.db_session.execute(query)
            total_cost = result.scalar() or Decimal('0.00')
            
            return total_cost
            
        except Exception as e:
            logger.error(f"Error calculating total repair cost: {str(e)}")
            raise
    
    # TODO: Implement repository methods