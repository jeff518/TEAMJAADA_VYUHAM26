.PHONY: help build up down restart logs status test migrate shell clean dev lint dashboard-dev

# Default target
.DEFAULT_GOAL := help

# Colors for terminal output
BLUE   := \033[36m
GREEN  := \033[32m
YELLOW := \033[33m
RED    := \033[31m
RESET  := \033[0m

help: ## Show this help message
	@echo "$(BLUE)======================================================================$(RESET)"
	@echo "$(GREEN)              SecureDoc Pipeline — Orchestration CLI                  $(RESET)"
	@echo "$(BLUE)======================================================================$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-16s$(RESET) %s\n", $$1, $$2}'

build: ## Build all Docker container images
	@echo "$(GREEN)Building all SecureDoc service images...$(RESET)"
	docker compose build --no-cache

up: ## Start all infrastructure services in detached daemon mode
	@echo "$(GREEN)Spinning up SecureDoc multi-container cluster...$(RESET)"
	docker compose up -d
	@echo "$(GREEN)Cluster active at:$(RESET)"
	@echo "  • Dashboard UI:  http://localhost:3000"
	@echo "  • API Backend:   http://localhost:8000"
	@echo "  • OpenAPI Docs:  http://localhost:8000/docs"
	@echo "  • ClamAV Daemon: localhost:3310"

down: ## Stop and dismantle all running containers
	@echo "$(YELLOW)Shutting down SecureDoc cluster...$(RESET)"
	docker compose down

restart: down up ## Restart all services

status: ## Inspect the health and status of all running containers
	@docker compose ps

logs: ## Tail streaming logs from all services (Ctrl+C to exit)
	docker compose logs -f

logs-api: ## Tail FastAPI backend logs
	docker compose logs -f api

logs-worker: ## Tail Celery background worker logs
	docker compose logs -f worker

logs-clamav: ## Tail ClamAV antivirus logs
	docker compose logs -f clamav

migrate: ## Run Alembic database migrations
	@echo "$(GREEN)Running database migrations on PostgreSQL...$(RESET)"
	docker compose exec api alembic upgrade head

shell: ## Open an interactive bash shell in the API backend container
	docker compose exec api /bin/bash

db-shell: ## Open interactive PostgreSQL psql shell
	docker compose exec db psql -U securedoc_user -d securedoc_pipeline

test: ## Execute full backend test suite with pytest
	@echo "$(GREEN)Running automated test suites...$(RESET)"
	docker compose exec api pytest -v --cov=app

dashboard-install: ## Install dashboard Node modules locally
	cd dashboard && npm install

dashboard-dev: ## Run Vite development server locally
	cd dashboard && npm run dev

dev: ## Launch backend and frontend in local development mode
	@echo "$(GREEN)Starting local dev environment...$(RESET)"
	docker compose up -d db redis clamav
	@echo "$(YELLOW)Infrastructure online. Run 'npm run dev' inside dashboard/$(RESET)"

clean: ## Prune all stopped containers, orphan networks, and unused images
	@echo "$(RED)Cleaning dangling docker artifacts...$(RESET)"
	docker compose down -v --remove-orphans
	docker system prune -f
