"""
Part service implementation for VW crash-to-repair simulator.

Provides VW parts catalog business logic including part number validation,
Brazilian pricing in BRL, and parts availability management.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from decimal import Decimal
import logging
import re

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from .base import BaseService
from ..models.part import Part
from ..utils.exceptions import ValidationException, ServiceException

logger = logging.getLogger(__name__)


class PartService(BaseService):
    """
    Service for VW parts catalog business logic.
    
    Handles VW part numbers, Brazilian pricing, availability management,
    and repair cost estimation for crash simulation scenarios.
    """

    def __init__(self, db_session: AsyncSession):
        super().__init__(db_session)

    async def get_parts(
        self,
        skip: int = 0,
        limit: int = 100,
        category: Optional[str] = None,
        part_number: Optional[str] = None,
        name: Optional[str] = None,
        availability_status: Optional[str] = None
    ) -> List[Part]:
        """
        Retrieve parts with optional filtering.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            category: Optional category filter
            part_number: Optional part number filter
            name: Optional name filter
            availability_status: Optional availability status filter
            
        Returns:
            List of parts matching criteria
        """
        try:
            query = select(Part)
            
            # Build filter conditions
            conditions = []
            if category:
                conditions.append(Part.category.ilike(f"%{category}%"))
            if part_number:
                conditions.append(Part.part_number.ilike(f"%{part_number}%"))
            if name:
                conditions.append(Part.name.ilike(f"%{name}%"))
            if availability_status:
                conditions.append(Part.availability_status.ilike(f"%{availability_status}%"))
            
            # Apply filters
            if conditions:
                query = query.where(and_(*conditions))
            
            # Apply pagination
            query = query.offset(skip).limit(limit)
            
            result = await self.db_session.execute(query)
            parts = result.scalars().all()
            
            logger.info(f"Retrieved {len(parts)} parts with filters: category={category}, part_number={part_number}, name={name}, availability_status={availability_status}")
            return list(parts)
            
        except Exception as e:
            logger.error(f"Error retrieving parts: {str(e)}")
            raise ServiceException(f"Failed to retrieve parts: {str(e)}")

    async def get_part_by_id(self, part_id: UUID) -> Optional[Part]:
        """
        Retrieve a part by its ID.
        
        Args:
            part_id: Part UUID
            
        Returns:
            Part if found, None otherwise
        """
        try:
            result = await self.db_session.execute(
                select(Part).where(Part.id == part_id)
            )
            part = result.scalar_one_or_none()
            return part
        except Exception as e:
            logger.error(f"Error retrieving part {part_id}: {str(e)}")
            raise ServiceException(f"Failed to retrieve part: {str(e)}")

    async def get_part_by_number(self, part_number: str) -> Optional[Part]:
        """
        Retrieve a part by its part number.
        
        Args:
            part_number: VW part number
            
        Returns:
            Part if found, None otherwise
        """
        try:
            result = await self.db_session.execute(
                select(Part).where(Part.part_number == part_number)
            )
            part = result.scalar_one_or_none()
            return part
        except Exception as e:
            logger.error(f"Error retrieving part by number {part_number}: {str(e)}")
            raise ServiceException(f"Failed to retrieve part: {str(e)}")

    async def update_part(self, part_id: UUID, part_data: Dict[str, Any]) -> Optional[Part]:
        """
        Update an existing part.
        
        Args:
            part_id: Part UUID
            part_data: Updated part data
            
        Returns:
            Updated part if found, None otherwise
        """
        try:
            part = await self.get_part_by_id(part_id)
            if not part:
                return None
                
            for field, value in part_data.items():
                setattr(part, field, value)
            
            await self.db_session.commit()
            await self.db_session.refresh(part)
            
            logger.info(f"Updated part: {part_id}")
            return part
            
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error updating part {part_id}: {str(e)}")
            raise ServiceException(f"Failed to update part: {str(e)}")

    async def delete_part(self, part_id: UUID) -> bool:
        """
        Delete a part.
        
        Args:
            part_id: Part UUID
            
        Returns:
            True if deleted, False if not found
        """
        try:
            part = await self.get_part_by_id(part_id)
            if not part:
                return False
                
            await self.db_session.delete(part)
            await self.db_session.commit()
            
            logger.info(f"Deleted part: {part_id}")
            return True
            
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error deleting part {part_id}: {str(e)}")
            raise ServiceException(f"Failed to delete part: {str(e)}")

    async def get_compatible_parts(
        self,
        vehicle_model: str,
        vehicle_year: int,
        damage_type: Optional[str] = None
    ) -> List[Part]:
        """
        Get compatible parts for a specific vehicle.
        
        Args:
            vehicle_model: Vehicle model name
            vehicle_year: Vehicle year
            damage_type: Optional damage type filter
            
        Returns:
            List of compatible parts
        """
        try:
            # Simple implementation - in real scenario would check compatibility tables
            query = select(Part)
            
            if damage_type:
                query = query.where(Part.category.ilike(f"%{damage_type}%"))
            
            result = await self.db_session.execute(query)
            parts = result.scalars().all()
            
            logger.info(f"Found {len(parts)} compatible parts for {vehicle_model} {vehicle_year}")
            return list(parts)
            
        except Exception as e:
            logger.error(f"Error retrieving compatible parts: {str(e)}")
            raise ServiceException(f"Failed to retrieve compatible parts: {str(e)}")

    async def bulk_update_prices(self, price_updates: List[Dict[str, Any]]) -> int:
        """
        Bulk update part prices.
        
        Args:
            price_updates: List of price update dictionaries
            
        Returns:
            Number of parts updated
        """
        try:
            updated_count = 0
            
            for update in price_updates:
                part_id = update.get('part_id')
                new_price = update.get('price')
                
                if part_id and new_price:
                    part = await self.get_part_by_id(part_id)
                    if part:
                        part.price_brl = Decimal(str(new_price))
                        updated_count += 1
            
            if updated_count > 0:
                await self.db_session.commit()
            
            logger.info(f"Bulk updated {updated_count} part prices")
            return updated_count
            
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error bulk updating prices: {str(e)}")
            raise ServiceException(f"Failed to bulk update prices: {str(e)}")

    async def validate_vw_part_number(self, part_number: str) -> Dict[str, Any]:
        """
        Validate VW part number format and extract information.
        
        Args:
            part_number: VW part number string
            
        Returns:
            Dictionary with validation results and part details
        """
        try:
            result = {
                'valid': False,
                'part_number': part_number.upper().strip(),
                'errors': [],
                'warnings': [],
                'details': {}
            }
            
            # Clean part number
            clean_part = re.sub(r'[^A-Z0-9]', '', part_number.upper())
            
            # VW part number patterns
            vw_patterns = [
                r'^[1-9][A-Z0-9]{2}[0-9]{3}[A-Z0-9]{3}[A-Z]?$',  # Standard VW format
                r'^[1-9][A-Z0-9]{9}$',                              # Alternative format
                r'^N[0-9]{8}$'                                      # New format pattern
            ]
            
            pattern_matched = any(re.match(pattern, clean_part) for pattern in vw_patterns)
            
            if not pattern_matched:
                result['warnings'].append("Part number does not match standard VW format")
            
            # Length validation
            if len(clean_part) < 8 or len(clean_part) > 11:
                result['errors'].append(f"Part number length invalid (got {len(clean_part)})")
                raise ValidationException(f"Invalid part number length: {len(clean_part)}")
            
            # Extract part information
            if len(clean_part) >= 10:
                result['details'] = {
                    'prefix': clean_part[:1],           # Brand identifier
                    'group_code': clean_part[1:3],      # Part group
                    'part_code': clean_part[3:6],       # Specific part
                    'variant': clean_part[6:9],         # Variant identifier
                    'suffix': clean_part[9:] if len(clean_part) > 9 else ''
                }
                
                # Determine part category
                result['details']['category'] = self._determine_part_category(result['details']['group_code'])
            
            if not result['errors']:
                result['valid'] = True
                await self.log_operation('validate_part_number', 'part', clean_part)
            
            return result
            
        except ValidationException:
            raise
        except Exception as e:
            await self.handle_service_error(e, "Part number validation")

    def _determine_part_category(self, group_code: str) -> str:
        """Determine part category from VW group code."""
        category_mapping = {
            '01': 'engine',
            '02': 'fuel_system',
            '03': 'cooling',
            '04': 'exhaust',
            '05': 'clutch',
            '06': 'transmission',
            '07': 'driveshaft',
            '08': 'suspension',
            '09': 'steering',
            '10': 'brakes',
            '11': 'wheels_tires',
            '12': 'body',
            '13': 'interior',
            '14': 'electrical',
            '15': 'lighting',
            '16': 'air_conditioning'
        }
        
        return category_mapping.get(group_code, 'miscellaneous')

    async def calculate_repair_cost_estimate(
        self, 
        damaged_parts: List[Dict[str, Any]], 
        labor_hours: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive repair cost estimate in BRL.
        
        Args:
            damaged_parts: List of damaged parts with severity
            labor_hours: Optional labor hours estimate
            
        Returns:
            Detailed cost breakdown in Brazilian Reais
        """
        try:
            # Brazilian labor rates (BRL per hour)
            labor_rates = {
                'basic': 80.0,      # Basic mechanical work
                'skilled': 120.0,   # Skilled technician work
                'specialist': 180.0 # Specialist/body work
            }
            
            cost_breakdown = {
                'parts_cost': Decimal('0.00'),
                'labor_cost': Decimal('0.00'),
                'additional_costs': Decimal('0.00'),
                'subtotal': Decimal('0.00'),
                'taxes': Decimal('0.00'),
                'total_cost': Decimal('0.00'),
                'parts_details': [],
                'labor_details': {},
                'currency': 'BRL'
            }
            
            # Calculate parts costs
            for damaged_part in damaged_parts:
                part_cost = await self._calculate_part_cost(damaged_part)
                cost_breakdown['parts_cost'] += part_cost['total_cost']
                cost_breakdown['parts_details'].append(part_cost)
            
            # Calculate labor costs
            if labor_hours is None:
                labor_hours = self._estimate_labor_hours(damaged_parts)
            
            work_type = self._determine_work_type(damaged_parts)
            hourly_rate = Decimal(str(labor_rates[work_type]))
            labor_cost = Decimal(str(labor_hours)) * hourly_rate
            
            cost_breakdown['labor_cost'] = labor_cost
            cost_breakdown['labor_details'] = {
                'hours': labor_hours,
                'rate_per_hour': hourly_rate,
                'work_type': work_type,
                'total': labor_cost
            }
            
            # Additional costs (supplies, shop materials, etc.)
            additional_percentage = Decimal('0.15')  # 15% of parts + labor
            base_cost = cost_breakdown['parts_cost'] + cost_breakdown['labor_cost']
            cost_breakdown['additional_costs'] = base_cost * additional_percentage
            
            # Calculate subtotal
            cost_breakdown['subtotal'] = (
                cost_breakdown['parts_cost'] + 
                cost_breakdown['labor_cost'] + 
                cost_breakdown['additional_costs']
            )
            
            # Brazilian taxes (ICMS varies by state, using average)
            tax_rate = Decimal('0.18')  # 18% average ICMS in Brazil
            cost_breakdown['taxes'] = cost_breakdown['subtotal'] * tax_rate
            
            # Total cost
            cost_breakdown['total_cost'] = cost_breakdown['subtotal'] + cost_breakdown['taxes']
            
            # Format all costs
            for key in ['parts_cost', 'labor_cost', 'additional_costs', 'subtotal', 'taxes', 'total_cost']:
                cost_breakdown[f'{key}_formatted'] = self.format_currency_brl(float(cost_breakdown[key]))
            
            await self.log_operation('calculate_repair_cost', 'part', None, {
                'total_cost': float(cost_breakdown['total_cost']),
                'parts_count': len(damaged_parts)
            })
            
            return cost_breakdown
            
        except Exception as e:
            await self.handle_service_error(e, "Repair cost calculation")

    async def _calculate_part_cost(self, damaged_part: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate cost for a single damaged part."""
        try:
            part_number = damaged_part.get('part_number', '')
            severity = damaged_part.get('severity', 'medium')
            quantity = damaged_part.get('quantity', 1)
            
            # Sample VW parts pricing in BRL
            parts_catalog = {
                '1J0807221': {'name': 'Front Bumper Cover', 'price': 850.00, 'category': 'body'},
                '5G0809857': {'name': 'Front Fender', 'price': 1200.00, 'category': 'body'},
                '5G0823300': {'name': 'Hood', 'price': 1500.00, 'category': 'body'},
                '5G0941006': {'name': 'Headlight Assembly', 'price': 2200.00, 'category': 'lighting'},
                '1K0199262': {'name': 'Engine Mount', 'price': 320.00, 'category': 'engine'},
                '5G0601025': {'name': 'Alloy Wheel', 'price': 780.00, 'category': 'wheels'},
                '5G0698151': {'name': 'Brake Disc', 'price': 180.00, 'category': 'brakes'}
            }
            
            part_info = parts_catalog.get(part_number, {
                'name': f'Generic Part {part_number}',
                'price': 250.00,
                'category': 'miscellaneous'
            })
            
            base_price = Decimal(str(part_info['price']))
            
            # Adjust price based on severity
            severity_multipliers = {
                'low': Decimal('0.3'),      # Minor repair/refinish
                'medium': Decimal('1.0'),   # Full replacement
                'high': Decimal('1.2'),     # Premium part needed
                'total': Decimal('1.5')     # Complete assembly
            }
            
            multiplier = severity_multipliers.get(severity, Decimal('1.0'))
            unit_cost = base_price * multiplier
            total_cost = unit_cost * Decimal(str(quantity))
            
            return {
                'part_number': part_number,
                'name': part_info['name'],
                'category': part_info['category'],
                'severity': severity,
                'quantity': quantity,
                'unit_cost': unit_cost,
                'total_cost': total_cost,
                'unit_cost_formatted': self.format_currency_brl(float(unit_cost)),
                'total_cost_formatted': self.format_currency_brl(float(total_cost))
            }
            
        except Exception as e:
            logger.error(f"Error calculating part cost: {str(e)}")
            return {
                'part_number': damaged_part.get('part_number', ''),
                'name': 'Unknown Part',
                'total_cost': Decimal('100.00'),
                'error': str(e)
            }

    def _estimate_labor_hours(self, damaged_parts: List[Dict[str, Any]]) -> float:
        """Estimate labor hours based on damaged parts."""
        # Labor hour estimates by part category
        labor_estimates = {
            'body': 8.0,        # Body panel work
            'engine': 12.0,     # Engine repairs
            'suspension': 6.0,  # Suspension work
            'brakes': 4.0,      # Brake system
            'electrical': 3.0,  # Electrical repairs
            'lighting': 2.0,    # Light replacement
            'interior': 5.0,    # Interior repairs
            'wheels': 1.0       # Wheel/tire work
        }
        
        total_hours = 0.0
        for part in damaged_parts:
            category = part.get('category', 'miscellaneous')
            severity = part.get('severity', 'medium')
            
            base_hours = labor_estimates.get(category, 4.0)
            
            # Adjust for severity
            severity_multipliers = {
                'low': 0.5,
                'medium': 1.0,
                'high': 1.5,
                'total': 2.0
            }
            
            multiplier = severity_multipliers.get(severity, 1.0)
            total_hours += base_hours * multiplier
        
        return round(total_hours, 2)

    def _determine_work_type(self, damaged_parts: List[Dict[str, Any]]) -> str:
        """Determine work complexity type."""
        categories = [part.get('category', '') for part in damaged_parts]
        
        if any(cat in ['engine', 'transmission'] for cat in categories):
            return 'specialist'
        elif any(cat in ['body', 'suspension'] for cat in categories):
            return 'skilled'
        else:
            return 'basic'