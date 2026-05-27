import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'apps/api/tests/e2e',
  timeout: 30_000,
  retries: 1,
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.API_URL ?? 'http://localhost:3000',
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },
});
