#!/bin/bash

# Script to prepare SvelteKit app for deployment

echo "🔧 Installing adapter-node..."
pnpm add -D @sveltejs/adapter-node

echo "📝 Creating production configuration..."
# If svelte.config.prod.ts exists, use it instead of modifying the existing file
if [ -f "svelte.config.prod.ts" ]; then
  cp svelte.config.prod.ts svelte.config.ts
  echo "✅ Using production configuration from svelte.config.prod.ts"
else
  # Otherwise, modify the existing svelte.config.ts
  sed -i 's/import adapter from "@sveltejs\/adapter-auto";/import adapter from "@sveltejs\/adapter-node";/' svelte.config.ts
  echo "✅ Modified svelte.config.ts to use adapter-node"
fi

echo "🚀 Ready for deployment!"
