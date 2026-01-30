# Redis (Memorystore) Module for VW Crash-to-Repair Simulator

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
}

variable "environment" {
  description = "Environment (dev or prod)"
  type        = string
}

variable "instance_name" {
  description = "Redis instance name"
  type        = string
}

variable "memory_size_gb" {
  description = "Memory size in GB"
  type        = number
  default     = 1
}

variable "vpc_network_id" {
  description = "VPC network ID"
  type        = string
}

variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "REDIS_7_0"
}

resource "google_redis_instance" "redis" {
  name           = var.instance_name
  tier           = var.environment == "prod" ? "STANDARD_HA" : "BASIC"
  memory_size_gb = var.memory_size_gb
  region         = var.region
  project        = var.project_id

  redis_version = var.redis_version

  authorized_network = var.vpc_network_id

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 4
        minutes = 0
      }
    }
  }

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }

  labels = {
    environment = var.environment
    app         = "vw-crash-simulator"
  }
}

output "host" {
  description = "Redis host"
  value       = google_redis_instance.redis.host
}

output "port" {
  description = "Redis port"
  value       = google_redis_instance.redis.port
}

output "current_location_id" {
  description = "Redis current location"
  value       = google_redis_instance.redis.current_location_id
}
