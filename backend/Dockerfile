# Multi-stage Dockerfile for VW Crash-to-Repair Simulator Backend
# FastAPI + SQLAlchemy + PostgreSQL + Redis

# =============================================================================
# Base Stage - Common dependencies
# =============================================================================
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    POETRY_VERSION=1.7.1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry==$POETRY_VERSION

# Create app directory
WORKDIR /app

# Copy Poetry configuration
COPY pyproject.toml poetry.lock* ./

# Configure Poetry
RUN poetry config virtualenvs.create false

# =============================================================================
# Development Stage
# =============================================================================
FROM base as development

# Install all dependencies including dev dependencies
RUN poetry install --no-interaction --no-ansi

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8000

# Development command (will be overridden by docker-compose)
CMD ["poetry", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# =============================================================================
# Production Dependencies Stage
# =============================================================================
FROM base as prod-deps

# Install only production dependencies
RUN poetry install --only=main --no-interaction --no-ansi

# =============================================================================
# Production Stage
# =============================================================================
FROM python:3.11-slim as production

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENVIRONMENT=production

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r vwapp && useradd -r -g vwapp vwapp

# Create app directory
WORKDIR /app

# Copy production dependencies from prod-deps stage
COPY --from=prod-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=prod-deps /usr/local/bin /usr/local/bin

# Copy source code
COPY --chown=vwapp:vwapp . .

# Create logs directory
RUN mkdir -p logs && chown -R vwapp:vwapp logs

# Switch to non-root user
USER vwapp

# Health check (port 8080 for Cloud Run)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/v1/health || exit 1

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Production command (port 8080 for Cloud Run)
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "4"]