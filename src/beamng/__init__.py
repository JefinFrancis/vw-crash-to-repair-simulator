# VW Crash-to-Repair Simulator
# BeamNG Integration Package

"""
BeamNG.tech integration package for VW crash simulation and damage extraction.

This package provides:
- BeamNG simulator connection and control
- Vehicle damage telemetry extraction  
- Crash-to-repair workflow triggers
- VW vehicle model management
"""

from .simulator import BeamNGSimulator, DamageExtractor, check_beamng_installation, get_installed_vehicles

__all__ = [
    'BeamNGSimulator',
    'DamageExtractor', 
    'check_beamng_installation',
    'get_installed_vehicles'
]