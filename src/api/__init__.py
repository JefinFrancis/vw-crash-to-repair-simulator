# VW Crash-to-Repair Simulator
# API Package

"""
FastAPI-based REST API for the VW Crash-to-Repair Simulator.

Provides endpoints for:
- BeamNG.tech integration and damage analysis
- VW parts catalog and repair estimates
- Brazilian dealer network and scheduling
- Complete crash-to-repair workflow
"""

from .main import app, main

__all__ = ['app', 'main']