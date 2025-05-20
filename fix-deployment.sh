#!/bin/bash
# Script to fix deployment issues

echo "🔧 Fixing deployment issues..."

# Update Node.js version
echo "Updating Node.js to v22..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 22
nvm use 22
nvm alias default 22

# Update package.json to be more flexible with Node.js versions
echo "Updating package.json..."
cd ~/teleme_analytics_sveltekit
sed -i 's/"node": ">=22.0.0"/"node": ">=20.0.0"/' package.json

# Install missing dependencies
echo "Installing missing dependencies..."
pnpm add svelte-markdown

# Initialize SvelteKit properly
echo "Reinitializing SvelteKit..."
pnpm svelte-kit sync

# Install adapter-node for production
echo "Installing adapter-node..."
pnpm add -D @sveltejs/adapter-node

# Update svelte.config.ts to use adapter-node
echo "Updating svelte.config.ts..."
sed -i 's/import adapter from "@sveltejs\/adapter-auto";/import adapter from "@sveltejs\/adapter-node";/' svelte.config.ts

echo "✅ Fixes completed! Try deploying again."
