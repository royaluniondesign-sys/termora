import { defineConfig } from 'vitest/config';

// Package-level config so `turbo run test` (which runs vitest from this
// directory) finds the suite. The root config covers `vitest` run from the
// repo root.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
