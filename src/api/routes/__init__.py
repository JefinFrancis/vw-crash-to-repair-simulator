# VW Crash-to-Repair Simulator API
# API Routes Package

"""
API routes for the VW Crash-to-Repair Simulator.

This package provides REST API endpoints for:
- Health checks and system status
- Damage analysis and telemetry extraction
- Repair estimate generation
- Dealer search and selection
- Appointment booking and management
"""

# Import all routers for easy inclusion in main app
from . import health, damage, estimates, dealers, appointments

__all__ = [
    'health',
    'damage', 
    'estimates',
    'dealers',
    'appointments'
]