#!/bin/bash
# =============================================================================
# VW Crash-to-Repair Simulator — Build & Deploy Images to Cloud Run
# =============================================================================
# Infrastructure (Cloud SQL, Cloud Run services, VPC, Artifact Registry) is
# managed by Terraform in ./terraform/. This script only builds Docker images
# and deploys them to the existing Cloud Run services.
#
# Usage:
#   ./deploy.sh <DB_PASSWORD>
#
# Prerequisites:
#   - gcloud CLI installed and authenticated (gcloud auth login)
#   - Docker installed and running
#   - Infrastructure already provisioned via Terraform:
#       cd terraform && terraform apply -var-file=environments/dev.tfvars
#
# Example:
#   ./deploy.sh mySecurePassword123
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Arguments & Configuration (must match Terraform outputs)
# ---------------------------------------------------------------------------
if [ $# -lt 1 ]; then
    echo "Usage: $0 <DB_PASSWORD>"
    echo "Example: $0 mySecurePassword123"
    exit 1
fi

DB_PASSWORD="$1"
PROJECT_ID="vw-beamng"
REGION="us-central1"
REPO="vw-crash-simulator"
BACKEND_SERVICE="vw-crash-simulator-api-dev"
FRONTEND_SERVICE="vw-crash-simulator-web-dev"
CLOUD_SQL_INSTANCE="vw-crash-simulator-db-dev"
DB_NAME="vw_crash_simulator"
DB_USER="app"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"
CLOUD_SQL_CONNECTION="${PROJECT_ID}:${REGION}:${CLOUD_SQL_INSTANCE}"
VPC_CONNECTOR="vw-connector-dev"

echo "============================================"
echo "  VW Crash-to-Repair — Build & Deploy"
echo "============================================"
echo "Project:    $PROJECT_ID"
echo "Region:     $REGION"
echo "Registry:   $REGISTRY"
echo "Cloud SQL:  $CLOUD_SQL_CONNECTION"
echo ""

# ---------------------------------------------------------------------------
# Step 1: Configure Docker auth
# ---------------------------------------------------------------------------
echo "[1/8] Configuring Docker authentication..."
gcloud config set project "$PROJECT_ID" --quiet
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# ---------------------------------------------------------------------------
# Step 2: Reset Cloud SQL database (drop + recreate for clean schema)
# ---------------------------------------------------------------------------
echo "[2/9] Resetting Cloud SQL database..."

# Delete both Cloud Run services to release DB connections before dropping
echo "  Deleting backend service..."
gcloud run services delete "$BACKEND_SERVICE" \
    --region="$REGION" \
    --quiet 2>&1 || echo "  (backend service not found, continuing)"

echo "  Deleting frontend service..."
gcloud run services delete "$FRONTEND_SERVICE" \
    --region="$REGION" \
    --quiet 2>&1 || echo "  (frontend service not found, continuing)"
sleep 10

echo "  Dropping database '$DB_NAME'..."
gcloud sql databases delete "$DB_NAME" \
    --instance="$CLOUD_SQL_INSTANCE" \
    --quiet 2>&1 || echo "  (database didn't exist, continuing)"

echo "  Waiting for Cloud SQL to be ready..."
gcloud sql operations list \
    --instance="$CLOUD_SQL_INSTANCE" \
    --filter="status!=DONE" \
    --format="value(name)" | while read -r op; do
    echo "  Waiting for operation $op..."
    gcloud sql operations wait "$op" --timeout=120 --quiet 2>&1
done
sleep 10

echo "  Creating fresh database '$DB_NAME'..."
gcloud sql databases create "$DB_NAME" \
    --instance="$CLOUD_SQL_INSTANCE" \
    --quiet 2>&1 || echo "  (database already exists, continuing)"
echo "  Database '$DB_NAME' ready"

# Set password for the user
gcloud sql users set-password "$DB_USER" \
    --instance="$CLOUD_SQL_INSTANCE" \
    --password="$DB_PASSWORD" \
    --quiet
echo "  User '$DB_USER' password set"

# ---------------------------------------------------------------------------
# Step 3: Copy data files into backend for Docker build
# ---------------------------------------------------------------------------
echo "[3/9] Preparing data files for Docker build..."
cp -f VEHICLE_PARTS.csv backend/VEHICLE_PARTS.csv 2>/dev/null || echo "  (VEHICLE_PARTS.csv not found, skipping)"
cp -rf data backend/data 2>/dev/null || echo "  (data/ not found, skipping)"

# ---------------------------------------------------------------------------
# Step 4: Build & push backend image
# ---------------------------------------------------------------------------
echo "[4/9] Building backend Docker image..."
docker build \
    -t "${REGISTRY}/backend:latest" \
    --target production \
    -f backend/Dockerfile \
    backend/

echo "  Pushing backend image..."
docker push "${REGISTRY}/backend:latest"

# ---------------------------------------------------------------------------
# Step 4: Deploy backend to Cloud Run
# ---------------------------------------------------------------------------
echo "[5/9] Deploying backend to Cloud Run..."
DATABASE_URL="postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CLOUD_SQL_CONNECTION}"
SECRET_KEY=$(openssl rand -hex 32)

gcloud run deploy "$BACKEND_SERVICE" \
    --image="${REGISTRY}/backend:latest" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=1 \
    --max-instances=1 \
    --add-cloudsql-instances="$CLOUD_SQL_CONNECTION" \
    --vpc-connector="$VPC_CONNECTOR" \
    --vpc-egress=private-ranges-only \
    --set-env-vars="^##^DATABASE_URL=${DATABASE_URL}##ENVIRONMENT=production##WPP_API_KEY=05a3a4c4-2a66-4aac-b965-3922018de527##SECRET_KEY=${SECRET_KEY}##LOG_LEVEL=INFO##CORS_ORIGINS=[\"http://localhost:3000\"]" \
    --quiet

# Get backend URL
BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
    --region="$REGION" \
    --format='value(status.url)')
