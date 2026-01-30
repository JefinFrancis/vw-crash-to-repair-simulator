"""Main API router for v1 endpoints."""

from fastapi import APIRouter

from src.api.v1 import health, damage, estimates, dealers, appointments, beamng, vehicles, parts

# Create main API router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(beamng.router, prefix="/beamng", tags=["BeamNG Integration"])
api_router.include_router(vehicles.router, prefix="/vehicles", tags=["Vehicles"])
api_router.include_router(parts.router, prefix="/parts", tags=["VW Parts"])
api_router.include_router(damage.router, prefix="/damage", tags=["Damage Analysis"])
api_router.include_router(estimates.router, prefix="/estimates", tags=["Repair Estimates"])
api_router.include_router(dealers.router, prefix="/dealers", tags=["VW Dealers"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["Appointments"])