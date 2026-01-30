# Outputs for VW Crash-to-Repair Simulator Infrastructure

output "backend_url" {
  description = "Backend API URL"
  value       = module.backend.url
}

output "frontend_url" {
  description = "Frontend Web URL"
  value       = module.frontend.url
}

output "database_connection_name" {
  description = "Cloud SQL connection name"
  value       = module.cloud_sql.connection_name
}

output "database_private_ip" {
  description = "Cloud SQL private IP"
  value       = module.cloud_sql.private_ip
}

output "redis_host" {
  description = "Redis host"
  value       = module.redis.host
}

output "artifact_registry_url" {
  description = "Artifact Registry URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/vw-crash-simulator"
}

output "vpc_connector" {
  description = "VPC Connector name"
  value       = google_vpc_access_connector.connector.name
}
