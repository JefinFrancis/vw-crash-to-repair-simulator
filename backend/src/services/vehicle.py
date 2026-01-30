"""
Vehicle service implementation for VW crash-to-repair simulator.

Provides vehicle management business logic including VIN validation,
BeamNG model configuration, and Brazilian market vehicle operations.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
import re

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from .base import BaseService
from ..models.vehicle import Vehicle
from ..utils.exceptions import ValidationException, ServiceException

logger = logging.getLogger(__name__)


class VehicleService(BaseService):
    """
    Service for vehicle-related business logic.
    
    Handles VIN validation, BeamNG integration, and VW vehicle
    management for Brazilian market crash simulation scenarios.
    """

    def __init__(self, db_session: AsyncSession):
        super().__init__(db_session)

    async def get_vehicles(
        self,
        skip: int = 0,
        limit: int = 100,
        model: Optional[str] = None,
        year: Optional[int] = None,
        vin: Optional[str] = None
    ) -> List[Vehicle]:
        """
        Retrieve vehicles with optional filtering.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            model: Optional model filter
            year: Optional year filter
            vin: Optional VIN filter
            
        Returns:
            List of vehicles matching criteria
        """
        try:
            query = select(Vehicle)
            
            # Build filter conditions
            conditions = []
            if model:
                conditions.append(Vehicle.model.ilike(f"%{model}%"))
            if year:
                conditions.append(Vehicle.year == year)
            if vin:
                conditions.append(Vehicle.vin.ilike(f"%{vin}%"))
            
            # Apply filters
            if conditions:
                query = query.where(and_(*conditions))
            
            # Apply pagination
            query = query.offset(skip).limit(limit)
            
            result = await self.db_session.execute(query)
            vehicles = result.scalars().all()
            
            logger.info(f"Retrieved {len(vehicles)} vehicles with filters: model={model}, year={year}, vin={vin}")
            return list(vehicles)
            
        except Exception as e:
            logger.error(f"Error retrieving vehicles: {str(e)}")
            raise ServiceException(f"Failed to retrieve vehicles: {str(e)}")

    async def get_vehicle_by_id(self, vehicle_id: UUID) -> Optional[Vehicle]:
        """
        Retrieve a vehicle by its ID.
        
        Args:
            vehicle_id: Vehicle UUID
            
        Returns:
            Vehicle if found, None otherwise
        """
        try:
            result = await self.db_session.execute(
                select(Vehicle).where(Vehicle.id == vehicle_id)
            )
            vehicle = result.scalar_one_or_none()
            return vehicle
        except Exception as e:
            logger.error(f"Error retrieving vehicle {vehicle_id}: {str(e)}")
            raise ServiceException(f"Failed to retrieve vehicle: {str(e)}")

    async def create_vehicle(self, vehicle_data: Dict[str, Any]) -> Vehicle:
        """
        Create a new vehicle record.
        
        Args:
            vehicle_data: Vehicle creation data
            
        Returns:
            Created vehicle instance
        """
        try:
            # Validate VIN if provided
            if 'vin' in vehicle_data:
                await self.validate_vin_format(vehicle_data['vin'])
            
            vehicle = Vehicle(**vehicle_data)
            self.db_session.add(vehicle)
            await self.db_session.commit()
            await self.db_session.refresh(vehicle)
            
            logger.info(f"Created vehicle: {vehicle.id}")
            return vehicle
            
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error creating vehicle: {str(e)}")
            raise ServiceException(f"Failed to create vehicle: {str(e)}")

    async def update_vehicle(self, vehicle_id: UUID, vehicle_data: Dict[str, Any]) -> Optional[Vehicle]:
        """
        Update an existing vehicle.
        
        Args:
            vehicle_id: Vehicle UUID
            vehicle_data: Updated vehicle data
            
        Returns:
            Updated vehicle if found, None otherwise
        """
        try:
            vehicle = await self.get_vehicle_by_id(vehicle_id)
            if not vehicle:
                return None
                
            # Validate VIN if being updated
            if 'vin' in vehicle_data:
                await self.validate_vin_format(vehicle_data['vin'])
                
            for field, value in vehicle_data.items():
                setattr(vehicle, field, value)
            
            await self.db_session.commit()
            await self.db_session.refresh(vehicle)
            
            logger.info(f"Updated vehicle: {vehicle_id}")
            return vehicle
            
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error updating vehicle {vehicle_id}: {str(e)}")
            raise ServiceException(f"Failed to update vehicle: {str(e)}")

    async def delete_vehicle(self, vehicle_id: UUID) -> bool:
        """
        Delete a vehicle.
        
        Args:
            vehicle_id: Vehicle UUID
            
        Returns:
            True if deleted, False if not found
        """
        try:
            vehicle = await self.get_vehicle_by_id(vehicle_id)
            if not vehicle:
                return False
                
            await self.db_session.delete(vehicle)
            await self.db_session.commit()
            
            logger.info(f"Deleted vehicle: {vehicle_id}")
            return True
            
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error deleting vehicle {vehicle_id}: {str(e)}")
            raise ServiceException(f"Failed to delete vehicle: {str(e)}")

    async def validate_vin_format(self, vin: str) -> Dict[str, Any]:
        """
        Comprehensive VIN validation with detailed feedback.
        
        Args:
            vin: Vehicle Identification Number
            
        Returns:
            Dictionary with validation results and details
            
        Raises:
            ValidationException: If VIN format is invalid
        """
        try:
            result = {
                'valid': False,
                'vin': vin.upper().strip(),
                'errors': [],
                'warnings': [],
                'details': {}
            }
            
            # Clean and normalize VIN
            clean_vin = re.sub(r'[^A-Z0-9]', '', vin.upper())
            
            # Length validation
            if len(clean_vin) != 17:
                result['errors'].append(f"VIN must be exactly 17 characters (got {len(clean_vin)})")
                raise ValidationException(f"Invalid VIN length: {len(clean_vin)}")
            
            # Character validation
            forbidden_chars = ['I', 'O', 'Q']
            found_forbidden = [char for char in forbidden_chars if char in clean_vin]
            if found_forbidden:
                result['errors'].append(f"VIN contains forbidden characters: {', '.join(found_forbidden)}")
                raise ValidationException(f"VIN contains forbidden characters: {found_forbidden}")
            
            # VW-specific VIN validation
            vw_wmi_codes = ['WVW', '9BW', '3VW']  # VW World Manufacturer Identifier codes
            wmi = clean_vin[:3]
            
            if wmi in vw_wmi_codes:
                result['details']['manufacturer'] = 'Volkswagen'
                result['details']['wmi_code'] = wmi
            else:
                result['warnings'].append(f"VIN does not appear to be from Volkswagen (WMI: {wmi})")
                result['details']['manufacturer'] = 'Unknown'
                result['details']['wmi_code'] = wmi
            
            # Extract VIN components
            result['details'].update({
                'wmi': clean_vin[:3],          # World Manufacturer Identifier
                'vds': clean_vin[3:9],         # Vehicle Descriptor Section  
                'check_digit': clean_vin[8],   # Check digit
                'model_year': clean_vin[9],    # Model year code
                'plant_code': clean_vin[10],   # Manufacturing plant
                'sequential': clean_vin[11:]   # Sequential number
            })
            
            if not result['errors']:
                result['valid'] = True
                await self.log_operation('validate_vin', 'vehicle', clean_vin, result['details'])
            
            return result
            
        except ValidationException:
            raise
        except Exception as e:
            await self.handle_service_error(e, "VIN validation")

    async def determine_beamng_model(self, vehicle_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Determine appropriate BeamNG model for VW vehicle.
        
        Args:
            vehicle_data: Vehicle information (model, year, etc.)
            
        Returns:
            BeamNG model configuration
            
        Raises:
            ServiceException: If model mapping fails
        """
        try:
            model = vehicle_data.get('model', '').lower()
            year = vehicle_data.get('year', 0)
            
            # VW to BeamNG model mapping for Brazilian market
            model_mapping = {
                'gol': {
                    'beamng_model': 'gol',
                    'config': 'gol_2020_br',
                    'variants': ['1.0', '1.6'],
                    'supported_years': range(2017, 2025)
                },
                'polo': {
                    'beamng_model': 'polo',
                    'config': 'polo_2020_br',
                    'variants': ['1.0_tsi', '1.6_msi'],
                    'supported_years': range(2018, 2025)
                },
                'virtus': {
                    'beamng_model': 'virtus',
                    'config': 'virtus_2022_br',
                    'variants': ['1.0_tsi', '1.6_msi'],
                    'supported_years': range(2018, 2025)
                },
                't-cross': {
                    'beamng_model': 'tcross',
                    'config': 'tcross_2020_br',
                    'variants': ['1.0_tsi', '1.4_tsi'],
                    'supported_years': range(2019, 2025)
                },
                'tiguan': {
                    'beamng_model': 'tiguan',
                    'config': 'tiguan_2020_br',
                    'variants': ['2.0_tsi'],
                    'supported_years': range(2017, 2025)
                },
                'amarok': {
                    'beamng_model': 'amarok',
                    'config': 'amarok_2020_br',
                    'variants': ['2.0_tdi', '3.0_v6'],
                    'supported_years': range(2017, 2025)
                }
            }
            
            # Default fallback mapping
            default_mapping = {
                'beamng_model': 'generic_sedan',
                'config': 'default_br',
                'variants': ['standard'],
                'supported_years': range(2015, 2025)
            }
            
            mapping = model_mapping.get(model, default_mapping)
            
            # Validate year support
            if year not in mapping['supported_years']:
                logger.warning(f"Year {year} not in supported range for {model}")
            
            result = {
                'beamng_model': mapping['beamng_model'],
                'config_file': mapping['config'],
                'available_variants': mapping['variants'],
                'recommended_variant': mapping['variants'][0] if mapping['variants'] else 'standard',
                'year_supported': year in mapping['supported_years'],
                'crash_test_ready': True,
                'telemetry_enabled': True
            }
            
            await self.log_operation('determine_beamng_model', 'vehicle', model, result)
            return result
            
        except Exception as e:
            await self.handle_service_error(e, "BeamNG model determination")

    async def calculate_vehicle_value_brl(self, vehicle_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate estimated vehicle value in Brazilian Reais.
        
        Args:
            vehicle_data: Vehicle information
            
        Returns:
            Value estimation details
        """
        try:
            model = vehicle_data.get('model', '').lower()
            year = vehicle_data.get('year', 0)
            current_year = 2026
            
            # Base values in BRL for VW models (2024 reference)
            base_values = {
                'gol': 65000,      # Gol 1.6 MSI
                'polo': 85000,     # Polo 1.6 MSI
                'virtus': 95000,   # Virtus 1.6 MSI
                't-cross': 110000, # T-Cross 1.0 TSI
                'nivus': 105000,   # Nivus 1.0 TSI
                'tiguan': 180000,  # Tiguan 2.0 TSI
                'amarok': 220000,  # Amarok 2.0 TDI
                'jetta': 140000,   # Jetta 1.4 TSI
                'golf': 130000,    # Golf 1.4 TSI
                'passat': 160000   # Passat 2.0 TSI
            }
            
            base_value = base_values.get(model, 75000)  # Default value
            
            # Depreciation calculation (Brazilian market)
            age = max(0, current_year - year)
            depreciation_rates = [0, 0.15, 0.25, 0.35, 0.42, 0.48, 0.53, 0.57, 0.60, 0.63]
            depreciation = depreciation_rates[min(age, len(depreciation_rates) - 1)]
            
            current_value = base_value * (1 - depreciation)
            
            result = {
                'base_value_brl': base_value,
                'current_value_brl': round(current_value, 2),
                'depreciation_rate': depreciation,
                'age_years': age,
                'market_segment': self._get_market_segment(model),
                'insurance_group': self._get_insurance_group(model),
                'formatted_value': self.format_currency_brl(current_value)
            }
            
            await self.log_operation('calculate_value', 'vehicle', model, result)
            return result
            
        except Exception as e:
            await self.handle_service_error(e, "Vehicle value calculation")

    def _get_market_segment(self, model: str) -> str:
        """Get vehicle market segment classification."""
        segments = {
            'compact': ['gol', 'up!', 'fox'],
            'hatchback': ['polo', 'golf'],
            'sedan': ['virtus', 'jetta', 'passat'],
            'suv': ['t-cross', 'nivus', 'tiguan', 'taos'],
            'pickup': ['amarok'],
            'premium': ['tiguan', 'passat', 'golf']
        }
        
        for segment, models in segments.items():
            if model.lower() in models:
                return segment
        return 'standard'

    def _get_insurance_group(self, model: str) -> int:
        """Get insurance risk group (1-20, higher = more expensive)."""
        insurance_groups = {
            'gol': 8, 'up!': 6, 'fox': 7, 'polo': 10,
            'virtus': 12, 'golf': 15, 'jetta': 14,
            't-cross': 13, 'nivus': 12, 'tiguan': 17,
            'amarok': 16, 'passat': 18
        }
        
        return insurance_groups.get(model.lower(), 10)

    async def validate_for_crash_simulation(self, vehicle_data: Dict[str, Any]) -> Dict[str, bool]:
        """
        Validate if vehicle is ready for crash simulation.
        
        Args:
            vehicle_data: Vehicle information
            
        Returns:
            Validation results for crash simulation readiness
        """
        try:
            validations = {
                'vin_valid': False,
                'model_supported': False,
                'beamng_available': False,
                'year_compatible': False,
                'brazil_market': False
            }
            
            # VIN validation
            if 'vin' in vehicle_data:
                vin_result = await self.validate_vin_format(vehicle_data['vin'])
                validations['vin_valid'] = vin_result['valid']
            
            # Model support check
            if 'model' in vehicle_data:
                validations['model_supported'] = self.validate_vw_model(vehicle_data['model'])
                validations['brazil_market'] = vehicle_data['model'].lower() in [m.lower() for m in self.get_vw_models_brazil()]
            
            # BeamNG compatibility
            if 'model' in vehicle_data and 'year' in vehicle_data:
                beamng_config = await self.determine_beamng_model(vehicle_data)
                validations['beamng_available'] = beamng_config['crash_test_ready']
                validations['year_compatible'] = beamng_config['year_supported']
            
            return validations
            
        except Exception as e:
            await self.handle_service_error(e, "Crash simulation validation")