import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';

export default [
  {
    // Ignore files and directories (migrated from .eslintignore)
    ignores: [
      '*.cjs',
      '*.config.js', // It's good practice to ignore config files themselves from linting
      'node_modules/**',
      '.svelte-kit/**',
      'build/**',
      'dist/**',
      'package/**',
      '.DS_Store',
      '/build',
      '.env',
      '.env.*',
      '!.env.example',
      'pnpm-lock.yaml',
      'package-lock.json',
      'yarn.lock',
      '/coverage',
      '/.next/',
      '/out/',
      '.vercel',
      '.output',
      '.pnpm-debug.log'
    ]
  },
  {
    // Configuration for JavaScript and TypeScript files
    files: ['**/*.{js,ts}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2020
        // Add project: 'tsconfig.json' here if you want rules that require type information
        // But note that this can significantly slow down linting.
      },
      globals: {
        browser: true,
        es2017: true,
        node: true // Keep 'node' global if you have server-side JS/TS files (like API routes)
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    rules: {
      // Recommended TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Common JS/TS rules
      'no-console': ['warn', { allow: ['warn', 'error', 'debug', 'info'] }]
    }
  },
  {
    // Configuration for Svelte files
    files: ['**/*.svelte'],
    // Add both svelte and typescript plugins here
    plugins: {
      svelte: sveltePlugin,
      '@typescript-eslint': typescript
    },
    languageOptions: {
      parser: svelteParser, // Use the svelte parser
      parserOptions: {
        parser: typescriptParser, // Configure the svelte parser to use the typescript parser for <script lang="ts"> blocks
        sourceType: 'module',
        ecmaVersion: 2020
        // Add project: 'tsconfig.json' here if needed, similar to the JS/TS block
      },
      globals: {
        browser: true,
        es2017: true,
        node: true // Keep 'node' global if you have server-side Svelte files
      }
    },
    rules: {
      // Add the TS and general rules directly
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error', 'debug', 'info'] }],
      
      // Svelte rules - explicitly set individual rules instead of spreading
      'svelte/valid-compile': 'error',
      'svelte/no-at-html-tags': 'off', // Turned off since we use sanitized HTML rendering
      'svelte/no-unused-svelte-ignore': 'warn',
      'svelte/valid-each-key': 'error'
      
      // You might also add Svelte-specific accessibility rules individually
      // 'svelte/a11y-click-events-have-key-events': 'warn',
      // etc.
    }
  }
];
