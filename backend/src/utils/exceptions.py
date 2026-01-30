"""Custom exception classes for VW application."""

class VWApplicationError(Exception):
    """Base exception for VW application errors."""
    pass


class ValidationException(VWApplicationError):
    """Raised when validation fails in business logic services."""
    
    def __init__(self, message: str, field: str = None, code: str = None):
        super().__init__(message)
        self.field = field
        self.code = code


class ServiceException(VWApplicationError):
    """Raised when service operation fails."""
    
    def __init__(self, message: str, service: str = None, operation: str = None):
        super().__init__(message)
        self.service = service
        self.operation = operation


class BeamNGConnectionError(VWApplicationError):
    """Raised when BeamNG connection fails or is lost."""
    pass


class TelemetryExtractionError(VWApplicationError):
    """Raised when telemetry data extraction fails."""
    pass


class VehicleLoadError(VWApplicationError):
    """Raised when vehicle scenario loading fails."""
    pass


class CrashSimulationError(VWApplicationError):
    """Raised when crash simulation execution fails."""
    pass


class DatabaseConnectionError(VWApplicationError):
    """Raised when database connection fails."""
    pass


class ValidationError(VWApplicationError):
    """Raised when data validation fails."""
    pass