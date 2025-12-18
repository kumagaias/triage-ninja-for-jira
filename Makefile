.PHONY: help check-tools install-tools test test-unit test-security security-check install clean

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Display available commands
	@echo "$(BLUE)TriageNinja for Jira - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

check-tools: ## Check installation status of required tools
	@echo "$(BLUE)Checking required tools...$(NC)"
	@echo ""
	@command -v node >/dev/null 2>&1 && echo "$(GREEN)✓$(NC) Node.js: $$(node --version)" || echo "$(RED)✗$(NC) Node.js: Not installed"
	@command -v npm >/dev/null 2>&1 && echo "$(GREEN)✓$(NC) npm: $$(npm --version)" || echo "$(RED)✗$(NC) npm: Not installed"
	@command -v forge >/dev/null 2>&1 && echo "$(GREEN)✓$(NC) Forge CLI: $$(forge --version)" || echo "$(RED)✗$(NC) Forge CLI: Not installed (npm install -g @forge/cli)"
	@command -v gitleaks >/dev/null 2>&1 && echo "$(GREEN)✓$(NC) Gitleaks: $$(gitleaks version)" || echo "$(RED)✗$(NC) Gitleaks: Not installed (brew install gitleaks)"
	@echo ""
	@if command -v asdf >/dev/null 2>&1; then \
		echo "$(GREEN)✓$(NC) asdf: $$(asdf --version)"; \
	else \
		echo "$(YELLOW)○$(NC) asdf: Not installed (optional)"; \
	fi
	@echo ""

install-tools: ## Install tools via asdf (if asdf is available)
	@if command -v asdf >/dev/null 2>&1; then \
		echo "$(BLUE)Installing tools via asdf...$(NC)"; \
		asdf plugin add nodejs || true; \
		asdf install; \
		echo "$(GREEN)✓ Tools installed$(NC)"; \
	else \
		echo "$(YELLOW)asdf not found. Please install tools manually:$(NC)"; \
		echo "  Node.js 24.x: https://nodejs.org/"; \
		echo "  Forge CLI: npm install -g @forge/cli"; \
		echo "  Gitleaks: brew install gitleaks"; \
	fi

install: check-tools ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	@if [ -f "package.json" ]; then \
		npm install; \
		echo "$(GREEN)✓ Dependencies installed$(NC)"; \
	else \
		echo "$(YELLOW)No package.json found. Skipping npm install.$(NC)"; \
	fi

test: test-unit test-security ## Run all tests (unit + security)

test-unit: ## Run unit tests only
	@echo "$(BLUE)Running unit tests...$(NC)"
	@if [ -f "package.json" ]; then \
		npm test || true; \
	else \
		echo "$(YELLOW)No package.json found. Skipping tests.$(NC)"; \
	fi

test-security: security-check ## Run security checks only

security-check: ## Check for sensitive information (gitleaks)
	@echo "$(BLUE)Running security checks...$(NC)"
	@./scripts/security-check.sh

clean: ## Clean build artifacts
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	@rm -rf node_modules
	@rm -rf dist
	@rm -rf .forge
	@echo "$(GREEN)✓ Clean complete$(NC)"

dev-flow: ## Start automated development flow (branch → dev → push → PR → review)
	@./scripts/auto-dev-flow.sh

# Future: Log display commands
# logs: ## Display CloudWatch Logs
# logs-frontend: ## Frontend logs
# logs-backend: ## Backend logs
