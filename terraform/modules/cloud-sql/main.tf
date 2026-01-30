# Cloud SQL (PostgreSQL) Module for VW Crash-to-Repair Simulator

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
  description = "Cloud SQL instance name"
  type        = string
}

variable "database_name" {
  description = "Database name"
  type        = string
}

variable "tier" {
  description = "Instance tier"
  type        = string
  default     = "db-f1-micro"
}

variable "vpc_network_id" {
  description = "VPC network ID for private IP"
  type        = string
}

variable "disk_size_gb" {
  description = "Disk size in GB"
  type        = number
  default     = 10
}

variable "disk_autoresize" {
  description = "Enable disk autoresize"
  type        = bool
  default     = true
}

variable "disk_autoresize_limit" {
  description = "Maximum disk size for autoresize"
  type        = number
  default     = 100
}

# Generate random password
resource "random_password" "db_password" {
  length  = 32
  special = false
}

# Cloud SQL Instance
resource "google_sql_database_instance" "instance" {
  name             = var.instance_name
  database_version = "POSTGRES_15"
  region           = var.region
  project          = var.project_id

  settings {
    tier              = var.tier
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"
    disk_size         = var.disk_size_gb
    disk_autoresize   = var.disk_autoresize
    disk_autoresize_limit = var.disk_autoresize_limit

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = var.environment == "prod"
      start_time                     = "03:00"
      backup_retention_settings {
        retained_backups = var.environment == "prod" ? 30 : 7
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_network_id
    }

    maintenance_window {
      day          = 7  # Sunday
      hour         = 4  # 4 AM
      update_track = "stable"
    }

    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }

    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }

    database_flags {
      name  = "log_disconnections"
      value = "on"
    }

    database_flags {
      name  = "log_lock_waits"
      value = "on"
    }
  }

  deletion_protection = var.environment == "prod"
}

# Database
resource "google_sql_database" "database" {
  name     = var.database_name
  instance = google_sql_database_instance.instance.name
  project  = var.project_id
}

# Database User
resource "google_sql_user" "app_user" {
  name     = "app"
  instance = google_sql_database_instance.instance.name
  password = random_password.db_password.result
  project  = var.project_id
}

# Outputs
output "connection_name" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.instance.connection_name
}

output "private_ip" {
  description = "Cloud SQL private IP address"
  value       = google_sql_database_instance.instance.private_ip_address
}

output "password" {
  description = "Database password"
  value       = random_password.db_password.result
  sensitive   = true
}

output "database_name" {
  description = "Database name"
  value       = google_sql_database.database.name
}

output "user" {
  description = "Database user"
  value       = google_sql_user.app_user.name
}
