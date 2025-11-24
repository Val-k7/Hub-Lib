/**
 * Configuration Vitest pour les tests
 */

import { defineConfig } from 'vitest/config';

import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [resolve(__dirname, 'src/test/setup.ts')],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.*',
        '**/coverage/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/test/**',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});