echo "  Backend deployed: $BACKEND_URL"

# ---------------------------------------------------------------------------
# Step 5: Build & push frontend image (with real backend URL)
# ---------------------------------------------------------------------------
echo "[6/9] Building frontend Docker image with API URL: $BACKEND_URL..."
docker build \
    -t "${REGISTRY}/frontend:latest" \
    --target production \
    --build-arg "VITE_API_URL=${BACKEND_URL}" \
    -f frontend/Dockerfile \
    frontend/

echo "  Pushing frontend image..."
docker push "${REGISTRY}/frontend:latest"

# ---------------------------------------------------------------------------
# Step 6: Deploy frontend to Cloud Run
# ---------------------------------------------------------------------------
echo "[7/9] Deploying frontend to Cloud Run..."
gcloud run deploy "$FRONTEND_SERVICE" \
    --image="${REGISTRY}/frontend:latest" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --memory=256Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=3 \
    --quiet

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
    --region="$REGION" \
    --format='value(status.url)')
echo "  Frontend deployed: $FRONTEND_URL"

# ---------------------------------------------------------------------------
# Step 7: Update backend CORS with frontend URL
# ---------------------------------------------------------------------------
echo "[8/9] Updating backend CORS origins..."
gcloud run services update "$BACKEND_SERVICE" \
    --region="$REGION" \
    --update-env-vars="^##^CORS_ORIGINS=[\"${FRONTEND_URL}\",\"http://localhost:3000\"]" \
    --quiet

# ---------------------------------------------------------------------------
# Step 8: Cleanup temp data files
# ---------------------------------------------------------------------------
echo "[9/9] Cleaning up temporary files..."
rm -f backend/VEHICLE_PARTS.csv
rm -rf backend/data

# ---------------------------------------------------------------------------
# Done!
# ---------------------------------------------------------------------------
echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
echo "  Frontend: $FRONTEND_URL"
echo "  Backend:  $BACKEND_URL"
echo "  API Docs: $BACKEND_URL/docs"
echo "  Health:   $BACKEND_URL/api/v1/health"
echo ""
echo "  To view logs:"
echo "    gcloud run services logs read $BACKEND_SERVICE --region=$REGION --limit=50"
echo "    gcloud run services logs read $FRONTEND_SERVICE --region=$REGION --limit=50"
echo ""
