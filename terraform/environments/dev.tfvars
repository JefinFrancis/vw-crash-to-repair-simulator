# Development Environment Configuration
# VW Crash-to-Repair Simulator

project_id  = "vw-beamng"
region      = "us-central1"
environment = "dev"

# Database - smaller for dev
db_tier = "db-f1-micro"

# Redis - minimal for dev
redis_memory_size_gb = 1

# Backend - scale to zero, lower limits
backend_min_instances = 0
backend_max_instances = 5
backend_memory        = "512Mi"
backend_cpu           = "1"

# Frontend - scale to zero, lower limits
frontend_min_instances = 0
frontend_max_instances = 3
