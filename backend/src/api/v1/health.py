"""Health check endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import asyncio

from src.database import get_async_session
from src.config import settings

router = APIRouter()


@router.get("")
async def health_check():
    """Basic health check."""
    return {
        "status": "healthy",
        "service": "VW Crash-to-Repair Simulator API",
        "version": "2.0.0",
        "environment": settings.ENVIRONMENT
    }


@router.get("/detailed")
async def detailed_health_check(db: AsyncSession = Depends(get_async_session)):
    """Detailed health check including database connectivity."""
    health_status = {
        "status": "healthy",
        "service": "VW Crash-to-Repair Simulator API",
        "version": "2.0.0",
        "environment": settings.ENVIRONMENT,
        "checks": {}
    }

    # Database check
    try:
        result = await db.execute(text("SELECT 1"))
        if result.scalar() == 1:
            health_status["checks"]["database"] = "healthy"
        else:
            health_status["checks"]["database"] = "unhealthy"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    # BeamNG check (basic connectivity)
    try:
        future = asyncio.open_connection(settings.BEAMNG_HOST, settings.BEAMNG_PORT)
        reader, writer = await asyncio.wait_for(future, timeout=5.0)
        writer.close()
        await writer.wait_closed()
        health_status["checks"]["beamng"] = "healthy"
    except Exception as e:
        health_status["checks"]["beamng"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    return health_status
