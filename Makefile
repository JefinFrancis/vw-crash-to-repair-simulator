# VW Crash-to-Repair Simulator - Development Makefile
# Modern full-stack development workflow

.PHONY: help setup dev backend frontend test lint format migrate seed-data demo clean
.DEFAULT_GOAL := help

# Colors for output
RED := \033[31m
GREEN := \033[32m
YELLOW := \033[33m
BLUE := \033[34m
MAGENTA := \033[35m
CYAN := \033[36m
WHITE := \033[37m
RESET := \033[0m

# Project configuration
PROJECT_NAME := vw-crash-to-repair-simulator
BACKEND_PORT := 8000
FRONTEND_PORT := 3000
POSTGRES_PORT := 5432
REDIS_PORT := 6379

# Docker Compose command detection
DOCKER_COMPOSE := $(shell if command -v docker-compose >/dev/null 2>&1; then echo "docker-compose"; elif docker compose version >/dev/null 2>&1; then echo "docker compose"; else echo ""; fi)

## 🚀 Development Commands

help: ## Show this help message
	@echo "$(CYAN)VW Crash-to-Repair Simulator - Development Commands$(RESET)"
	@echo ""
	@echo "$(YELLOW)📋 Setup & Quick Start:$(RESET)"
	@echo "  make setup     - Initial project setup (one-time only)"
	@echo "  make dev       - Start all services for development"
	@echo ""
	@echo "$(YELLOW)🔧 Individual Services:$(RESET)"
	@echo "  make backend   - Start only backend (FastAPI)"
	@echo "  make frontend  - Start only frontend (React)"
	@echo ""
	@echo "$(YELLOW)🗄️ Database Operations:$(RESET)"
	@echo "  make migrate   - Run database migrations"
	@echo "  make seed-data - Populate database with sample data"
	@echo "  make db-shell  - Connect to PostgreSQL"
	@echo ""
	@echo "$(YELLOW)🧪 Testing & Quality:$(RESET)"
	@echo "  make test      - Run all tests"
	@echo "  make lint      - Run code linting"
	@echo "  make format    - Format all code"
	@echo ""
	@echo "$(YELLOW)🎮 Demo & Utilities:$(RESET)"
	@echo "  make demo      - Run complete demo"
	@echo "  make logs      - View service logs"
	@echo "  make clean     - Clean up containers and volumes"
	@echo ""
	@echo "$(GREEN)💡 Quick Start: Run 'make setup' then 'make dev'$(RESET)"

## 📋 Setup & Initialization

setup: ## Initial project setup (one-time only)
	@echo "$(BLUE)🔧 Setting up VW Crash-to-Repair Simulator...$(RESET)"
	@echo "$(YELLOW)📦 Installing backend dependencies...$(RESET)"
	@cd backend && poetry install
	@echo "$(YELLOW)📦 Installing frontend dependencies...$(RESET)"
	@cd frontend && npm install
	@echo "$(YELLOW)🐳 Starting infrastructure services...$(RESET)"
	@sudo $(DOCKER_COMPOSE) up -d postgres redis
	@sleep 5  # Wait for services to be ready
	@echo "$(YELLOW)📋 Creating environment file...$(RESET)"
	@if [ ! -f .env.local ]; then cp .env.example .env.local; fi
	@echo "$(YELLOW)🗄️ Running database migrations...$(RESET)"
	@$(MAKE) migrate
	@echo "$(YELLOW)🌱 Seeding database with sample data...$(RESET)"
	@$(MAKE) seed-data
	@echo "$(GREEN)✅ Setup complete! Run 'make dev' to start development.$(RESET)"

## 🚀 Development Services

dev: ## Start all services for development
	@echo "$(BLUE)🚀 Starting VW Crash-to-Repair Simulator (Development)...$(RESET)"
	@$(DOCKER_COMPOSE) up -d
	@echo ""
	@echo "$(GREEN)🎉 All services are now running:$(RESET)"
	@echo "$(CYAN)  Frontend (React):    http://localhost:$(FRONTEND_PORT)$(RESET)"
	@echo "$(CYAN)  Backend (FastAPI):   http://localhost:$(BACKEND_PORT)$(RESET)"
	@echo "$(CYAN)  API Documentation:   http://localhost:$(BACKEND_PORT)/docs$(RESET)"
	@echo "$(CYAN)  PostgreSQL:          localhost:$(POSTGRES_PORT)$(RESET)"
	@echo "$(CYAN)  Redis:               localhost:$(REDIS_PORT)$(RESET)"
	@echo ""
	@echo "$(YELLOW)💡 Use 'make logs' to view service logs$(RESET)"
	@echo "$(YELLOW)💡 Use 'make demo' to run a complete demo$(RESET)"
	@echo "$(YELLOW)💡 Use 'Ctrl+C' then 'make clean' to stop all services$(RESET)"

backend: ## Start only backend service
	@echo "$(BLUE)⚙️ Starting Backend (FastAPI)...$(RESET)"
	@cd backend && poetry run uvicorn src.main:app --reload --host 0.0.0.0 --port $(BACKEND_PORT)

frontend: ## Start only frontend service  
	@echo "$(BLUE)⚛️ Starting Frontend (React)...$(RESET)"
	@cd frontend && npm run dev

## 🗄️ Database Operations

migrate: ## Run database migrations
	@echo "$(BLUE)🗄️ Running database migrations...$(RESET)"
	@cd backend && poetry run alembic upgrade head
	@echo "$(GREEN)✅ Migrations complete$(RESET)"

migrate-create: ## Create new migration (usage: make migrate-create name="migration name")
	@if [ -z "$(name)" ]; then \
		echo "$(RED)❌ Please provide migration name: make migrate-create name='Add new table'$(RESET)"; \
		exit 1; \
	fi
	@echo "$(BLUE)📝 Creating migration: $(name)...$(RESET)"
	@cd backend && poetry run alembic revision --autogenerate -m "$(name)"

seed-data: ## Populate database with sample data
	@echo "$(BLUE)🌱 Seeding database with VW sample data...$(RESET)"
	@cd backend && poetry run python scripts/seed_database.py
	@echo "$(GREEN)✅ Database seeded with Brazilian VW dealers and parts$(RESET)"

db-shell: ## Connect to PostgreSQL database
	@echo "$(BLUE)🐘 Connecting to PostgreSQL...$(RESET)"
	@sudo $(DOCKER_COMPOSE) exec postgres psql -U vw_simulator -d vw_crash_repair

redis-cli: ## Connect to Redis
	@echo "$(BLUE)🔴 Connecting to Redis...$(RESET)"
	@sudo $(DOCKER_COMPOSE) exec redis redis-cli

## 🧪 Testing & Quality

test: ## Run all tests
	@echo "$(BLUE)🧪 Running all tests...$(RESET)"
	@echo "$(YELLOW)🐍 Backend tests...$(RESET)"
	@cd backend && poetry run pytest --cov=src tests/ -v
	@echo "$(YELLOW)⚛️ Frontend tests...$(RESET)"
	@cd frontend && npm test

test-backend: ## Run only backend tests
	@echo "$(BLUE)🐍 Running backend tests...$(RESET)"
	@cd backend && poetry run pytest --cov=src tests/ -v

test-frontend: ## Run only frontend tests
	@echo "$(BLUE)⚛️ Running frontend tests...$(RESET)"
	@cd frontend && npm test

test-integration: ## Run integration tests only
	@echo "$(BLUE)🔗 Running integration tests...$(RESET)"
	@cd backend && poetry run pytest tests/integration -v

lint: ## Run code linting
	@echo "$(BLUE)🔍 Running code linting...$(RESET)"
	@echo "$(YELLOW)🐍 Backend linting...$(RESET)"
	@cd backend && poetry run ruff check src tests
	@cd backend && poetry run mypy src
	@echo "$(YELLOW)⚛️ Frontend linting...$(RESET)"
	@cd frontend && npm run lint
	@echo "$(GREEN)✅ Linting complete$(RESET)"

format: ## Format all code
	@echo "$(BLUE)✨ Formatting all code...$(RESET)"
	@echo "$(YELLOW)🐍 Formatting backend...$(RESET)"
	@cd backend && poetry run ruff format src tests
	@echo "$(YELLOW)⚛️ Formatting frontend...$(RESET)"
	@cd frontend && npm run format
	@echo "$(GREEN)✅ Code formatting complete$(RESET)"

## 🎮 Demo & Testing

demo: ## Run complete crash-to-repair demo
	@echo "$(BLUE)🎮 Running VW Crash-to-Repair Demo...$(RESET)"
	@echo "$(YELLOW)This will simulate a complete workflow:$(RESET)"
	@echo "$(CYAN)  1. Vehicle crash simulation$(RESET)"
	@echo "$(CYAN)  2. Damage analysis$(RESET)" 
	@echo "$(CYAN)  3. Repair estimate generation$(RESET)"
	@echo "$(CYAN)  4. Dealer selection$(RESET)"
	@echo "$(CYAN)  5. Appointment booking$(RESET)"
	@cd backend && poetry run python scripts/run_demo.py

beamng-test: ## Test BeamNG connection
	@echo "$(BLUE)🚗 Testing BeamNG.tech connection...$(RESET)"
	@cd backend && poetry run python scripts/test_beamng_connection.py

## 🛠️ Development Utilities

logs: ## View service logs
	@echo "$(BLUE)📋 Viewing service logs...$(RESET)"
	@$(DOCKER_COMPOSE) logs -f

logs-backend: ## View backend logs only
	@$(DOCKER_COMPOSE) logs -f backend

logs-frontend: ## View frontend logs only
	@$(DOCKER_COMPOSE) logs -f frontend

logs-db: ## View database logs only
	@$(DOCKER_COMPOSE) logs -f postgres

status: ## Show service status
	@echo "$(BLUE)📊 Service Status:$(RESET)"
	@sudo $(DOCKER_COMPOSE) ps

restart: ## Restart all services
	@echo "$(BLUE)🔄 Restarting all services...$(RESET)"
	@$(DOCKER_COMPOSE) restart

## 🧹 Cleanup

clean: ## Clean up containers and volumes
	@echo "$(BLUE)🧹 Cleaning up containers and volumes...$(RESET)"
	@$(DOCKER_COMPOSE) down -v
	@docker system prune -f
	@echo "$(GREEN)✅ Cleanup complete$(RESET)"

clean-all: ## Clean everything including images
	@echo "$(YELLOW)⚠️ This will remove all containers, volumes, and images$(RESET)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo ""; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(DOCKER_COMPOSE) down -v --rmi all; \
		docker system prune -af; \
		echo "$(GREEN)✅ Complete cleanup finished$(RESET)"; \
	else \
		echo "$(YELLOW)Cancelled$(RESET)"; \
	fi

## 🚀 Production

build: ## Build production images
	@echo "$(BLUE)🏗️ Building production images...$(RESET)"
	@$(DOCKER_COMPOSE) -f docker-compose.prod.yml build

deploy-local: ## Deploy locally with production settings
	@echo "$(BLUE)🚀 Deploying local production environment...$(RESET)"
	@$(DOCKER_COMPOSE) -f docker-compose.prod.yml up -d

## 📊 Project Info

info: ## Show project information
	@echo "$(CYAN)📋 VW Crash-to-Repair Simulator$(RESET)"
	@echo "$(YELLOW)Version:$(RESET) 2.0 (Modern Architecture)"
	@echo "$(YELLOW)Event:$(RESET) Volkswagen Dealer Brand Day (March 2026)"
	@echo "$(YELLOW)Client:$(RESET) Volkswagen Brazil"
	@echo "$(YELLOW)Stack:$(RESET) React + TypeScript + FastAPI + PostgreSQL"
	@echo ""
	@echo "$(CYAN)📁 Project Structure:$(RESET)"
	@echo "  backend/     - FastAPI application with modern architecture"
	@echo "  frontend/    - React + TypeScript application"
	@echo "  docs/        - Documentation and guides"
	@echo ""
	@echo "$(CYAN)🌐 Service Ports:$(RESET)"
	@echo "  Frontend:    $(FRONTEND_PORT)"
	@echo "  Backend:     $(BACKEND_PORT)"
	@echo "  PostgreSQL:  $(POSTGRES_PORT)"
	@echo "  Redis:       $(REDIS_PORT)"

check-deps: ## Check if required dependencies are installed
	@echo "$(BLUE)🔍 Checking dependencies...$(RESET)"
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)❌ Docker is required but not installed$(RESET)"; exit 1; }
	@command -v $(DOCKER_COMPOSE) >/dev/null 2>&1 || { echo "$(RED)❌ Docker Compose is required but not installed$(RESET)"; exit 1; }
	@command -v poetry >/dev/null 2>&1 || { echo "$(YELLOW)⚠️ Poetry not found - install with: curl -sSL https://install.python-poetry.org | python3 -$(RESET)"; }
	@command -v node >/dev/null 2>&1 || { echo "$(YELLOW)⚠️ Node.js not found - install from: https://nodejs.org$(RESET)"; }
	@echo "$(GREEN)✅ All required dependencies are available$(RESET)"