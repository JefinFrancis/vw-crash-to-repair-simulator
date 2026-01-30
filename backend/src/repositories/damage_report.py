"""
Damage Report repository implementation for VW crash-to-repair simulator.

Provides damage analysis operations including crash simulation data management,
BeamNG telemetry processing, and VW component damage assessment.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from datetime import datetime, timedelta

from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

# Temporary placeholders until schemas are created
from typing import Dict, Any as DamageReportCreate, Any as DamageReportUpdate
from .base import BaseRepository

logger = logging.getLogger(__name__)


class DamageReportRepository:
    """
    Repository for DamageReport model with crash simulation operations.
    
    Handles BeamNG telemetry data, damage analysis, and VW component
    assessment for repair cost estimation.
    """

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def get_by_unique_field(self, field_name: str, field_value: Any) -> Optional[DamageReport]:
        """
        Get damage report by unique identifier (simulation_id or vehicle_id).
        
        Args:
            field_name: Field name ('simulation_id' or 'vehicle_id')
            field_value: Field value to search for
            
        Returns:
            DamageReport instance or None if not found
        """
        try:
            if field_name not in ['simulation_id', 'vehicle_id']:
                raise ValueError(f"Invalid field name: {field_name}")
            
            query = select(self.model).where(
                getattr(self.model, field_name) == field_value
            ).options(selectinload(self.model.damage_components))
            
            result = await self.db_session.execute(query)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Error getting damage report by {field_name} {field_value}: {str(e)}")
            raise

    async def get_by_vehicle_id(self, vehicle_id: UUID, load_components: bool = True) -> List[DamageReport]:
        """
        Get all damage reports for a specific vehicle.
        
        Args:
            vehicle_id: Vehicle UUID
            load_components: Whether to load damage components
            
        Returns:
            List of damage reports for the vehicle
        """
        try:
            query = select(self.model).where(
                self.model.vehicle_id == vehicle_id
            ).order_by(desc(self.model.created_at))
            
            if load_components:
                query = query.options(selectinload(self.model.damage_components))
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting damage reports for vehicle {vehicle_id}: {str(e)}")
            raise

    async def get_by_simulation_id(self, simulation_id: str) -> Optional[DamageReport]:
        """
        Get damage report by BeamNG simulation ID.
        
        Args:
            simulation_id: BeamNG simulation identifier
            
        Returns:
            DamageReport instance or None if not found
        """
        return await self.get_by_unique_field('simulation_id', simulation_id)

    async def get_by_severity_level(self, severity: str, skip: int = 0, limit: int = 100) -> List[DamageReport]:
        """
        Get damage reports by severity level.
        
        Args:
            severity: Damage severity ('low', 'medium', 'high', 'total')
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of damage reports with specified severity
        """
        try:
            query = select(self.model).where(
                func.lower(self.model.severity) == severity.lower()
            ).offset(skip).limit(limit).options(
                selectinload(self.model.damage_components)
            )
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting damage reports by severity {severity}: {str(e)}")
            raise

    async def get_recent_reports(self, days: int = 7, limit: int = 50) -> List[DamageReport]:
        """
        Get recent damage reports within specified days.
        
        Args:
            days: Number of days to look back
            limit: Maximum number of reports to return
            
        Returns:
            List of recent damage reports
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            query = select(self.model).where(
                self.model.created_at >= cutoff_date
            ).order_by(desc(self.model.created_at)).limit(limit).options(
                selectinload(self.model.damage_components)
            )
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting recent damage reports: {str(e)}")
            raise

    async def get_high_value_damage_reports(self, threshold_brl: float = 10000.0) -> List[DamageReport]:
        """
        Get damage reports with estimated repair costs above threshold.
        
        Args:
            threshold_brl: Minimum repair cost in BRL
            
        Returns:
            List of high-value damage reports
        """
        try:
            # Extract estimated cost from BeamNG data JSON field
            query = select(self.model).where(
                self.model.beamng_data['estimated_repair_cost_brl'].astext.cast(func.float) > threshold_brl
            ).options(selectinload(self.model.damage_components))
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting high-value damage reports: {str(e)}")
            raise

    async def search_by_component_damage(self, component_names: List[str]) -> List[DamageReport]:
        """
        Search damage reports that have damage in specific components.
        
        Args:
            component_names: List of component names to search for
            
        Returns:
            List of damage reports with specified component damage
        """
        try:
            # Use JSONB query to search for specific component damage
            conditions = []
            
            for component in component_names:
                # Search in BeamNG data for component damage
                conditions.append(
                    self.model.beamng_data.op('@>')(
                        func.jsonb_build_object('damaged_components', 
                                              func.jsonb_build_array(component))
                    )
                )
            
            query = select(self.model).where(
                or_(*conditions)
            ).options(selectinload(self.model.damage_components))
            
            result = await self.db_session.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error searching by component damage {component_names}: {str(e)}")
            raise

    async def get_statistics_by_severity(self) -> Dict[str, int]:
        """
        Get damage report statistics grouped by severity.
        
        Returns:
            Dictionary mapping severity levels to counts
        """
        try:
            query = select(
                self.model.severity,
                func.count(self.model.id).label('count')
            ).group_by(self.model.severity)
            
            result = await self.db_session.execute(query)
            rows = result.fetchall()
            
            return {row[0]: row[1] for row in rows}
            
        except Exception as e:
            logger.error(f"Error getting severity statistics: {str(e)}")
            raise

    async def get_average_repair_cost_by_vehicle_model(self) -> Dict[str, float]:
        """
        Get average repair costs grouped by vehicle model.
        
        Returns:
            Dictionary mapping vehicle models to average repair costs in BRL
        """
        try:
            # Join with vehicle table to get model information
            from ..models.vehicle import Vehicle
            
            query = select(
                Vehicle.model,
                func.avg(
                    self.model.beamng_data['estimated_repair_cost_brl'].astext.cast(func.float)
                ).label('avg_cost')
            ).join(
                Vehicle, self.model.vehicle_id == Vehicle.id
            ).group_by(Vehicle.model)
            
            result = await self.db_session.execute(query)
            rows = result.fetchall()
            
            return {row[0]: row[1] for row in rows}
            
        except Exception as e:
            logger.error(f"Error getting repair cost statistics by vehicle model: {str(e)}")
            raise

    async def update_beamng_data(self, report_id: UUID, beamng_data: Dict[str, Any]) -> Optional[DamageReport]:
        """
        Update BeamNG telemetry data for a damage report.
        
        Args:
            report_id: Damage report UUID
            beamng_data: Updated BeamNG telemetry data
            
        Returns:
            Updated damage report or None if not found
        """
        try:
            report = await self.get_by_id(report_id)
            if not report:
                return None
            
            report.beamng_data = beamng_data
            await self.db_session.flush()
            await self.db_session.refresh(report)
            
            logger.info(f"Updated BeamNG data for damage report {report_id}")
            return report
            
        except Exception as e:
            logger.error(f"Error updating BeamNG data for report {report_id}: {str(e)}")
            raise

    async def mark_as_processed(self, report_id: UUID) -> Optional[DamageReport]:
        """
        Mark a damage report as processed for repair estimation.
        
        Args:
            report_id: Damage report UUID
            
        Returns:
            Updated damage report or None if not found
        """
        try:
            return await self.update(
                report_id, 
                {'processed_at': datetime.utcnow()}
            )
            
        except Exception as e:
            logger.error(f"Error marking report {report_id} as processed: {str(e)}")
            raise