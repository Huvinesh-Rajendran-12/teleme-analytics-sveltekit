import adapter from "@sveltejs/adapter-node";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // Using adapter-node for production deployment
    adapter: adapter({
      // Custom options, if needed
      // out: 'build',
      // precompress: false,
      // envPrefix: ''
    }),
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
