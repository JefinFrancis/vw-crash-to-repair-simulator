"""
Damage report service implementation for VW crash-to-repair simulator.

Provides damage assessment business logic including crash analysis,
severity determination, and repair recommendations.
"""

from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from decimal import Decimal
import logging
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseService
from ..utils.exceptions import ValidationException, ServiceException

logger = logging.getLogger(__name__)


class DamageReportService(BaseService):
    """
    Service for damage assessment and reporting business logic.
    
    Handles crash damage analysis, severity calculations, repair cost estimates,
    and damage report generation for VW vehicles.
    """

    def __init__(self, db_session: AsyncSession):
        super().__init__(db_session)

    async def analyze_crash_damage(
        self,
        crash_data: Dict[str, Any],
        vehicle_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze crash damage from simulation data.
        
        Args:
            crash_data: Crash simulation data from BeamNG
            vehicle_data: Vehicle information
            
        Returns:
            Comprehensive damage analysis
        """
        try:
            analysis_result = {
                'crash_id': crash_data.get('id'),
                'vehicle_vin': vehicle_data.get('vin'),
                'analysis_timestamp': datetime.utcnow().isoformat(),
                'damage_zones': [],
                'severity_score': 0.0,
                'total_repair_estimate': Decimal('0.00'),
                'safety_assessment': {},
                'repair_recommendations': []
            }
            
            # Analyze damage by vehicle zones
            damage_zones = await self._analyze_damage_zones(crash_data, vehicle_data)
            analysis_result['damage_zones'] = damage_zones
            
            # Calculate overall severity score (0-100)
            severity_score = await self._calculate_severity_score(damage_zones)
            analysis_result['severity_score'] = severity_score
            
            # Safety assessment
            safety_assessment = await self._assess_safety_impact(damage_zones, severity_score)
            analysis_result['safety_assessment'] = safety_assessment
            
            # Generate repair recommendations
            repair_recommendations = await self._generate_repair_recommendations(
                damage_zones, severity_score, safety_assessment
            )
            analysis_result['repair_recommendations'] = repair_recommendations
            
            # Calculate total repair estimate
            total_estimate = await self._calculate_total_repair_estimate(damage_zones)
            analysis_result['total_repair_estimate'] = total_estimate
            analysis_result['total_repair_estimate_formatted'] = self.format_currency_brl(float(total_estimate))
            
            await self.log_operation('analyze_crash_damage', 'damage_report', 
                                   analysis_result['crash_id'], {
                                       'severity_score': severity_score,
                                       'repair_estimate': float(total_estimate)
                                   })
            
            return analysis_result
            
        except Exception as e:
            await self.handle_service_error(e, "Crash damage analysis")

    async def _analyze_damage_zones(
        self, 
        crash_data: Dict[str, Any], 
        vehicle_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Analyze damage by vehicle zones."""
        try:
            # Vehicle damage zones
            damage_zones = [
                {
                    'zone': 'front_end',
                    'name': 'Front End',
                    'components': ['bumper', 'hood', 'fenders', 'headlights', 'grille'],
                    'damage_level': 0,
                    'affected_parts': [],
                    'repair_priority': 'high'
                },
                {
                    'zone': 'passenger_compartment',
                    'name': 'Passenger Compartment',
                    'components': ['doors', 'roof', 'pillars', 'windows'],
                    'damage_level': 0,
                    'affected_parts': [],
                    'repair_priority': 'critical'
                },
                {
                    'zone': 'rear_end',
                    'name': 'Rear End',
                    'components': ['rear_bumper', 'trunk', 'taillights'],
                    'damage_level': 0,
                    'affected_parts': [],
                    'repair_priority': 'medium'
                },
                {
                    'zone': 'engine_bay',
                    'name': 'Engine Bay',
                    'components': ['engine', 'radiator', 'battery', 'cooling_system'],
                    'damage_level': 0,
                    'affected_parts': [],
                    'repair_priority': 'critical'
                },
                {
                    'zone': 'suspension',
                    'name': 'Suspension System',
                    'components': ['struts', 'springs', 'control_arms', 'wheels'],
                    'damage_level': 0,
                    'affected_parts': [],
                    'repair_priority': 'high'
                },
                {
                    'zone': 'undercarriage',
                    'name': 'Undercarriage',
                    'components': ['exhaust', 'fuel_tank', 'transmission'],
                    'damage_level': 0,
                    'affected_parts': [],
                    'repair_priority': 'medium'
                }
            ]
            
            # Extract damage data from crash simulation
            impact_data = crash_data.get('impact_data', {})
            deformation_data = crash_data.get('deformation', {})
            
            # Process each zone
            for zone in damage_zones:
                zone_damage = await self._assess_zone_damage(
                    zone['zone'], 
                    impact_data, 
                    deformation_data, 
                    vehicle_data
                )
                zone.update(zone_damage)
            
            return damage_zones
            
        except Exception as e:
            logger.error(f"Error analyzing damage zones: {str(e)}")
            return []

    async def _assess_zone_damage(
        self, 
        zone_name: str, 
        impact_data: Dict[str, Any], 
        deformation_data: Dict[str, Any],
        vehicle_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess damage for a specific vehicle zone."""
        try:
            zone_impact = impact_data.get(zone_name, {})
            zone_deformation = deformation_data.get(zone_name, {})
            
            # Calculate damage level (0-100)
            impact_force = zone_impact.get('force', 0)
            deformation_amount = zone_deformation.get('amount', 0)
            
            # Normalize and combine factors
            damage_level = min(100, (impact_force * 0.6) + (deformation_amount * 0.4))
            
            # Determine affected parts based on damage level
            affected_parts = []
            if damage_level > 20:  # Minor damage threshold
                affected_parts = await self._identify_damaged_parts(zone_name, damage_level)
            
            # Estimate repair cost for this zone
            zone_repair_cost = await self._estimate_zone_repair_cost(affected_parts, damage_level)
            
            return {
                'damage_level': round(damage_level, 2),
                'affected_parts': affected_parts,
                'repair_cost_estimate': zone_repair_cost,
                'repair_cost_formatted': self.format_currency_brl(float(zone_repair_cost)),
                'impact_force': impact_force,
                'deformation_amount': deformation_amount
            }
            
        except Exception as e:
            logger.error(f"Error assessing zone damage for {zone_name}: {str(e)}")
            return {
                'damage_level': 0,
                'affected_parts': [],
                'repair_cost_estimate': Decimal('0.00'),
                'error': str(e)
            }

    async def _identify_damaged_parts(self, zone_name: str, damage_level: float) -> List[Dict[str, Any]]:
        """Identify specific damaged parts based on zone and damage level."""
        # VW parts mapping by zone
        zone_parts_mapping = {
            'front_end': [
                {'part_number': '1J0807221', 'name': 'Front Bumper Cover', 'threshold': 15},
                {'part_number': '5G0823300', 'name': 'Hood', 'threshold': 30},
                {'part_number': '5G0809857', 'name': 'Front Fender', 'threshold': 25},
                {'part_number': '5G0941006', 'name': 'Headlight Assembly', 'threshold': 35}
            ],
            'passenger_compartment': [
                {'part_number': '5G0831055', 'name': 'Door Shell', 'threshold': 40},
                {'part_number': '5G0845011', 'name': 'Windshield', 'threshold': 20},
                {'part_number': '5G0867011', 'name': 'Door Panel', 'threshold': 30}
            ],
            'engine_bay': [
                {'part_number': '1K0199262', 'name': 'Engine Mount', 'threshold': 50},
                {'part_number': '5G0121251', 'name': 'Radiator', 'threshold': 35},
                {'part_number': '1J0201801', 'name': 'Fuel Tank', 'threshold': 60}
            ],
            'suspension': [
                {'part_number': '5G0413031', 'name': 'Shock Strut', 'threshold': 40},
                {'part_number': '5G0601025', 'name': 'Alloy Wheel', 'threshold': 25},
                {'part_number': '5G0407151', 'name': 'Control Arm', 'threshold': 45}
            ]
        }
        
        damaged_parts = []
        zone_parts = zone_parts_mapping.get(zone_name, [])
        
        for part_info in zone_parts:
            if damage_level >= part_info['threshold']:
                # Determine severity based on damage level
                if damage_level >= 80:
                    severity = 'total'
                elif damage_level >= 60:
                    severity = 'high'
                elif damage_level >= 40:
                    severity = 'medium'
                else:
                    severity = 'low'
                
                damaged_parts.append({
                    'part_number': part_info['part_number'],
                    'name': part_info['name'],
                    'severity': severity,
                    'damage_percentage': min(100, damage_level)
                })
        
        return damaged_parts

    async def _calculate_severity_score(self, damage_zones: List[Dict[str, Any]]) -> float:
        """Calculate overall damage severity score (0-100)."""
        try:
            total_score = 0
            zone_count = 0
            
            # Weight factors for different zones
            zone_weights = {
                'passenger_compartment': 2.0,  # Safety critical
                'engine_bay': 1.8,             # Functional critical
                'front_end': 1.5,              # High impact zone
                'suspension': 1.4,             # Safety important
                'rear_end': 1.2,               # Medium impact
                'undercarriage': 1.0           # Lower impact
            }
            
            for zone in damage_zones:
                zone_name = zone.get('zone', '')
                damage_level = zone.get('damage_level', 0)
                weight = zone_weights.get(zone_name, 1.0)
                
                weighted_score = damage_level * weight
                total_score += weighted_score
                zone_count += 1
            
            if zone_count > 0:
                # Average with weight consideration
                avg_weight = sum(zone_weights.values()) / len(zone_weights)
                severity_score = (total_score / zone_count) / avg_weight * 100
                return min(100.0, max(0.0, severity_score))
            
            return 0.0
            
        except Exception as e:
            logger.error(f"Error calculating severity score: {str(e)}")
            return 0.0

    async def _assess_safety_impact(
        self, 
        damage_zones: List[Dict[str, Any]], 
        severity_score: float
    ) -> Dict[str, Any]:
        """Assess safety impact of damage."""
        try:
            safety_assessment = {
                'overall_rating': 'safe',
                'driveable': True,
                'safety_concerns': [],
                'immediate_actions': [],
                'inspection_required': False
            }
            
            # Check critical zones
            critical_zones = ['passenger_compartment', 'engine_bay', 'suspension']
            
            for zone in damage_zones:
                zone_name = zone.get('zone', '')
                damage_level = zone.get('damage_level', 0)
                
                if zone_name in critical_zones and damage_level > 30:
                    safety_assessment['safety_concerns'].append(
                        f"Significant damage to {zone.get('name', zone_name)}"
                    )
                
                if zone_name == 'passenger_compartment' and damage_level > 20:
                    safety_assessment['inspection_required'] = True
                    safety_assessment['immediate_actions'].append('Professional safety inspection required')
                
                if zone_name == 'suspension' and damage_level > 40:
                    safety_assessment['driveable'] = False
                    safety_assessment['immediate_actions'].append('Do not drive - suspension damage')
                
                if zone_name == 'engine_bay' and damage_level > 50:
                    safety_assessment['driveable'] = False
                    safety_assessment['immediate_actions'].append('Engine damage - towing required')
            
            # Overall safety rating
            if severity_score > 70:
                safety_assessment['overall_rating'] = 'unsafe'
            elif severity_score > 40:
                safety_assessment['overall_rating'] = 'caution'
            elif severity_score > 15:
                safety_assessment['overall_rating'] = 'minor_concern'
            else:
                safety_assessment['overall_rating'] = 'safe'
            
            return safety_assessment
            
        except Exception as e:
            logger.error(f"Error assessing safety impact: {str(e)}")
            return {'overall_rating': 'unknown', 'error': str(e)}

    async def _generate_repair_recommendations(
        self,
        damage_zones: List[Dict[str, Any]],
        severity_score: float,
        safety_assessment: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate repair recommendations based on damage analysis."""
        try:
            recommendations = []
            
            # Sort zones by repair priority and damage level
            sorted_zones = sorted(
                damage_zones,
                key=lambda x: (
                    {'critical': 3, 'high': 2, 'medium': 1, 'low': 0}.get(x.get('repair_priority', 'low'), 0),
                    x.get('damage_level', 0)
                ),
                reverse=True
            )
            
            for i, zone in enumerate(sorted_zones):
                damage_level = zone.get('damage_level', 0)
                if damage_level < 10:  # Skip minimal damage
                    continue
                
                recommendation = {
                    'priority': i + 1,
                    'zone': zone.get('name', 'Unknown Zone'),
                    'description': f"Repair {zone.get('name', 'zone')} damage",
                    'urgency': zone.get('repair_priority', 'medium'),
                    'estimated_time': self._estimate_repair_time(zone),
                    'estimated_cost': zone.get('repair_cost_estimate', Decimal('0.00')),
                    'parts_needed': [part['name'] for part in zone.get('affected_parts', [])],
                    'details': []
                }
                
                # Add specific repair details
                if damage_level > 80:
                    recommendation['details'].append('Complete replacement required')
                elif damage_level > 50:
                    recommendation['details'].append('Major repair or replacement')
                elif damage_level > 25:
                    recommendation['details'].append('Moderate repair needed')
                else:
                    recommendation['details'].append('Minor repair/refinishing')
                
                # Add safety-related urgency
                if zone.get('zone') in ['passenger_compartment', 'engine_bay'] and damage_level > 30:
                    recommendation['urgency'] = 'critical'
                    recommendation['details'].append('Safety-critical repair')
                
                recommendations.append(recommendation)
            
            # Add overall recommendations
            if severity_score > 60:
                recommendations.insert(0, {
                    'priority': 0,
                    'zone': 'Overall',
                    'description': 'Comprehensive damage assessment by certified technician',
                    'urgency': 'critical',
                    'estimated_time': '2-4 hours',
                    'estimated_cost': Decimal('300.00'),
                    'details': ['Professional inspection required before repairs']
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating repair recommendations: {str(e)}")
            return []

    def _estimate_repair_time(self, zone: Dict[str, Any]) -> str:
        """Estimate repair time for a zone."""
        damage_level = zone.get('damage_level', 0)
        affected_parts_count = len(zone.get('affected_parts', []))
        
        base_time = {
            'front_end': 8,
            'passenger_compartment': 12,
            'rear_end': 6,
            'engine_bay': 16,
            'suspension': 10,
            'undercarriage': 8
        }.get(zone.get('zone', ''), 8)
        
        # Adjust for damage level
        if damage_level > 80:
            multiplier = 2.0
        elif damage_level > 50:
            multiplier = 1.5
        elif damage_level > 25:
            multiplier = 1.2
        else:
            multiplier = 0.8
        
        # Adjust for parts count
        parts_multiplier = 1 + (affected_parts_count * 0.2)
        
        total_hours = int(base_time * multiplier * parts_multiplier)
        
        if total_hours > 24:
            days = total_hours // 8
            return f"{days} days"
        else:
            return f"{total_hours} hours"

    async def _estimate_zone_repair_cost(
        self, 
        affected_parts: List[Dict[str, Any]], 
        damage_level: float
    ) -> Decimal:
        """Estimate repair cost for a zone."""
        try:
            total_cost = Decimal('0.00')
            
            for part in affected_parts:
                # Sample part costs (would come from parts catalog in real implementation)
                part_costs = {
                    '1J0807221': 850.00,   # Front Bumper
                    '5G0823300': 1500.00,  # Hood
                    '5G0809857': 1200.00,  # Front Fender
                    '5G0941006': 2200.00,  # Headlight
                    '5G0831055': 800.00,   # Door Shell
                    '1K0199262': 320.00,   # Engine Mount
                    '5G0601025': 780.00    # Wheel
                }
                
                base_cost = part_costs.get(part.get('part_number', ''), 250.00)
                
                # Severity multiplier
                severity_multipliers = {
                    'low': 0.3,
                    'medium': 1.0,
                    'high': 1.2,
                    'total': 1.5
                }
                
                multiplier = severity_multipliers.get(part.get('severity', 'medium'), 1.0)
                part_cost = Decimal(str(base_cost)) * Decimal(str(multiplier))
                total_cost += part_cost
            
            # Add labor cost estimate (60% of parts cost)
            labor_cost = total_cost * Decimal('0.60')
            total_cost += labor_cost
            
            return total_cost
            
        except Exception as e:
            logger.error(f"Error estimating zone repair cost: {str(e)}")
            return Decimal('500.00')  # Default estimate

    async def _calculate_total_repair_estimate(self, damage_zones: List[Dict[str, Any]]) -> Decimal:
        """Calculate total repair estimate from all zones."""
        try:
            total_estimate = Decimal('0.00')
            
            for zone in damage_zones:
                zone_cost = zone.get('repair_cost_estimate', Decimal('0.00'))
                if isinstance(zone_cost, (int, float)):
                    zone_cost = Decimal(str(zone_cost))
                total_estimate += zone_cost
            
            # Add general shop supplies and miscellaneous (10% of total)
            miscellaneous = total_estimate * Decimal('0.10')
            total_estimate += miscellaneous
            
            return total_estimate
            
        except Exception as e:
            logger.error(f"Error calculating total repair estimate: {str(e)}")
            return Decimal('1000.00')  # Default estimate

    async def generate_damage_report(
        self,
        crash_analysis: Dict[str, Any],
        customer_info: Dict[str, Any],
        insurance_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive damage report for insurance and repair purposes.
        
        Args:
            crash_analysis: Complete crash damage analysis
            customer_info: Customer information
            insurance_info: Optional insurance information
            
        Returns:
            Formatted damage report
        """
        try:
            report = {
                'report_id': crash_analysis.get('crash_id'),
                'generated_at': datetime.utcnow().isoformat(),
                'report_type': 'damage_assessment',
                'vehicle_info': {
                    'vin': crash_analysis.get('vehicle_vin'),
                    'make': 'Volkswagen',
                    'model': customer_info.get('vehicle_model', ''),
                    'year': customer_info.get('vehicle_year', ''),
                    'license_plate': customer_info.get('license_plate', '')
                },
                'customer_info': customer_info,
                'insurance_info': insurance_info or {},
                'damage_summary': {
                    'severity_score': crash_analysis.get('severity_score', 0),
                    'total_zones_affected': len([z for z in crash_analysis.get('damage_zones', []) if z.get('damage_level', 0) > 10]),
                    'safety_rating': crash_analysis.get('safety_assessment', {}).get('overall_rating', 'unknown'),
                    'driveable': crash_analysis.get('safety_assessment', {}).get('driveable', False)
                },
                'damage_details': crash_analysis.get('damage_zones', []),
                'repair_estimates': crash_analysis.get('repair_recommendations', []),
                'total_cost_estimate': crash_analysis.get('total_repair_estimate_formatted', 'R$ 0,00'),
                'recommendations': crash_analysis.get('repair_recommendations', []),
                'next_steps': self._generate_next_steps(crash_analysis)
            }
            
            await self.log_operation('generate_damage_report', 'damage_report', 
                                   report['report_id'])
            
            return report
            
        except Exception as e:
            await self.handle_service_error(e, "Damage report generation")

    def _generate_next_steps(self, crash_analysis: Dict[str, Any]) -> List[str]:
        """Generate next steps based on damage analysis."""
        next_steps = []
        
        safety_assessment = crash_analysis.get('safety_assessment', {})
        severity_score = crash_analysis.get('severity_score', 0)
        
        # Safety-based steps
        if not safety_assessment.get('driveable', True):
            next_steps.append("Vehicle must be towed - not safe to drive")
        
        if safety_assessment.get('inspection_required', False):
            next_steps.append("Professional safety inspection required before repairs")
        
        # Severity-based steps
        if severity_score > 60:
            next_steps.append("Contact insurance company for total loss assessment")
            next_steps.append("Obtain comprehensive repair estimate from certified VW dealer")
        elif severity_score > 30:
            next_steps.append("Schedule detailed inspection with authorized VW service center")
            next_steps.append("Obtain repair estimate and parts availability timeline")
        else:
            next_steps.append("Schedule repair appointment with VW service center")
        
        # General steps
        next_steps.extend([
            "Document all damage with photos",
            "Contact insurance provider to file claim",
            "Keep all receipts for towing and storage costs"
        ])
        
        return next_steps