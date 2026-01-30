# VW Crash-to-Repair Simulator
# FastAPI Application - Main Entry Point

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import os
from pathlib import Path

from ..config import load_config
from .routes import damage, estimates, dealers, appointments, health, tasks
from .routes import damage_enhanced  # New enhanced damage routes
from ..beamng import BeamNGSimulator, check_beamng_installation
from ..services import VWBeamNGService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global application state
app_config = None
beamng_simulator = None  # Legacy simulator (to be deprecated)
vw_beamng_service = None  # New modern service

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown events"""
    global app_config, beamng_simulator, vw_beamng_service
    
    # Startup
    logger.info("🚗 Starting VW Crash-to-Repair Simulator API...")
    
    # Load configuration
    app_config = load_config()
    logger.info(f"Loaded configuration for {app_config.beamng.host}:{app_config.beamng.port}")
    
    # Initialize legacy BeamNG simulator (for backward compatibility)
    beamng_simulator = BeamNGSimulator(
        host=app_config.beamng.host,
        port=app_config.beamng.port,
        home=app_config.beamng.home_path
    )
    
    # Initialize new VW BeamNG service (modern async implementation)
    vw_beamng_service = VWBeamNGService(
        host=app_config.beamng.host,
        port=app_config.beamng.port,
        home=app_config.beamng.home_path
    )
    
    # Check BeamNG installation
    if app_config.beamng.home_path and check_beamng_installation(app_config.beamng.home_path):
        logger.info("✅ BeamNG.tech installation found")
    else:
        logger.warning("⚠️ BeamNG.tech not found. Please configure BNG_HOME in config.yaml")
    
    # Store in app state
    app.state.config = app_config
    app.state.beamng = beamng_simulator  # Legacy
    app.state.vw_beamng_service = vw_beamng_service  # Modern service
    
    logger.info("✅ API server startup complete - Modern VW service layer initialized")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down API server...")
    if beamng_simulator:
        beamng_simulator.disconnect()
    if vw_beamng_service:
        await vw_beamng_service.disconnect()
    logger.info("✅ Shutdown complete")

# Create FastAPI application
app = FastAPI(
    title="VW Crash-to-Repair Simulator API",
    description="API for VW Brand Day crash-to-repair experience using BeamNG.tech",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(damage.router, prefix="/api/damage", tags=["damage"])
app.include_router(damage_enhanced.router, prefix="/api/vw/damage", tags=["vw-damage-modern"])  # Enhanced VW routes
app.include_router(estimates.router, prefix="/api/estimates", tags=["estimates"])
app.include_router(dealers.router, prefix="/api/dealers", tags=["dealers"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["appointments"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])

# Serve static frontend files
frontend_path = Path(__file__).parent.parent / "frontend" / "static"
if frontend_path.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_path)), name="static")

@app.get("/")
async def root():
    """Serve the main frontend application"""
    frontend_index = Path(__file__).parent.parent / "frontend" / "index.html"
    if frontend_index.exists():
        return FileResponse(frontend_index)
    else:
        return {
            "message": "VW Crash-to-Repair Simulator API",
            "version": "0.1.0",
            "frontend": "Frontend not found. Please build frontend files.",
            "docs": "/docs",
            "health": "/api/health",
            "kanban": "/kanban"
        }

@app.get("/kanban")
async def kanban_board():
    """Serve the Kanban board frontend"""
    kanban_file = Path(__file__).parent.parent / "frontend" / "kanban.html"
    if kanban_file.exists():
        return FileResponse(kanban_file)
    else:
        raise HTTPException(status_code=404, detail="Kanban board not found")

@app.get("/demo")
async def demo_info():
    """Demo information and status"""
    beamng_status = "not_configured"
    if app.state.beamng:
        if app.state.beamng.is_connected():
            beamng_status = "connected"
        elif app.state.beamng.home:
            beamng_status = "configured_not_connected"
    
    return {
        "demo": "VW Brand Day - Crash-to-Repair Experience",
        "status": "ready" if beamng_status == "connected" else "setup_required",
        "beamng_status": beamng_status,
        "api_endpoints": {
            "health": "/api/health",
            "damage_analysis": "/api/damage/analyze",
            "repair_estimates": "/api/estimates",
            "dealers": "/api/dealers/search",
            "appointments": "/api/appointments"
        },
        "next_steps": [
            "1. Install BeamNG.tech research version",
            "2. Configure BeamNG path in config.yaml", 
            "3. Load VW vehicle models in BeamNG",
            "4. Connect to BeamNG via /api/health/beamng/connect",
            "5. Start crash simulation and repair workflow"
        ]
    }

def main():
    """Main entry point for running the API server"""
    config = load_config()
    
    logger.info(f"🚀 Starting server on {config.api.host}:{config.api.port}")
    logger.info(f"📖 API Documentation: http://{config.api.host}:{config.api.port}/docs")
    logger.info(f"🌐 Frontend: http://{config.api.host}:{config.api.port}/")
    logger.info(f"🚗 Demo Info: http://{config.api.host}:{config.api.port}/demo")
    
    uvicorn.run(
        "src.api.main:app",
        host=config.api.host,
        port=config.api.port,
        reload=config.api.debug,
        log_level="info"
    )

if __name__ == "__main__":
    main()