# Full-Stack GCP Project Architecture Guide

A comprehensive guide for setting up production-ready full-stack applications with FastAPI, React, and Google Cloud Platform. Designed for AI agents implementing new projects.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Why This Architecture](#why-this-architecture)
3. [Project Structure](#project-structure)
4. [Technology Choices & Rationale](#technology-choices--rationale)
5. [Local Development Setup](#local-development-setup)
6. [Backend Implementation](#backend-implementation)
7. [Frontend Implementation](#frontend-implementation)
8. [Database & Migrations](#database--migrations)
9. [Infrastructure as Code](#infrastructure-as-code)
10. [CI/CD Pipeline](#cicd-pipeline)
11. [Alternative Design Decisions](#alternative-design-decisions)
12. [Quick Start Checklist](#quick-start-checklist)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Cloud Load Balancer (SSL/TLS)                     │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────────┐
│  Cloud Run Services         │                                        │
│  ┌──────────────┐  ┌────────┴───────┐  ┌──────────────┐            │
│  │ Backend API  │  │    Frontend    │  │   Workers    │            │
│  │  (FastAPI)   │  │    (React)     │  │  (Pub/Sub)   │            │
│  └──────┬───────┘  └────────────────┘  └──────┬───────┘            │
└─────────┼──────────────────────────────────────┼────────────────────┘
          │                                      │
┌─────────┼──────────────────────────────────────┼────────────────────┐
│         ▼                                      ▼                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Cloud SQL   │  │   Pub/Sub    │  │  Scheduler   │              │
│  │ (PostgreSQL) │  │   (Events)   │  │   (Cron)     │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │    Redis     │  │   Secret     │  │   Identity   │              │
│  │ (Memorystore)│  │   Manager    │  │   Platform   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└──────────────────────────────────────────────────────────────────────┘
```

### Three-Environment Strategy

```
┌──────────────┐     git push      ┌──────────────┐    merge to     ┌──────────────┐
│    LOCAL     │ ─────────────────▶│     DEV      │ ──────────────▶│     PROD     │
│              │                   │              │    main         │              │
│ Docker       │   Auto-deploy     │ Cloud Run    │                 │ Cloud Run    │
│ Compose      │   on develop      │ Dev DB       │  Manual         │ Prod DB      │
│ localhost    │   branch push     │              │  Promotion      │              │
└──────────────┘                   └──────────────┘                 └──────────────┘
```

---

## Why This Architecture

### 1. **Containerized Microservices on Cloud Run**

**Why:** Cloud Run provides serverless container hosting with automatic scaling, pay-per-use billing, and zero infrastructure management.

**Benefits:**
- Scale to zero when not in use (cost savings)
- Auto-scale to handle traffic spikes
- No Kubernetes complexity
- Built-in load balancing and SSL
- Easy rollbacks with revision management

**Trade-off:** Cold starts can add 1-3 seconds latency for infrequently accessed services.

### 2. **Separate Backend/Frontend/Workers**

**Why:** Separation of concerns allows independent scaling and deployment.

**Benefits:**
- Frontend can be deployed to CDN for better performance
- Backend API can scale based on request load
- Workers can scale based on queue depth
- Different teams can work independently
- Failure isolation (worker crash doesn't affect API)

### 3. **Async Python with FastAPI**

**Why:** FastAPI is the fastest Python web framework with native async support, automatic OpenAPI docs, and Pydantic validation.

**Benefits:**
- 10-100x faster than Flask/Django for I/O-bound workloads
- Automatic request/response validation
- Auto-generated API documentation
- Native async/await for database and HTTP calls
- Type hints improve code quality and IDE support

### 4. **PostgreSQL with Async SQLAlchemy**

**Why:** PostgreSQL is battle-tested, feature-rich, and Cloud SQL provides managed hosting with automatic backups.

**Benefits:**
- ACID compliance for data integrity
- JSON/JSONB support for flexible schemas
- Full-text search built-in
- Async driver (asyncpg) for non-blocking queries
- Cloud SQL handles replication, backups, failover

### 5. **React + TypeScript + Vite**

**Why:** Industry standard for complex UIs with excellent developer experience.

**Benefits:**
- Type safety catches bugs at compile time
- Vite provides instant hot module replacement
- Massive ecosystem of libraries
- Easy to hire developers who know React

### 6. **Pub/Sub for Background Jobs**

**Why:** Decouples long-running tasks from request/response cycle.

**Benefits:**
- Reliable message delivery with acknowledgments
- Dead letter queues for failed messages
- Automatic retry with exponential backoff
- Scale workers independently from API
- Native GCP integration

### 7. **Terraform for Infrastructure**

**Why:** Infrastructure as Code ensures reproducible, version-controlled environments.

**Benefits:**
- Dev/Prod parity through shared modules
- Review infrastructure changes in PRs
- Rollback infrastructure like code
- Self-documenting architecture

---

## Project Structure

```
my-project/
├── backend/
│   ├── src/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI application entry point
│   │   ├── config.py               # Pydantic Settings configuration
│   │   ├── database.py             # Async SQLAlchemy setup
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── router.py       # API router aggregation
│   │   │       ├── health.py       # Health check endpoint
│   │   │       └── [domain].py     # Domain-specific endpoints
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── base.py             # SQLAlchemy base with common mixins
│   │   │   └── [domain].py         # Domain models
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── [domain].py         # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── [domain]_service.py # Business logic
│   │   ├── repositories/
│   │   │   ├── __init__.py
│   │   │   └── [domain]_repository.py  # Data access layer
│   │   ├── workers/
│   │   │   ├── __init__.py
│   │   │   └── [job]_worker.py     # Pub/Sub message handlers
│   │   └── integrations/
│   │       ├── __init__.py
│   │       └── [service]_client.py # External API clients
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py             # Pytest fixtures
│   │   ├── unit/
│   │   └── integration/
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/               # Migration files
│   ├── alembic.ini
│   ├── pyproject.toml              # Poetry dependencies
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                # React entry point
│   │   ├── App.tsx                 # Root component with routing
│   │   ├── pages/
│   │   │   └── [Page].tsx          # Route components
│   │   ├── components/
│   │   │   ├── ui/                 # Reusable UI components
│   │   │   └── [feature]/          # Feature-specific components
│   │   ├── api/
│   │   │   ├── client.ts           # Axios/fetch configuration
│   │   │   └── [domain].ts         # API call functions
│   │   ├── hooks/
│   │   │   └── use[Hook].ts        # Custom React hooks
│   │   ├── store/
│   │   │   └── [store].ts          # Zustand state stores
│   │   └── types/
│   │       └── [domain].ts         # TypeScript interfaces
│   ├── tests/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── terraform/
│   ├── main.tf                     # Root module
│   ├── variables.tf
│   ├── outputs.tf
│   ├── modules/
│   │   ├── cloud-run/
│   │   ├── cloud-sql/
│   │   ├── pubsub/
│   │   ├── redis/
│   │   └── cloud-scheduler/
│   └── environments/
│       ├── dev.tfvars
│       └── prod.tfvars
│
├── docker-compose.yml              # Local development services
├── cloudbuild.yaml                 # CI/CD pipeline
├── cloudbuild-prod.yaml            # Production deployment
├── Makefile                        # Common commands
└── README.md
```

---

## Technology Choices & Rationale

### Backend Stack

| Technology | Version | Purpose | Why This Choice |
|------------|---------|---------|-----------------|
| Python | 3.11+ | Runtime | Latest stable with performance improvements |
| FastAPI | 0.109+ | Web framework | Fastest Python framework, async native, auto-docs |
| Pydantic | 2.5+ | Validation | V2 is 5-50x faster than V1 |
| SQLAlchemy | 2.0+ | ORM | Industry standard, excellent async support |
| asyncpg | 0.29+ | DB driver | Fastest PostgreSQL driver for Python |
| Alembic | 1.13+ | Migrations | SQLAlchemy's official migration tool |
| Poetry | 1.7+ | Dependency mgmt | Lock files, dependency resolution |
| structlog | 24.1+ | Logging | Structured JSON logs for cloud environments |

### Frontend Stack

| Technology | Version | Purpose | Why This Choice |
|------------|---------|---------|-----------------|
| React | 18+ | UI library | Industry standard, huge ecosystem |
| TypeScript | 5.3+ | Language | Type safety, better IDE support |
| Vite | 5.0+ | Build tool | 10-100x faster than Webpack |
| Tailwind CSS | 3.4+ | Styling | Utility-first, small bundle size |
| React Query | 5.0+ | Data fetching | Caching, background refresh, optimistic updates |
| Zustand | 4.5+ | State mgmt | Simple, lightweight, no boilerplate |
| React Router | 6.21+ | Routing | Standard for React SPAs |

### Infrastructure Stack

| Technology | Purpose | Why This Choice |
|------------|---------|-----------------|
| Cloud Run | Container hosting | Serverless, auto-scaling, pay-per-use |
| Cloud SQL | Database | Managed PostgreSQL with auto-backups |
| Memorystore | Caching | Managed Redis, VPC-native |
| Pub/Sub | Message queue | Reliable, scalable, dead-letter support |
| Cloud Scheduler | Cron jobs | Managed cron, triggers Pub/Sub |
| Secret Manager | Secrets | Audit logging, versioning, IAM |
| Identity Platform | Auth | SSO support, managed user directory |
| Artifact Registry | Container registry | Regional, IAM-integrated |
| Cloud Build | CI/CD | Native GCP integration |

---

## Local Development Setup

### docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: ${PROJECT_NAME:-myproject}-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ${PROJECT_NAME:-myproject}_local
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ${PROJECT_NAME:-myproject}-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  pubsub-emulator:
    image: gcr.io/google.com/cloudsdktool/google-cloud-cli:emulators
    container_name: ${PROJECT_NAME:-myproject}-pubsub
    command: gcloud beta emulators pubsub start --host-port=0.0.0.0:8085
    ports:
      - "8085:8085"

volumes:
  postgres_data:
  redis_data:
```

### Makefile (Convenience Commands)

```makefile
.PHONY: setup dev backend frontend test lint migrate

# Initial setup
setup:
	docker-compose up -d
	cd backend && poetry install
	cd frontend && npm install
	cp backend/.env.example backend/.env.local
	cp frontend/.env.example frontend/.env.local

# Start all services
dev:
	docker-compose up -d
	@echo "Starting backend..."
	cd backend && poetry run uvicorn src.main:app --reload --port 8000 &
	@echo "Starting frontend..."
	cd frontend && npm run dev

# Individual services
backend:
	cd backend && poetry run uvicorn src.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

# Database
migrate:
	cd backend && poetry run alembic upgrade head

migrate-create:
	cd backend && poetry run alembic revision --autogenerate -m "$(name)"

# Testing
test:
	cd backend && poetry run pytest
	cd frontend && npm test

# Linting
lint:
	cd backend && poetry run ruff check src tests
	cd backend && poetry run mypy src
	cd frontend && npm run lint

# Clean up
clean:
	docker-compose down -v
```

---

## Backend Implementation

### config.py (Environment Configuration)

```python
"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from typing import Literal

from pydantic import PostgresDsn, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "My Project API"
    environment: Literal["local", "dev", "prod"] = "local"
    debug: bool = False
    version: str = "0.1.0"

    # Database
    database_url: PostgresDsn

    # Redis
    redis_url: RedisDsn = "redis://localhost:6379"

    # External Services (add as needed)
    # anthropic_api_key: str = ""
    # sendgrid_api_key: str = ""

    @field_validator("debug", mode="before")
    @classmethod
    def set_debug_from_environment(cls, v, info):
        if info.data.get("environment") == "local":
            return True
        return v


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
```

### database.py (Async SQLAlchemy Setup)

```python
"""Database configuration and session management."""

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from src.config import get_settings

settings = get_settings()

# Create async engine
engine = create_async_engine(
    str(settings.database_url),
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""
    pass


async def init_db() -> None:
    """Initialize database connection pool."""
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Get database session dependency."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Type alias for dependency injection
DBSession = Annotated[AsyncSession, Depends(get_session)]
```

### main.py (FastAPI Application)

```python
"""FastAPI application entry point."""

import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.database import init_db
from src.api.v1.router import api_router

settings = get_settings()
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info(f"Starting {settings.app_name}", environment=settings.environment)
    await init_db()
    yield
    # Shutdown
    logger.info(f"Shutting down {settings.app_name}")


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"] if settings.environment == "local" else ["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")
```

### models/base.py (Model Mixins)

```python
"""Base model with common mixins."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    """Adds created_at and updated_at timestamps."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class UUIDMixin:
    """Adds UUID primary key."""

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
```

### pyproject.toml

```toml
[tool.poetry]
name = "my-project-backend"
version = "0.1.0"
description = "Backend API"
authors = ["Your Team <team@example.com>"]
package-mode = false

[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.109.0"
uvicorn = {extras = ["standard"], version = "^0.27.0"}
pydantic = "^2.5.0"
pydantic-settings = "^2.1.0"
sqlalchemy = {extras = ["asyncio"], version = "^2.0.25"}
asyncpg = "^0.29.0"
alembic = "^1.13.1"
httpx = "^0.26.0"
redis = "^5.0.1"
structlog = "^24.1.0"
greenlet = "^3.0.0"

[tool.poetry.group.dev.dependencies]
pytest = "^8.0.0"
pytest-asyncio = "^0.23.0"
pytest-cov = "^4.1.0"
httpx = "^0.26.0"
ruff = "^0.1.14"
mypy = "^1.8.0"

[tool.ruff]
target-version = "py311"
line-length = 100
select = ["E", "W", "F", "I", "B", "C4", "UP"]
ignore = ["E501", "B008"]

[tool.mypy]
python_version = "3.11"
strict = true
ignore_missing_imports = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

### Dockerfile (Backend)

```dockerfile
FROM python:3.11-slim as builder

WORKDIR /app

# Install Poetry
RUN pip install poetry==1.7.1

# Copy dependency files
COPY pyproject.toml poetry.lock* ./

# Export dependencies to requirements.txt
RUN poetry export -f requirements.txt --output requirements.txt --without-hashes

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY --from=builder /app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY alembic/ ./alembic/
COPY alembic.ini .

# Run as non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Start server
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

---

## Frontend Implementation

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

### src/api/client.ts

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### package.json

```json
{
  "name": "my-project-frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.5.0",
    "axios": "^1.6.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "vitest": "^1.2.0",
    "@testing-library/react": "^14.1.0"
  }
}
```

### Dockerfile (Frontend)

```dockerfile
# Build stage
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
```

---

## Database & Migrations

### alembic.ini (Key Settings)

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = driver://user:pass@localhost/dbname

[logging]
keys = root,sqlalchemy,alembic
```

### alembic/env.py

```python
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

from src.config import get_settings
from src.database import Base
# Import all models to ensure they're registered
from src.models import *  # noqa

config = context.config
settings = get_settings()

# Set database URL from settings
config.set_main_option("sqlalchemy.url", str(settings.database_url))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### Creating Migrations

```bash
# Create a new migration
cd backend
poetry run alembic revision --autogenerate -m "add users table"

# Apply migrations
poetry run alembic upgrade head

# Rollback one migration
poetry run alembic downgrade -1

# View migration history
poetry run alembic history
```

---

## Infrastructure as Code

### terraform/modules/cloud-run/main.tf

```hcl
variable "project_id" {}
variable "region" {}
variable "service_name" {}
variable "image" {}
variable "env_vars" { type = map(string) }
variable "secrets" { type = map(string) }
variable "min_instances" { default = 0 }
variable "max_instances" { default = 10 }
variable "memory" { default = "512Mi" }
variable "cpu" { default = "1" }

resource "google_cloud_run_v2_service" "service" {
  name     = var.service_name
  location = var.region
  project  = var.project_id

  template {
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.image

      resources {
        limits = {
          memory = var.memory
          cpu    = var.cpu
        }
      }

      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secrets
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}

# Allow unauthenticated access (for public APIs)
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "url" {
  value = google_cloud_run_v2_service.service.uri
}
```

### terraform/modules/cloud-sql/main.tf

```hcl
variable "project_id" {}
variable "region" {}
variable "instance_name" {}
variable "database_name" {}
variable "tier" { default = "db-f1-micro" }

resource "google_sql_database_instance" "instance" {
  name             = var.instance_name
  database_version = "POSTGRES_15"
  region           = var.region
  project          = var.project_id

  settings {
    tier = var.tier

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }

    ip_configuration {
      ipv4_enabled = true
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "database" {
  name     = var.database_name
  instance = google_sql_database_instance.instance.name
  project  = var.project_id
}

resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "google_sql_user" "user" {
  name     = "app"
  instance = google_sql_database_instance.instance.name
  password = random_password.db_password.result
  project  = var.project_id
}

output "connection_name" {
  value = google_sql_database_instance.instance.connection_name
}

output "password" {
  value     = random_password.db_password.result
  sensitive = true
}
```

---

## CI/CD Pipeline

### cloudbuild.yaml

```yaml
steps:
  # Run tests
  - name: 'python:3.11-slim'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        pip install poetry
        cd backend
        poetry install
        poetry run pytest --cov=src
    id: 'test-backend'

  - name: 'node:20-alpine'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        cd frontend
        npm ci
        npm run lint
        npm test -- --run
    id: 'test-frontend'

  # Build and push backend
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/backend:${SHORT_SHA}'
      - '-t'
      - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/backend:latest'
      - './backend'
    id: 'build-backend'
    waitFor: ['test-backend']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '--all-tags', '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/backend']
    id: 'push-backend'
    waitFor: ['build-backend']

  # Build and push frontend
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/frontend:${SHORT_SHA}'
      - '-t'
      - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/frontend:latest'
      - './frontend'
    id: 'build-frontend'
    waitFor: ['test-frontend']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '--all-tags', '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/frontend']
    id: 'push-frontend'
    waitFor: ['build-frontend']

  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - '${_SERVICE_NAME}-api'
      - '--image=${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/backend:${SHORT_SHA}'
      - '--region=${_REGION}'
      - '--platform=managed'
      - '--allow-unauthenticated'
    id: 'deploy-backend'
    waitFor: ['push-backend']

  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - '${_SERVICE_NAME}-web'
      - '--image=${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/frontend:${SHORT_SHA}'
      - '--region=${_REGION}'
      - '--platform=managed'
      - '--allow-unauthenticated'
    id: 'deploy-frontend'
    waitFor: ['push-frontend']

substitutions:
  _REGION: us-central1
  _REPO: my-project
  _SERVICE_NAME: my-project

options:
  logging: CLOUD_LOGGING_ONLY
```

---

## Alternative Design Decisions

### 1. Database Choices

| Option | When to Use | Trade-offs |
|--------|-------------|------------|
| **Cloud SQL (PostgreSQL)** | Most applications, complex queries, ACID needs | Higher cost, requires connection management |
| **Cloud SQL (MySQL)** | MySQL-specific features, legacy compatibility | Fewer advanced features than PostgreSQL |
| **Firestore** | Simple document storage, real-time sync | No complex queries, eventual consistency |
| **Cloud Spanner** | Global scale, strong consistency | Very expensive, overkill for most apps |
| **AlloyDB** | High-performance PostgreSQL, analytics | Higher cost than Cloud SQL |

### 2. Backend Framework Choices

| Option | When to Use | Trade-offs |
|--------|-------------|------------|
| **FastAPI** | High performance, modern Python, async | Smaller ecosystem than Django |
| **Django** | Admin panel, ORM batteries-included | Slower, heavier, sync by default |
| **Flask** | Simple APIs, microservices | Manual setup for everything |
| **Node.js (Express/Fastify)** | JavaScript team, real-time features | Callback complexity, less type safety |
| **Go (Gin/Echo)** | Maximum performance, compiled binary | Smaller web ecosystem, verbose code |

### 3. Frontend Framework Choices

| Option | When to Use | Trade-offs |
|--------|-------------|------------|
| **React** | Complex SPAs, large ecosystem | JSX learning curve, no opinions |
| **Vue** | Simpler apps, gradual adoption | Smaller ecosystem than React |
| **Next.js** | SEO needed, server rendering | More complexity, Vercel-centric |
| **SvelteKit** | Performance-critical, smaller bundle | Smaller ecosystem, fewer jobs |
| **HTMX + Alpine** | Server-rendered, low JS | Limited interactivity |

### 4. Hosting Alternatives

| Option | When to Use | Trade-offs |
|--------|-------------|------------|
| **Cloud Run** | Serverless containers, auto-scaling | Cold starts, limited customization |
| **GKE (Kubernetes)** | Complex orchestration, multi-service | Operational complexity, cost |
| **Compute Engine** | Full control, specific requirements | Manual scaling, more ops work |
| **App Engine** | Simple deployments, managed | Less flexible, vendor lock-in |
| **Cloud Functions** | Event-driven, small functions | 9-min timeout, no websockets |

### 5. Background Job Alternatives

| Option | When to Use | Trade-offs |
|--------|-------------|------------|
| **Cloud Pub/Sub** | Reliable delivery, GCP-native | Learning curve, GCP lock-in |
| **Cloud Tasks** | HTTP-based tasks, retries | Simpler but less flexible |
| **Celery + Redis** | Python-native, feature-rich | Self-managed, Redis dependency |
| **Cloud Scheduler only** | Simple cron jobs | No queue, direct invocation |

### 6. State Management Alternatives

| Option | When to Use | Trade-offs |
|--------|-------------|------------|
| **Zustand** | Simple state, minimal boilerplate | Less structure for large apps |
| **Redux Toolkit** | Complex state, time-travel debugging | More boilerplate, steeper learning |
| **Jotai/Recoil** | Atomic state, React-native | Newer, smaller ecosystem |
| **React Query alone** | Server state only | Not for client-only state |
| **Context API** | Simple global state | Re-render issues at scale |

### 7. Authentication Alternatives

| Option | When to Use | Trade-offs |
|--------|-------------|------------|
| **Identity Platform** | SSO, managed users, GCP-native | Cost at scale, GCP lock-in |
| **Firebase Auth** | Simple auth, generous free tier | Less enterprise features |
| **Auth0** | Advanced features, compliance | Expensive at scale |
| **Clerk** | Modern DX, components included | Newer, less established |
| **Custom JWT** | Full control, specific needs | Security responsibility |

---

## Quick Start Checklist

Use this checklist when starting a new project:

### 1. Repository Setup
- [ ] Create GitHub repository
- [ ] Set up branch protection (require PR for main)
- [ ] Create `develop` branch for dev environment

### 2. Project Structure
- [ ] Create directory structure per this guide
- [ ] Initialize backend with Poetry (`poetry init`)
- [ ] Initialize frontend with Vite (`npm create vite@latest`)
- [ ] Create `docker-compose.yml` for local services
- [ ] Create `Makefile` with common commands

### 3. Backend Foundation
- [ ] Create `config.py` with Pydantic Settings
- [ ] Create `database.py` with async SQLAlchemy
- [ ] Create `main.py` with FastAPI app
- [ ] Set up Alembic for migrations
- [ ] Create health check endpoint
- [ ] Add structured logging with structlog
- [ ] Create Dockerfile

### 4. Frontend Foundation
- [ ] Configure Vite with API proxy
- [ ] Set up Tailwind CSS
- [ ] Create API client with axios
- [ ] Set up React Router
- [ ] Set up React Query provider
- [ ] Create basic layout components
- [ ] Create Dockerfile with nginx

### 5. Infrastructure
- [ ] Create Terraform modules (or copy from this guide)
- [ ] Set up GCP project and enable APIs
- [ ] Create Artifact Registry repository
- [ ] Set up Cloud Build triggers
- [ ] Configure Secret Manager
- [ ] Create dev and prod environments

### 6. CI/CD
- [ ] Create `cloudbuild.yaml`
- [ ] Set up Cloud Build trigger for `develop` → dev
- [ ] Set up Cloud Build trigger for `main` → prod
- [ ] Configure environment-specific variables

### 7. Local Development Verification
```bash
# Start services
docker-compose up -d

# Verify database
docker-compose exec postgres psql -U postgres -c "SELECT 1"

# Run backend
cd backend && poetry install && poetry run uvicorn src.main:app --reload

# Verify backend
curl http://localhost:8000/api/v1/health

# Run frontend
cd frontend && npm install && npm run dev

# Verify frontend
open http://localhost:3000
```

---

## Common Gotchas & Solutions

### 1. SQLAlchemy Reserved Attributes
**Problem:** Using `metadata` as a column name conflicts with SQLAlchemy.
**Solution:** Use `extra_data` or another name for JSON metadata columns.

### 2. Async Driver Requirements
**Problem:** SQLAlchemy async requires greenlet.
**Solution:** Add `greenlet` to dependencies explicitly.

### 3. Raw SQL in Async SQLAlchemy
**Problem:** String SQL queries fail with async engine.
**Solution:** Wrap raw SQL with `from sqlalchemy import text; text("SELECT 1")`.

### 4. Poetry Package Mode
**Problem:** Poetry requires README.md in package mode.
**Solution:** Add `package-mode = false` to `[tool.poetry]` section.

### 5. Docker Compose Version
**Problem:** `version` attribute is obsolete in newer Docker Compose.
**Solution:** Remove the `version: '3.8'` line entirely.

### 6. Port Conflicts
**Problem:** Port already in use errors.
**Solution:** Kill existing processes: `lsof -ti:8000 | xargs kill -9`

---

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/en/20/)
- [Pydantic V2 Documentation](https://docs.pydantic.dev/latest/)
- [Vite Documentation](https://vitejs.dev/)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Terraform GCP Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)

---

*This guide was created based on production patterns. Adapt as needed for your specific requirements.*
