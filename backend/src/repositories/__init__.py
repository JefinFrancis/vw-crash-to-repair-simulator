"""
Repository layer for VW crash-to-repair simulator.

Provides data access layer implementations for all domain models
with Brazilian market features and async patterns.
"""

# Import only the base repository for now to avoid dependency issues
from .base import BaseRepository

# Placeholder imports - will be enabled when schemas and models are complete
# from .vehicle import VehicleRepository
# from .dealer import DealerRepository  
# from .part import PartRepository
# from .damage_report import DamageReportRepository
# from .appointment import AppointmentRepository

__all__ = [
    "BaseRepository",
    # Future exports when dependencies are resolved:
    # "VehicleRepository", 
    # "DealerRepository",
    # "PartRepository", 
    # "DamageReportRepository",
    # "AppointmentRepository",
]