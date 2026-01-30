"""Structured logging setup using structlog."""

import logging
import sys
from typing import Any, Dict

import structlog
from structlog.typing import FilteringBoundLogger

from src.config import settings


def configure_logging() -> None:
    """Configure structured logging for the application."""
    
    # Configure standard logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.LOG_LEVEL.upper()),
    )
    
    # Configure structlog
    processors = [
        # Add log level to event dict
        structlog.stdlib.add_log_level,
        # Add timestamp
        structlog.processors.TimeStamper(fmt="iso"),
        # Add logger name
        structlog.stdlib.add_logger_name,
    ]
    
    if settings.LOG_FORMAT == "json":
        # JSON output for production
        processors.extend([
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer()
        ])
    else:
        # Pretty console output for development
        processors.extend([
            structlog.dev.set_exc_info,
            structlog.dev.ConsoleRenderer(colors=True)
        ])
    
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = None) -> FilteringBoundLogger:
    """Get a structured logger instance."""
    return structlog.get_logger(name or __name__)


def log_api_call(
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
    **kwargs: Any
) -> None:
    """Log API call with structured data."""
    logger = get_logger("api")
    
    log_data = {
        "event": "api_call",
        "method": method,
        "path": path,
        "status_code": status_code,
        "duration_ms": duration_ms,
        **kwargs
    }
    
    if status_code >= 500:
        logger.error("API call failed", **log_data)
    elif status_code >= 400:
        logger.warning("API call client error", **log_data)
    else:
        logger.info("API call successful", **log_data)


def log_beamng_operation(
    operation: str,
    success: bool,
    duration_ms: float = None,
    **kwargs: Any
) -> None:
    """Log BeamNG operation with structured data."""
    logger = get_logger("beamng")
    
    log_data = {
        "event": "beamng_operation",
        "operation": operation,
        "success": success,
        **kwargs
    }
    
    if duration_ms is not None:
        log_data["duration_ms"] = duration_ms
    
    if success:
        logger.info("BeamNG operation successful", **log_data)
    else:
        logger.error("BeamNG operation failed", **log_data)