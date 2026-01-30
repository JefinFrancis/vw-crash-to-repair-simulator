"""Configuration management using Pydantic Settings."""

import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment-based configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Application settings
    APP_NAME: str = "VW Crash-to-Repair Simulator"
    VERSION: str = "2.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Database settings - can be set via DATABASE_URL or individual components
    DATABASE_URL: Optional[str] = None
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 5432
    DATABASE_NAME: str = "vw_simulator"
    DATABASE_USER: str = "vw_user"
    DATABASE_PASSWORD: str = "vw_password"
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10

    # Redis settings
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_TTL: int = 3600  # 1 hour default

    # BeamNG settings
    BEAMNG_HOST: str = "localhost"
    BEAMNG_PORT: int = 64256
    BEAMNG_TIMEOUT: int = 30
    BEAMNG_USER_PATH: Optional[str] = None

    # Security settings
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # API settings
    API_V1_STR: str = "/api/v1"
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Brazilian settings
    DEFAULT_CURRENCY: str = "BRL"
    DEFAULT_LOCALE: str = "pt_BR"
    DEFAULT_TIMEZONE: str = "America/Sao_Paulo"

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    @property
    def effective_database_url(self) -> str:
        """Get the effective DATABASE_URL, building from components if not set."""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        # Build from individual components
        return f"postgresql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"

    @property
    def database_url_async(self) -> str:
        """Async database URL for SQLAlchemy."""
        return self.effective_database_url.replace("postgresql://", "postgresql+asyncpg://")
    
    @property
    def ALLOWED_ORIGINS(self) -> list[str]:
        """Get allowed CORS origins."""
        return self.CORS_ORIGINS
    
    def get_current_timestamp(self):
        """Get current timestamp with Brazilian timezone."""
        import pendulum
        return pendulum.now(self.DEFAULT_TIMEZONE)
    
    def get_current_timestamp_str(self) -> str:
        """Get current timestamp as string."""
        return self.get_current_timestamp().isoformat()


# Create global settings instance
settings = Settings()