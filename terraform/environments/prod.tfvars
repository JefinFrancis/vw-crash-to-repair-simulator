# Production Environment Configuration
# VW Crash-to-Repair Simulator

project_id  = "vw-beamng"
region      = "us-central1"
environment = "prod"

# Database - production tier with HA
db_tier = "db-custom-2-4096"

# Redis - larger for production
redis_memory_size_gb = 2

# Backend - always running, higher limits
backend_min_instances = 1
backend_max_instances = 20
backend_memory        = "1Gi"
backend_cpu           = "2"

# Frontend - always running, higher limits
frontend_min_instances = 1
frontend_max_instances = 10
