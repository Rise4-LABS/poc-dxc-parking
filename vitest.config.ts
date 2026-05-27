import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 60, functions: 60 },
    },
  },
  resolve: {
    alias: {
      '@dxc/domain': path.resolve(__dirname, 'packages/domain/src/index.ts'),
      '@dxc/application': path.resolve(__dirname, 'packages/application/src/index.ts'),
    },
  },
});
