# VW Crash-to-Repair Simulator
# Configuration management

import os
from pathlib import Path
from typing import Optional
import yaml
from dataclasses import dataclass

@dataclass
class BeamNGConfig:
    """BeamNG.tech configuration"""
    home_path: str
    host: str = "localhost"
    port: int = 25252
    user_folder: Optional[str] = None

@dataclass
class DatabaseConfig:
    """Database configuration"""
    type: str = "json"  # json, sqlite, postgresql
    connection_string: Optional[str] = None
    
@dataclass
class APIConfig:
    """API server configuration"""
    host: str = "localhost"
    port: int = 8000
    debug: bool = True
    cors_origins: list = None

@dataclass
class FrontendConfig:
    """Frontend configuration"""
    host: str = "localhost"
    port: int = 8080
    static_path: str = "src/frontend/static"

@dataclass
class AppConfig:
    """Main application configuration"""
    beamng: BeamNGConfig
    database: DatabaseConfig
    api: APIConfig
    frontend: FrontendConfig
    log_level: str = "INFO"
    data_dir: str = "data"

def load_config(config_path: str = "config/config.yaml") -> AppConfig:
    """Load configuration from YAML file"""
    
    # Default configuration
    default_beamng_home = os.getenv("BNG_HOME", "")
    
    config_file = Path(config_path)
    if not config_file.exists():
        # Create default configuration
        default_config = {
            "beamng": {
                "home_path": default_beamng_home,
                "host": "localhost",
                "port": 25252
            },
            "database": {
                "type": "json"
            },
            "api": {
                "host": "localhost", 
                "port": 8000,
                "debug": True,
                "cors_origins": ["http://localhost:8080"]
            },
            "frontend": {
                "host": "localhost",
                "port": 8080,
                "static_path": "src/frontend/static"
            },
            "log_level": "INFO",
            "data_dir": "data"
        }
        
        # Ensure config directory exists
        config_file.parent.mkdir(exist_ok=True)
        
        # Write default config
        with open(config_file, 'w') as f:
            yaml.dump(default_config, f, default_flow_style=False)
        
        print(f"Created default configuration at {config_path}")
        print("Please edit the configuration file and set your BeamNG.tech path")
    
    # Load configuration
    with open(config_file) as f:
        config_data = yaml.safe_load(f)
    
    return AppConfig(
        beamng=BeamNGConfig(**config_data["beamng"]),
        database=DatabaseConfig(**config_data["database"]),
        api=APIConfig(**config_data["api"]),
        frontend=FrontendConfig(**config_data["frontend"]),
        log_level=config_data.get("log_level", "INFO"),
        data_dir=config_data.get("data_dir", "data")
    )