#!/bin/bash
# Setup script for SvelteKit deployment on server

# Variables
APP_DIR="/home/deployer/teleme_analytics_sveltekit"
REPO_URL="git@bitbucket.org:teleme_malaysia/teleme_llm_bot.git"
BRANCH="main"
NODE_VERSION="22"

# Create directory if not exists
if [ ! -d "$APP_DIR" ]; then
  sudo mkdir -p "$APP_DIR"
  sudo chown deployer:deployer "$APP_DIR"
  
  # Clone repository
  echo "Cloning repository..."
  git clone -b $BRANCH $REPO_URL $APP_DIR
  if [ $? -ne 0 ]; then
    echo "⚠️ Repository clone failed. Please verify repository access and URL"
    exit 1
  fi
fi

# Change to app directory
cd "$APP_DIR" || exit

# Install NVM
echo "Installing NVM..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js
echo "Installing Node.js $NODE_VERSION..."
nvm install $NODE_VERSION
nvm use $NODE_VERSION

# Install PNPM
echo "Installing PNPM..."
curl -fsSL https://get.pnpm.io/install.sh | sh -
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
echo 'export PNPM_HOME="$HOME/.local/share/pnpm"' >> ~/.bashrc
echo 'export PATH="$PNPM_HOME:$PATH"' >> ~/.bashrc
mkdir -p "$HOME/.local/share/pnpm"
pnpm setup
eval "$(pnpm setup)"

# Install PM2 and dependencies
echo "Installing PM2..."
pnpm add -g pm2
echo "Installing dependencies..."
pnpm install

# Setup PM2 startup
echo "Setting up PM2 startup..."
pm2 startup || echo "PM2 startup command failed, may need to run with sudo manually"

echo "✅ Server setup completed!"
