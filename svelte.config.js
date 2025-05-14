import adapter from "@sveltejs/adapter-auto";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
    // If your environment is not supported or you settled on a specific environment, switch out the adapter.
    // See https://kit.svelte.dev/docs/adapters for more information about adapters.
    adapter: adapter(),
    // Remove CSRF check to match original Next.js behavior
    csrf: {
      checkOrigin: false,
    },
    alias: {
      $lib: "./src/lib",
      "$lib/*": "./src/lib/*",
    },
  },
};

export default config;
