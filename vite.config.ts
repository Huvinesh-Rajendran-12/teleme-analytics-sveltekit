import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 9999
  },
  build: {
    sourcemap: true
  },
  preview: {
    port: 9999,
    allowedHosts: ['localhost', 'staging-botpress-i.teleme.co', 'staging-botpress.teleme.co']
  },
  ssr: {
    noExternal: ['@sveltejs/kit']
  }
});
