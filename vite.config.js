import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 9999,
  },
  build: {
    sourcemap: true,
  },
  ssr: {
    noExternal: ["@sveltejs/kit"],
  },
});
