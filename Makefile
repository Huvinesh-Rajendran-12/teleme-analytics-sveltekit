# Makefile for SvelteKit Deployment

# Configuration - Edit these variables
SERVER_USER := deployer
SERVER_IP := 47.250.46.218
APP_DIR := /home/deployer/teleme_analytics_sveltekit
# Repository URL
REPO_URL := git@bitbucket.org:teleme_malaysia/teleme_llm_bot.git
BRANCH := main
NODE_VERSION := 22
APP_PORT := 9997
PROCESS_NAME := sveltekit-app
SSH_KEY_PATH := $(HOME)/.ssh/deployer_id_rsa4096
USE_PNPM := true
USE_SUDO := true  # Set to true if sudo is required for certain operations

.PHONY: help
help:
	@echo "SvelteKit Deployment Makefile"
	@echo "--------------------------"
	@echo "Available commands:"
	@echo "  make deploy        - Full deployment (pull, build, restart)"
	@echo "  make deploy-check  - Deploy with verbose health check"
	@echo "  make pull          - Pull latest code from repository"
	@echo "  make build         - Build the application"
	@echo "  make start         - Start/restart the application"
	@echo "  make logs          - View application logs"
	@echo "  make status        - Check application status"
	@echo "  make kill-port     - Kill process using the app port"
	@echo "  make setup         - Initial server setup"

# Connect to the server and execute a command
define ssh_exec
	ssh -i $(SSH_KEY_PATH) $(SERVER_USER)@$(SERVER_IP) '$(1)'
endef

# Full deployment process
.PHONY: deploy
deploy:
	@echo "🚀 Starting deployment process..."
	@echo "Stopping existing process..."
	$(call ssh_exec, cd $(APP_DIR) && \
		/home/deployer/.local/share/pnpm/pm2 delete $(PROCESS_NAME) || true && \
		git stash && \
		git fetch --all && \
		git reset --hard origin/$(BRANCH) && \
		echo "Installing dependencies..." && \
		$(if $(filter $(USE_PNPM),true), pnpm install, npm ci) && \
		echo "Building application..." && \
		$(if $(filter $(USE_PNPM),true), pnpm build, npm run build) && \
		echo "Starting application with PM2..." && \
		$(if $(filter $(USE_PNPM),true), \
			/home/deployer/.local/share/pnpm/pm2 start "node build/index.js" --name "$(PROCESS_NAME)" -- --port $(APP_PORT), \
			/home/deployer/.local/share/pnpm/pm2 start "node" --name "$(PROCESS_NAME)" -- build/index.js --port $(APP_PORT)) && \
		/home/deployer/.local/share/pnpm/pm2 save)
	@echo "✅ Deployment completed!"

# Deploy with additional health check
.PHONY: deploy-check
deploy-check: deploy
	@echo "🔍 Performing health check..."
	@sleep 5
	$(call ssh_exec, curl -s http://localhost:$(APP_PORT) > /dev/null && \
		echo "✅ Application is running properly" || \
		echo "⚠️ Health check failed. Showing logs:" && \
		/home/deployer/.local/share/pnpm/pm2 logs $(PROCESS_NAME) --lines 20)

# Pull latest code
.PHONY: pull
pull:
	@echo "⬇️ Pulling latest code from $(BRANCH) branch..."
	$(call ssh_exec, cd $(APP_DIR) && \
		git stash && \
		git fetch --all && \
		git reset --hard origin/$(BRANCH))
	@echo "✅ Pull completed!"

# Build application
.PHONY: build
build:
	@echo "🔨 Building application..."
	$(call ssh_exec, cd $(APP_DIR) && \
		$(if $(filter $(USE_PNPM),true), pnpm build, npm run build))
	@echo "✅ Build completed!"

