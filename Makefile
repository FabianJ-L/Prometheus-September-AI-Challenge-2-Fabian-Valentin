# NOESIS — dev convenience targets
.DEFAULT_GOAL := help
.PHONY: help setup env backend frontend dev test lint

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

env: ## Create .env files from the templates (won't overwrite existing)
	@[ -f .env ] || cp .env.example .env
	@[ -f backend/.env ] || cp backend/.env.example backend/.env
	@[ -f frontend/.env.local ] || cp frontend/.env.example frontend/.env.local
	@echo "env files ready"

setup: env ## Install backend + frontend dependencies
	cd backend && uv sync
	cd frontend && npm install

backend: ## Run the FastAPI backend with autoreload
	cd backend && uv run uvicorn app.main:app --reload

frontend: ## Run the Next.js frontend
	cd frontend && npm run dev

dev: ## Run backend + frontend together
	@$(MAKE) -j2 backend frontend

test: ## Run backend tests
	cd backend && uv run pytest

lint: ## Lint backend (ruff) and frontend (eslint)
	cd backend && uv run ruff check .
	cd frontend && npm run lint
