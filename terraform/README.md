# VW Crash-to-Repair Simulator - GCP Infrastructure

This directory contains Terraform configurations for deploying the VW Crash-to-Repair Simulator to Google Cloud Platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Cloud Load Balancer (SSL/TLS)                     │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────────┐
│  Cloud Run Services         │                                        │
│  ┌──────────────┐  ┌────────┴───────┐                               │
│  │ Backend API  │  │    Frontend    │                               │
│  │  (FastAPI)   │  │    (React)     │                               │
│  └──────┬───────┘  └────────────────┘                               │
└─────────┼───────────────────────────────────────────────────────────┘
          │ VPC Connector
┌─────────┼───────────────────────────────────────────────────────────┐
│         ▼                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Cloud SQL   │  │    Redis     │  │   Secret     │              │
│  │ (PostgreSQL) │  │ (Memorystore)│  │   Manager    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└──────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **GCP Project**: `vw-beamng`
2. **gcloud CLI**: Installed and authenticated
3. **Terraform**: Version >= 1.5.0
4. **Billing**: Enabled on the GCP project

## Initial Setup

### 1. Create Terraform State Bucket

```bash
# Create GCS bucket for Terraform state
gsutil mb -p vw-beamng -l us-central1 gs://vw-beamng-terraform-state

# Enable versioning
gsutil versioning set on gs://vw-beamng-terraform-state
```

### 2. Authenticate with GCP

```bash
# Login to GCP
gcloud auth login

# Set project
gcloud config set project vw-beamng

# Create application default credentials for Terraform
gcloud auth application-default login
```

### 3. Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  compute.googleapis.com \
  servicenetworking.googleapis.com \
  vpcaccess.googleapis.com
```

## Deployment

### Deploy Development Environment

```bash
cd terraform

# Initialize Terraform
terraform init

# Plan changes for dev
terraform plan -var-file=environments/dev.tfvars -out=dev.plan

# Apply changes
terraform apply dev.plan
```

### Deploy Production Environment

```bash
# Plan changes for prod
terraform plan -var-file=environments/prod.tfvars -out=prod.plan

# Apply changes
terraform apply prod.plan
```

## CI/CD Setup

### 1. Connect GitHub Repository

```bash
# Connect to GitHub (run in Cloud Console or use gcloud)
gcloud builds triggers create github \
  --name="vw-crash-simulator-dev" \
  --repo-owner="JefinFrancis" \
  --repo-name="vw-crash-to-repair-simulator" \
  --branch-pattern="^develop$" \
  --build-config="cloudbuild.yaml"

gcloud builds triggers create github \
  --name="vw-crash-simulator-prod" \
  --repo-owner="JefinFrancis" \
  --repo-name="vw-crash-to-repair-simulator" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild-prod.yaml"
```

### 2. Grant Cloud Build Permissions

```bash
PROJECT_NUMBER=$(gcloud projects describe vw-beamng --format='value(projectNumber)')

# Cloud Run Admin
gcloud projects add-iam-policy-binding vw-beamng \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

# Service Account User
gcloud projects add-iam-policy-binding vw-beamng \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Artifact Registry Writer
gcloud projects add-iam-policy-binding vw-beamng \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Secret Manager Accessor
gcloud projects add-iam-policy-binding vw-beamng \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Environment Variables

### Backend (Cloud Run)

| Variable | Description |
|----------|-------------|
| `ENVIRONMENT` | `dev` or `prod` |
| `DATABASE_HOST` | Cloud SQL private IP |
| `DATABASE_NAME` | `vw_crash_simulator` |
| `DATABASE_USER` | `app` |
| `DATABASE_PASSWORD` | From Secret Manager |
| `REDIS_HOST` | Memorystore IP |
| `REDIS_PORT` | `6379` |

### Frontend (Build Time)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend Cloud Run URL |

## Costs Estimate

### Development Environment (Scale to Zero)
- Cloud SQL (db-f1-micro): ~$7/month
- Memorystore (1GB Basic): ~$35/month
- Cloud Run: Pay per use (~$0 when idle)
- **Total**: ~$42/month minimum

### Production Environment (Always On)
- Cloud SQL (db-custom-2-4096): ~$50/month
- Memorystore (2GB Standard HA): ~$140/month
- Cloud Run (min 1 instance): ~$25/month
- **Total**: ~$215/month minimum

## Useful Commands

```bash
# View Cloud Run services
gcloud run services list --region=us-central1

# View logs
gcloud logs read --project=vw-beamng --limit=50

# Connect to Cloud SQL
gcloud sql connect vw-crash-simulator-db-dev --user=app

# View Terraform state
terraform state list

# Destroy infrastructure (careful!)
terraform destroy -var-file=environments/dev.tfvars
```

## Troubleshooting

### VPC Connector Issues
```bash
# Check connector status
gcloud compute networks vpc-access connectors describe vw-connector-dev \
  --region=us-central1
```

### Cloud SQL Connection Issues
```bash
# Test connectivity from Cloud Run
gcloud run services update vw-crash-simulator-api-dev \
  --add-cloudsql-instances=vw-beamng:us-central1:vw-crash-simulator-db-dev
```

### Build Failures
```bash
# View build logs
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```
