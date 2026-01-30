"""
Services package for VW crash-to-repair simulator.

This package contains business logic services that handle domain-specific operations
for the VW crash simulation and repair management system. All services include
Brazilian market features, VW-specific business rules, and comprehensive error handling.

Services:
- BaseService: Foundation service with common patterns and utilities
- VehicleService: VW vehicle management and crash simulation integration
- DealerService: Brazilian VW dealer network operations
- PartService: VW parts catalog and repair cost estimation
- DamageReportService: Crash damage analysis and reporting
- AppointmentService: Dealer appointment scheduling and management
- BeamNGService: Crash simulation integration (existing)
"""

from .base import BaseService
from .vehicle import VehicleService
from .dealer import DealerService
from .part import PartService
from .damage_report import DamageReportService
from .appointment import AppointmentService

# Import existing BeamNG service if available
try:
    from .beamng_service import BeamNGService
except ImportError:
    BeamNGService = None

__all__ = [
    'BaseService',
    'VehicleService', 
    'DealerService',
    'PartService',
    'DamageReportService',
    'AppointmentService',
    'BeamNGService'
]

# Service dependency injection helper
class ServiceContainer:
    """
    Service container for dependency injection.
    
    Provides centralized service instantiation with proper dependency management
    for the VW crash-to-repair simulator application.
    """
    
    def __init__(self, db_session):
        self.db_session = db_session
        self._services = {}
    
    def get_vehicle_service(self) -> VehicleService:
        """Get VehicleService instance."""
        if 'vehicle' not in self._services:
            self._services['vehicle'] = VehicleService(self.db_session)
        return self._services['vehicle']
    
    def get_dealer_service(self) -> DealerService:
        """Get DealerService instance."""
        if 'dealer' not in self._services:
            self._services['dealer'] = DealerService(self.db_session)
        return self._services['dealer']
    
    def get_part_service(self) -> PartService:
        """Get PartService instance."""
        if 'part' not in self._services:
            self._services['part'] = PartService(self.db_session)
        return self._services['part']
    
    def get_damage_report_service(self) -> DamageReportService:
        """Get DamageReportService instance."""
        if 'damage_report' not in self._services:
            self._services['damage_report'] = DamageReportService(self.db_session)
        return self._services['damage_report']
    
    def get_appointment_service(self) -> AppointmentService:
        """Get AppointmentService instance."""
        if 'appointment' not in self._services:
            self._services['appointment'] = AppointmentService(self.db_session)
        return self._services['appointment']
    
    def get_beamng_service(self):
        """Get BeamNGService instance if available."""
        if BeamNGService is None:
            raise ImportError("BeamNGService not available")
        if 'beamng' not in self._services:
            self._services['beamng'] = BeamNGService(self.db_session)
        return self._services['beamng']