.PHONY: help build up down logs restart clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build the Docker image
	docker-compose build

up: ## Start the application
	docker-compose up -d

down: ## Stop the application
	docker-compose down

logs: ## View application logs
	docker-compose logs -f webauthn-app

restart: ## Restart the application
	docker-compose restart

clean: ## Remove containers, volumes, and images
	docker-compose down -v
	docker system prune -f

status: ## Show container status
	docker-compose ps

shell: ## Open a shell in the container
	docker-compose exec webauthn-app sh

backup: ## Backup the database
	@mkdir -p backups
	@tar -czf backups/webauthn-backup-$$(date +%Y%m%d-%H%M%S).tar.gz data/
	@echo "Backup created in backups/"

dev: ## Start development server locally (without Docker)
	npm run dev

install: ## Install dependencies locally
	npm install