# Start/restart application
.PHONY: start
start:
	@echo "▶️ Starting/restarting application..."
	$(call ssh_exec, cd $(APP_DIR) && \
		/home/deployer/.local/share/pnpm/pm2 reload $(PROCESS_NAME) || \
		$(if $(filter $(USE_PNPM),true), \
			/home/deployer/.local/share/pnpm/pm2 start "node build/index.js" --name "$(PROCESS_NAME)" -- --port $(APP_PORT), \
			/home/deployer/.local/share/pnpm/pm2 start "node" --name "$(PROCESS_NAME)" -- build/index.js --port $(APP_PORT)) && \
		/home/deployer/.local/share/pnpm/pm2 save)
	@echo "✅ Application started!"

# View logs
.PHONY: logs
logs:
	@echo "📋 Showing application logs..."
	$(call ssh_exec, /home/deployer/.local/share/pnpm/pm2 logs $(PROCESS_NAME) --lines 50)

# Check status
.PHONY: status
status:
	@echo "📊 Checking application status..."
	$(call ssh_exec, /home/deployer/.local/share/pnpm/pm2 status $(PROCESS_NAME))

# Kill process using the app port
.PHONY: kill-port
kill-port:
	@echo "🔄 Killing process on port $(APP_PORT)..."
	$(call ssh_exec, sudo fuser -k $(APP_PORT)/tcp || echo "No process found on port $(APP_PORT)")
	@echo "✅ Port $(APP_PORT) freed!"

# Install adapter-node for production deployment
.PHONY: install-adapter
install-adapter:
	@echo "📦 Installing adapter-node for production deployment..."
	$(call ssh_exec, cd $(APP_DIR) && \
		$(if $(filter $(USE_PNPM),true), pnpm add -D @sveltejs/adapter-node, npm install --save-dev @sveltejs/adapter-node))
	@echo "✅ Adapter installed!"
	@echo "⚠️ Remember to update svelte.config.ts to use adapter-node before building!"

# Initial server setup
.PHONY: setup
setup:
	@echo "🔧 Setting up server environment..."
	@echo "Copying setup script to server..."
	scp -i $(SSH_KEY_PATH) ./server-setup.sh $(SERVER_USER)@$(SERVER_IP):~/server-setup.sh
	$(call ssh_exec, chmod +x ~/server-setup.sh && ~/server-setup.sh)
	@echo "✅ Server setup completed! If there were any permission errors, you may need to run:"
	@echo "   ssh $(SERVER_USER)@$(SERVER_IP) 'sudo env PATH=\$$PATH:/home/$(SERVER_USER)/.nvm/versions/node/v$(NODE_VERSION)/bin pm2 startup'"

# Update the SvelteKit adapter configuration for deployment
.PHONY: update-adapter
update-adapter:
	@echo "🔧 Updating SvelteKit adapter configuration for production..."
	$(call ssh_exec, cd $(APP_DIR) && \
		sed -i 's/import adapter from "@sveltejs\/adapter-auto";/import adapter from "@sveltejs\/adapter-node";/' svelte.config.ts)
	@echo "✅ Adapter configuration updated!"

# Fix deployment issues
.PHONY: fix-deployment
fix-deployment:
	@echo "🔧 Applying deployment fixes..."
	@echo "Copying fix script to server..."
	scp -i $(SSH_KEY_PATH) ./fix-deployment.sh $(SERVER_USER)@$(SERVER_IP):~/fix-deployment.sh
	$(call ssh_exec, chmod +x ~/fix-deployment.sh && ~/fix-deployment.sh)
	@echo "✅ Fixes applied! Try deploying again."

# Create a new local repository and initial commit
.PHONY: init-repo
init-repo:
	@echo "🔧 Initializing local repository and preparing for remote..."
	@if [ ! -d "$(APP_DIR)/.git" ]; then \
		echo "Initializing git repository..."; \
		cd $(APP_DIR) && git init && \
		git add . && \
		git commit -m "Initial commit"; \
		echo "Now you can create a BitBucket repository and add it as remote with:"; \
		echo "  cd $(APP_DIR) && git remote add origin YOUR_REPOSITORY_URL"; \
		echo "  git push -u origin main"; \
	else \
		echo "Git repository already exists!"; \
	fi
