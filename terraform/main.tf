# VW Crash-to-Repair Simulator - GCP Infrastructure
# Project: vw-beamng
# Region: us-central1

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.10"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.10"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "gcs" {
    bucket = "vw-beamng-terraform-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "compute.googleapis.com",
    "servicenetworking.googleapis.com",
    "vpcaccess.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# Artifact Registry for Docker images
resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = "vw-crash-simulator"
  description   = "Docker repository for VW Crash-to-Repair Simulator"
  format        = "DOCKER"

  depends_on = [google_project_service.apis]
}

# VPC Network for private services
resource "google_compute_network" "vpc" {
  name                    = "vw-crash-simulator-vpc-${var.environment}"
  auto_create_subnetworks = false
  project                 = var.project_id

  depends_on = [google_project_service.apis]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "vw-crash-simulator-subnet-${var.environment}"
  ip_cidr_range = var.environment == "prod" ? "10.0.0.0/24" : "10.1.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id

  private_ip_google_access = true
}

# Private IP range for Cloud SQL
resource "google_compute_global_address" "private_ip_range" {
  name          = "vw-crash-simulator-private-ip-${var.environment}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

# VPC Connector for Cloud Run to access private services
resource "google_vpc_access_connector" "connector" {
  name          = "vw-connector-${var.environment}"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = var.environment == "prod" ? "10.8.0.0/28" : "10.9.0.0/28"

  depends_on = [google_project_service.apis]
}

# Cloud SQL (PostgreSQL)
module "cloud_sql" {
  source = "./modules/cloud-sql"

  project_id      = var.project_id
  region          = var.region
  environment     = var.environment
  instance_name   = "vw-crash-simulator-db-${var.environment}"
  database_name   = "vw_crash_simulator"
  tier            = var.db_tier
  vpc_network_id  = google_compute_network.vpc.id

  depends_on = [google_service_networking_connection.private_vpc_connection]
}

# Redis (Memorystore)
module "redis" {
  source = "./modules/redis"

  project_id     = var.project_id
  region         = var.region
  environment    = var.environment
  instance_name  = "vw-crash-simulator-redis-${var.environment}"
  memory_size_gb = var.redis_memory_size_gb
  vpc_network_id = google_compute_network.vpc.id

  depends_on = [google_project_service.apis]
}

# Secret Manager secrets
resource "google_secret_manager_secret" "db_password" {
  secret_id = "vw-crash-simulator-db-password-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = module.cloud_sql.password
}

# Cloud Run - Backend API
module "backend" {
  source = "./modules/cloud-run"

  project_id    = var.project_id
  region        = var.region
  service_name  = "vw-crash-simulator-api-${var.environment}"
  image         = "${var.region}-docker.pkg.dev/${var.project_id}/vw-crash-simulator/backend:latest"
  
  min_instances = var.backend_min_instances
  max_instances = var.backend_max_instances
  memory        = var.backend_memory
  cpu           = var.backend_cpu

  vpc_connector = google_vpc_access_connector.connector.id

  # Note: DATABASE_URL is constructed from components, with password from secrets
  env_vars = {
    ENVIRONMENT    = var.environment
    APP_NAME       = "VW Crash-to-Repair Simulator API"
    DATABASE_HOST  = module.cloud_sql.private_ip
    DATABASE_NAME  = "vw_crash_simulator"
    DATABASE_USER  = "app"
    REDIS_URL      = "redis://${module.redis.host}:6379/0"
  }

  secrets = {
    DATABASE_PASSWORD = google_secret_manager_secret.db_password.secret_id
  }

  depends_on = [
    google_artifact_registry_repository.docker_repo,
    module.cloud_sql,
    module.redis,
  ]
}

# Cloud Run - Frontend
module "frontend" {
  source = "./modules/cloud-run"

  project_id    = var.project_id
  region        = var.region
  service_name  = "vw-crash-simulator-web-${var.environment}"
  image         = "${var.region}-docker.pkg.dev/${var.project_id}/vw-crash-simulator/frontend:latest"
  
  min_instances = var.frontend_min_instances
  max_instances = var.frontend_max_instances
  memory        = "256Mi"
  cpu           = "1"

  env_vars = {
    VITE_API_URL = module.backend.url
  }

  secrets = {}

  depends_on = [
    google_artifact_registry_repository.docker_repo,
    module.backend,
  ]
}

# Cloud Build Service Account permissions
resource "google_project_iam_member" "cloudbuild_run" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_artifacts" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

data "google_project" "project" {
  project_id = var.project_id
}
