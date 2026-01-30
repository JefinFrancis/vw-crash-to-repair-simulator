"""Main FastAPI application with modern async patterns."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog
from typing import AsyncGenerator
import uvicorn

from src.config import settings
from src.database import initialize_db, close_db
from src.api.v1 import health, vehicles, damage, dealers, parts, appointments, beamng, estimates
from src.utils.logging import configure_logging


# Configure structured logging
configure_logging()
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan management."""
    # Startup
    logger.info("Starting VW Crash-to-Repair Simulator API")
    try:
        await initialize_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error("Failed to initialize database", error=str(e))
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down VW Crash-to-Repair Simulator API")
    try:
        await close_db()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error("Error during shutdown", error=str(e))


# Create FastAPI application
app = FastAPI(
    title="VW Crash-to-Repair Simulator API",
    description="""
    Modern FastAPI backend for VW Brand Day crash simulation and repair estimation.
    
    ## Features
    * 🚗 Vehicle damage simulation with BeamNG.drive integration
    * 🔧 VW parts catalog and repair cost estimation
    * 🏪 Brazilian VW dealer network integration
    * 📅 Service appointment booking system
    * 🇧🇷 Brazilian localization and timezone support
    
    ## Architecture
    * Async SQLAlchemy 2.0 with PostgreSQL
    * Repository and Service patterns
    * Structured logging with JSON output
    * Comprehensive error handling
    """,
    version="2.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request validation errors."""
    logger.warning(
        "Request validation error",
        path=request.url.path,
        method=request.method,
        errors=exc.errors()
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "message": "Request validation failed",
            "details": exc.errors(),
            "timestamp": settings.get_current_timestamp_str()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle general exceptions."""
    logger.error(
        "Unhandled exception",
        path=request.url.path,
        method=request.method,
        error=str(exc),
        exc_info=True
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred",
            "timestamp": settings.get_current_timestamp_str(),
            "request_id": id(request)
        }
    )


# Middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log incoming requests."""
    start_time = settings.get_current_timestamp()
    
    # Log request
    logger.info(
        "Request started",
        method=request.method,
        path=request.url.path,
        query_params=str(request.query_params) if request.query_params else None,
        user_agent=request.headers.get("user-agent"),
        client_host=request.client.host if request.client else None
    )
    
    # Process request
    response = await call_next(request)
    
    # Log response
    process_time = (settings.get_current_timestamp() - start_time).total_seconds()
    logger.info(
        "Request completed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        process_time_seconds=process_time
    )
    
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Include API routers
app.include_router(health.router, prefix="/api/v1/health", tags=["Health"])
app.include_router(beamng.router, prefix="/api/v1/beamng", tags=["BeamNG Integration"])
app.include_router(vehicles.router, prefix="/api/v1/vehicles", tags=["Vehicles"])
app.include_router(damage.router, prefix="/api/v1/damage", tags=["Damage Assessment"])
app.include_router(dealers.router, prefix="/api/v1/dealers", tags=["VW Dealers"])
app.include_router(parts.router, prefix="/api/v1/parts", tags=["VW Parts"])
app.include_router(appointments.router, prefix="/api/v1/appointments", tags=["Appointments"])
app.include_router(estimates.router, prefix="/api/v1/estimates", tags=["Repair Estimates"])


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "VW Crash-to-Repair Simulator API",
        "version": "2.0.0",
        "status": "operational",
        "environment": settings.ENVIRONMENT,
        "documentation": "/docs" if settings.ENVIRONMENT != "production" else "disabled",
        "timezone": "America/Sao_Paulo",
        "timestamp": settings.get_current_timestamp_str()
    }


# Development server
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info" if not settings.DEBUG else "debug"
    )