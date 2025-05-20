# Deployment Guide for teleme-analytics-sveltekit

This document outlines how to deploy the SvelteKit application to a production server.

## Prerequisites

1. SSH access to the deployment server
2. SSH key configured for the deployer user (`~/.ssh/deployer_id_rsa4096`)
3. Git repository access (ensure repository exists and deployer has access)
4. Node.js (v22 or later) installed on your local machine

## Repository Setup

Before deploying, ensure the repository exists and is accessible:

1. **Create the repository** on BitBucket if it doesn't exist yet
2. **Configure access** for the deployer user (through SSH keys or HTTPS credentials)
3. If using a new repository, you can initialize it with:

```bash
make init-repo
```

4. Then create and connect to the remote repository manually:

```bash
cd ~/Documents/teleme-analytics-sveltekit
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

## Deployment Configuration

The deployment process is managed through a Makefile. Before deploying, you should review and update the configuration variables at the top of the Makefile:

```makefile
# Configuration - Edit these variables
SERVER_USER := deployer
SERVER_IP := 47.250.46.218
APP_DIR := /home/deployer/teleme_analytics_sveltekit
REPO_URL := https://huvinesh@bitbucket.org/teleme_malaysia/teleme_analytics_sveltekit.git
BRANCH := main
NODE_VERSION := 22
APP_PORT := 9997
PROCESS_NAME := sveltekit-app
SSH_KEY_PATH := $(HOME)/.ssh/deployer_id_rsa4096
USE_PNPM := true
USE_SUDO := true  # Set to true if sudo is required for certain operations
```

## Initial Server Setup

For first-time deployment, run:

```bash
make setup
```

This will:
1. Clone the repository on the server
2. Install NVM and the specified Node.js version
3. Install PNPM and PM2
4. Set up the deployment environment

## Deployment Commands

### Full Deployment

To deploy the application (pull, build, and start):

```bash
make deploy
```

### Deployment with Health Check

To deploy and verify the application is running:

```bash
make deploy-check
```

### Other Useful Commands

- `make pull`: Pull the latest code without building or restarting
- `make build`: Build the application
- `make start`: Start or restart the application
- `make logs`: View application logs
- `make status`: Check the application status
- `make kill-port`: Kill processes using the application port
- `make install-adapter`: Install the Node.js adapter for SvelteKit
- `make update-adapter`: Update the SvelteKit configuration for production

## Deployment Process

The deployment process follows these steps:

1. Stop the existing process (if running)
2. Pull the latest code from the repository
3. Install dependencies
4. Build the application
5. Start the application with PM2
6. Save the PM2 process list

## Adapter Configuration

SvelteKit requires the correct adapter for production deployment. The Makefile includes commands to:

1. Install the Node.js adapter (`@sveltejs/adapter-node`)
2. Update the configuration file

You can also use the included `deploy-prep.sh` script to prepare the application for deployment locally before pushing:

```bash
./deploy-prep.sh
```

## Troubleshooting

If you encounter issues during deployment:

1. **Repository Access Issues**:
   - Ensure the repository exists on BitBucket
   - Verify the deployer user has access to the repository
   - Consider using HTTPS URL instead of SSH if SSH keys are not properly configured
   - Check if you need to use personal access tokens for authentication

2. **Permission Issues**:
   - If you encounter permission errors when creating directories or accessing files:
     - Set `USE_SUDO := true` in the Makefile
     - Run `sudo chown -R deployer:deployer /home/deployer/teleme_analytics_sveltekit` on the server
   - For PM2 startup permission issues:
     - Run `sudo env PATH=$PATH:/home/deployer/.nvm/versions/node/v22/bin pm2 startup` manually on the server

3. **General Troubleshooting**:
   - Check the logs: `make logs`
   - Verify the application status: `make status`
   - Ensure the correct Node.js version is being used
   - Confirm the server has the necessary permissions for the application directory
   - Check that the environment variables are correctly set up

## Environment Variables

Ensure that all required environment variables are set on the server. You may need to create or update `.env` files on the server.
