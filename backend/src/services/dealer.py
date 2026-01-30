"""
Dealer service implementation for VW crash-to-repair simulator.

Provides dealer management business logic including CNPJ validation,
Brazilian location services, and VW dealer network operations.
"""

from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
import logging
import re

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from .base import BaseService
from ..models.dealer import Dealer
from ..utils.exceptions import ValidationException, ServiceException

logger = logging.getLogger(__name__)


class DealerService(BaseService):
    """
    Service for dealer-related business logic.
    
    Handles Brazilian dealer operations including CNPJ validation,
    geographic location services, and VW dealer network management.
    """

    def __init__(self, db_session: AsyncSession):
        super().__init__(db_session)

    async def get_dealers(
        self,
        skip: int = 0,
        limit: int = 100,
        state: Optional[str] = None,
        city: Optional[str] = None,
        service_type: Optional[str] = None,
        cnpj: Optional[str] = None,
        active_only: bool = True
    ) -> List[Dealer]:
        """
        Retrieve dealers with optional filtering.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            state: Optional state filter
            city: Optional city filter
            service_type: Optional service type filter
            cnpj: Optional CNPJ filter
            active_only: Only return active dealers
            
        Returns:
            List of dealers matching criteria
        """
        try:
            query = select(Dealer)
            
            # Build filter conditions
            conditions = []
            if state:
                conditions.append(Dealer.state.ilike(f"%{state}%"))
            if city:
                conditions.append(Dealer.city.ilike(f"%{city}%"))
            if service_type:
                # Assuming services are stored as JSON array or string field
                conditions.append(Dealer.services.contains([service_type]))
            if cnpj:
                conditions.append(Dealer.cnpj.ilike(f"%{cnpj}%"))
            if active_only:
                conditions.append(Dealer.is_active == True)
            
            # Apply filters
            if conditions:
                query = query.where(and_(*conditions))
            
            # Apply pagination
            query = query.offset(skip).limit(limit)
            
            result = await self.db_session.execute(query)
            dealers = result.scalars().all()
            
            logger.info(f"Retrieved {len(dealers)} dealers with filters: state={state}, city={city}, service_type={service_type}, cnpj={cnpj}")
            return list(dealers)
            
        except Exception as e:
            logger.error(f"Error retrieving dealers: {str(e)}")
            raise ServiceException(f"Failed to retrieve dealers: {str(e)}")

    async def find_nearby_dealers(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 50.0,
        services: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Find dealers near a geographic location.
        
        Args:
            latitude: Location latitude
            longitude: Location longitude
            radius_km: Search radius in kilometers
            services: Optional list of required services
            
        Returns:
            List of nearby dealers with distance information
        """
        try:
            # Simple implementation - in production would use PostGIS or similar
            query = select(Dealer).where(Dealer.is_active == True)
            
            if services:
                # Filter by services (assuming services are stored in a services field)
                for service in services:
                    query = query.where(Dealer.services.contains([service]))
            
            result = await self.db_session.execute(query)
            all_dealers = result.scalars().all()
            
            # Calculate distances (simplified - real implementation would use proper geospatial calculations)
            nearby_dealers = []
            for dealer in all_dealers:
                # Simplified distance calculation
                if dealer.latitude and dealer.longitude:
                    distance = abs(dealer.latitude - latitude) + abs(dealer.longitude - longitude)
                    if distance <= radius_km / 100:  # Very simplified
                        nearby_dealers.append({
                            'dealer': dealer,
                            'distance_km': distance * 100,
                            'estimated_travel_time_minutes': distance * 200  # rough estimate
                        })
            
            # Sort by distance
            nearby_dealers.sort(key=lambda x: x['distance_km'])
            
            logger.info(f"Found {len(nearby_dealers)} dealers within {radius_km}km")
            return nearby_dealers
            
        except Exception as e:
            logger.error(f"Error finding nearby dealers: {str(e)}")
            raise ServiceException(f"Failed to find nearby dealers: {str(e)}")

    async def validate_dealer_cnpj(self, cnpj: str) -> Dict[str, Any]:
        """
        Validate dealer CNPJ and check if dealer exists in our system.
        
        Args:
            cnpj: CNPJ to validate
            
        Returns:
            Validation result with dealer information if found
        """
        try:
            # First validate CNPJ format
            cnpj_validation = await self.validate_cnpj_comprehensive(cnpj)
            
            if not cnpj_validation['valid']:
                return cnpj_validation
            
            # Check if dealer exists in our system
            clean_cnpj = cnpj_validation['cnpj']
            result = await self.db_session.execute(
                select(Dealer).where(Dealer.cnpj == clean_cnpj)
            )
            dealer = result.scalar_one_or_none()
            
            if dealer:
                cnpj_validation.update({
                    'dealer_found': True,
                    'dealer_id': dealer.id,
                    'dealer_name': dealer.name,
                    'dealer_active': dealer.is_active
                })
            else:
                cnpj_validation.update({
                    'dealer_found': False,
                    'message': 'Valid CNPJ but dealer not in our network'
                })
            
            return cnpj_validation
            
        except Exception as e:
            logger.error(f"Error validating dealer CNPJ: {str(e)}")
            raise ServiceException(f"Failed to validate dealer CNPJ: {str(e)}")

    async def validate_cnpj_comprehensive(self, cnpj: str) -> Dict[str, Any]:
        """
        Comprehensive CNPJ validation for Brazilian companies.
        
        Args:
            cnpj: Brazilian CNPJ number (formatted or unformatted)
            
        Returns:
            Dictionary with validation results and details
        """
        try:
            result = {
                'valid': False,
                'cnpj': cnpj,
                'normalized': '',
                'errors': [],
                'warnings': [],
                'details': {}
            }
            
            # Remove formatting
            normalized_cnpj = re.sub(r'\D', '', cnpj)
            result['normalized'] = normalized_cnpj
            
            # Length validation
            if len(normalized_cnpj) != 14:
                result['errors'].append(f"CNPJ must have exactly 14 digits (got {len(normalized_cnpj)})")
                raise ValidationException(f"Invalid CNPJ length: {len(normalized_cnpj)}")
            
            # Check for invalid patterns
            invalid_patterns = [
                '00000000000000', '11111111111111', '22222222222222',
                '33333333333333', '44444444444444', '55555555555555',
                '66666666666666', '77777777777777', '88888888888888',
                '99999999999999'
            ]
            
            if normalized_cnpj in invalid_patterns:
                result['errors'].append("CNPJ uses invalid pattern")
                raise ValidationException("Invalid CNPJ pattern")
            
            # Calculate check digits
            if self._validate_cnpj_check_digits(normalized_cnpj):
                result['valid'] = True
                
                # Extract CNPJ components
                result['details'] = {
                    'base_number': normalized_cnpj[:8],      # Base company number
                    'branch_code': normalized_cnpj[8:12],    # Branch identifier  
                    'check_digits': normalized_cnpj[12:],    # Verification digits
                    'formatted': self._format_cnpj(normalized_cnpj)
                }
                
                await self.log_operation('validate_cnpj', 'dealer', normalized_cnpj)
            else:
                result['errors'].append("CNPJ check digits are invalid")
                raise ValidationException("Invalid CNPJ check digits")
            
            return result
            
        except ValidationException:
            raise
        except Exception as e:
            await self.handle_service_error(e, "CNPJ validation")

    def _validate_cnpj_check_digits(self, cnpj: str) -> bool:
        """Validate CNPJ check digits using official algorithm."""
        try:
            # Extract numbers for calculation
            numbers = [int(d) for d in cnpj[:12]]
            
            # First check digit calculation
            weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
            sum1 = sum(n * w for n, w in zip(numbers, weights1))
            check1 = 0 if sum1 % 11 < 2 else 11 - (sum1 % 11)
            
            # Second check digit calculation
            numbers.append(check1)
            weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
            sum2 = sum(n * w for n, w in zip(numbers, weights2))
            check2 = 0 if sum2 % 11 < 2 else 11 - (sum2 % 11)
            
            # Verify against provided check digits
            return int(cnpj[12]) == check1 and int(cnpj[13]) == check2
            
        except (ValueError, IndexError):
            return False

    def _format_cnpj(self, cnpj: str) -> str:
        """Format CNPJ with standard Brazilian formatting."""
        if len(cnpj) != 14:
            return cnpj
        return f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:]}"

    async def find_dealers_by_location(
        self, 
        latitude: float, 
        longitude: float, 
        radius_km: float = 50,
        service_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Find VW dealers near a geographic location.
        
        Args:
            latitude: Search center latitude
            longitude: Search center longitude
            radius_km: Search radius in kilometers
            service_types: Optional filter by service types
            
        Returns:
            List of nearby dealers with distances
        """
        try:
            dealers = []
            
            # Sample VW dealers in Brazil (placeholder data)
            sample_dealers = [
                {
                    'id': '123e4567-e89b-12d3-a456-426614174001',
                    'name': 'VW Center São Paulo',
                    'cnpj': '12345678000191',
                    'latitude': -23.5505,
                    'longitude': -46.6333,
                    'city': 'São Paulo',
                    'state': 'SP',
                    'services': ['warranty', 'collision_repair', 'parts', 'appointment_booking']
                },
                {
                    'id': '123e4567-e89b-12d3-a456-426614174002', 
                    'name': 'Volkswagen Rio de Janeiro',
                    'cnpj': '98765432000187',
                    'latitude': -22.9068,
                    'longitude': -43.1729,
                    'city': 'Rio de Janeiro',
                    'state': 'RJ',
                    'services': ['warranty', 'parts', 'appointment_booking']
                },
                {
                    'id': '123e4567-e89b-12d3-a456-426614174003',
                    'name': 'VW Dealer Belo Horizonte',
                    'cnpj': '11222333000145',
                    'latitude': -19.9191,
                    'longitude': -43.9386,
                    'city': 'Belo Horizonte', 
                    'state': 'MG',
                    'services': ['collision_repair', 'parts', 'appointment_booking']
                }
            ]
            
            # Calculate distances and filter
            for dealer in sample_dealers:
                distance = self.calculate_haversine_distance(
                    latitude, longitude,
                    dealer['latitude'], dealer['longitude']
                )
                
                # Check if within radius
                if distance <= radius_km:
                    # Filter by service types if specified
                    if service_types:
                        if not any(service in dealer['services'] for service in service_types):
                            continue
                    
                    dealer_result = {
                        **dealer,
                        'distance_km': round(distance, 2),
                        'formatted_cnpj': self._format_cnpj(dealer['cnpj'])
                    }
                    dealers.append(dealer_result)
            
            # Sort by distance
            dealers.sort(key=lambda x: x['distance_km'])
            
            await self.log_operation(
                'find_dealers_by_location', 
                'dealer', 
                f"lat={latitude},lon={longitude},radius={radius_km}",
                {'found_count': len(dealers)}
            )
            
            return dealers
            
        except Exception as e:
            await self.handle_service_error(e, "Dealer location search")

    async def validate_dealer_services(self, services: List[str]) -> Dict[str, Any]:
        """
        Validate dealer service capabilities.
        
        Args:
            services: List of service types
            
        Returns:
            Validation results with service analysis
        """
        try:
            # Standard VW dealer services in Brazil
            standard_services = {
                'warranty': 'Warranty service and repairs',
                'collision_repair': 'Collision and crash repair',
                'parts': 'Genuine VW parts supply',
                'appointment_booking': 'Online appointment scheduling',
                'insurance_claims': 'Insurance claim processing',
                'body_shop': 'Body work and painting',
                'mechanical_repair': 'Engine and mechanical repairs',
                'electrical_repair': 'Electrical system diagnostics',
                'tire_service': 'Tire installation and balancing',
                'routine_maintenance': 'Regular maintenance services'
            }
            
            result = {
                'valid_services': [],
                'invalid_services': [],
                'service_details': {},
                'compliance_score': 0,
                'recommendations': []
            }
            
            for service in services:
                if service in standard_services:
                    result['valid_services'].append(service)
                    result['service_details'][service] = standard_services[service]
                else:
                    result['invalid_services'].append(service)
            
            # Calculate compliance score
            total_standard = len(standard_services)
            provided_standard = len(result['valid_services'])
            result['compliance_score'] = round((provided_standard / total_standard) * 100, 2)
            
            # Generate recommendations
            essential_services = ['warranty', 'parts', 'appointment_booking']
            missing_essential = [s for s in essential_services if s not in result['valid_services']]
            
            if missing_essential:
                result['recommendations'].append(f"Consider adding essential services: {', '.join(missing_essential)}")
            
            if result['compliance_score'] < 50:
                result['recommendations'].append("Expand service offerings to meet VW dealer standards")
            
            await self.log_operation('validate_services', 'dealer', None, result)
            return result
            
        except Exception as e:
            await self.handle_service_error(e, "Dealer service validation")

    async def calculate_dealer_coverage_area(self, dealer_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate estimated coverage area for a dealer.
        
        Args:
            dealer_data: Dealer information including location
            
        Returns:
            Coverage area analysis
        """
        try:
            latitude = dealer_data.get('latitude', 0)
            longitude = dealer_data.get('longitude', 0)
            city = dealer_data.get('city', '')
            state = dealer_data.get('state', '')
            
            # Estimate coverage based on location type
            coverage_radius = self._estimate_coverage_radius(city, state)
            
            # Calculate approximate coverage area (circle)
            import math
            area_km2 = math.pi * (coverage_radius ** 2)
            
            result = {
                'coverage_radius_km': coverage_radius,
                'estimated_area_km2': round(area_km2, 2),
                'coverage_type': self._get_coverage_type(city, state),
                'population_estimate': self._estimate_population_served(city, state),
                'competitor_density': self._estimate_competitor_density(city, state),
                'market_potential': self._calculate_market_potential(city, state)
            }
            
            await self.log_operation('calculate_coverage', 'dealer', dealer_data.get('id'), result)
            return result
            
        except Exception as e:
            await self.handle_service_error(e, "Coverage area calculation")

    def _estimate_coverage_radius(self, city: str, state: str) -> float:
        """Estimate dealer coverage radius based on location."""
        major_cities = ['são paulo', 'rio de janeiro', 'brasília', 'salvador', 'fortaleza']
        medium_cities = ['belo horizonte', 'manaus', 'curitiba', 'recife', 'porto alegre']
        
        city_lower = city.lower()
        
        if city_lower in major_cities:
            return 25.0  # 25km radius for major cities
        elif city_lower in medium_cities:
            return 40.0  # 40km radius for medium cities
        else:
            return 60.0  # 60km radius for smaller cities/rural

    def _get_coverage_type(self, city: str, state: str) -> str:
        """Determine coverage type based on location."""
        major_cities = ['são paulo', 'rio de janeiro', 'brasília']
        
        if city.lower() in major_cities:
            return 'urban_dense'
        elif state in ['SP', 'RJ', 'MG', 'RS', 'PR']:
            return 'urban_moderate' 
        else:
            return 'rural_sparse'

    def _estimate_population_served(self, city: str, state: str) -> int:
        """Estimate population served by dealer."""
        # Simplified population estimates
        population_data = {
            'são paulo': 12000000,
            'rio de janeiro': 6700000,
            'brasília': 3000000,
            'salvador': 2900000,
            'belo horizonte': 2500000
        }
        
        return population_data.get(city.lower(), 500000)

    def _estimate_competitor_density(self, city: str, state: str) -> str:
        """Estimate competitor density in the area."""
        competitive_cities = ['são paulo', 'rio de janeiro', 'brasília', 'belo horizonte']
        
        if city.lower() in competitive_cities:
            return 'high'
        elif state in ['SP', 'RJ', 'MG']:
            return 'medium'
        else:
            return 'low'

    def _calculate_market_potential(self, city: str, state: str) -> str:
        """Calculate market potential rating."""
        population = self._estimate_population_served(city, state)
        competition = self._estimate_competitor_density(city, state)
        
        if population > 2000000 and competition != 'high':
            return 'high'
        elif population > 500000:
            return 'medium'
        else:
            return 'low'

    async def generate_dealer_performance_report(self, dealer_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate comprehensive dealer performance analysis.
        
        Args:
            dealer_data: Complete dealer information
            
        Returns:
            Comprehensive dealer performance report
        """
        try:
            await self.validate_input(dealer_data, ['cnpj', 'name', 'services'])
            
            # Perform all validations and calculations
            cnpj_validation = await self.validate_cnpj_comprehensive(dealer_data['cnpj'])
            service_validation = await self.validate_dealer_services(dealer_data['services'])
            coverage_analysis = await self.calculate_dealer_coverage_area(dealer_data)
            
            report = {
                'dealer_info': {
                    'name': dealer_data['name'],
                    'cnpj': dealer_data['cnpj'],
                    'city': dealer_data.get('city', ''),
                    'state': dealer_data.get('state', ''),
                    'vw_authorized': True  # Assumed for VW dealers
                },
                'cnpj_validation': cnpj_validation,
                'service_analysis': service_validation,
                'coverage_analysis': coverage_analysis,
                'compliance_status': 'compliant' if cnpj_validation['valid'] and service_validation['compliance_score'] >= 60 else 'needs_improvement',
                'generated_at': '2026-01-30T15:00:00Z',
                'report_id': str(UUID('12345678-1234-5678-1234-567812345678'))  # Placeholder
            }
            
            await self.log_operation('generate_performance_report', 'dealer', dealer_data['cnpj'], report)
            return report
            
        except Exception as e:
            await self.handle_service_error(e, "Dealer performance report generation")