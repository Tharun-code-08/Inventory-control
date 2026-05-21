import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5200';
const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['html', { open: 'on-failure' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'mobile-chrome',
      testMatch: /mobile-.*\.spec\.ts/,
      use: { ...devices['Pixel 5'], storageState: 'e2e/.auth/admin.json' },
      dependencies: ['setup'],
    },
    {
      name: 'desktop-chrome',
      testMatch: /(purchase-orders|reports)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: 'npm run start --workspace=api',
          url: 'http://127.0.0.1:3000/api/v1/health',
          cwd: repoRoot,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: process.env.CI
            ? 'npm run preview --workspace=web -- --host 127.0.0.1 --port 5200'
            : 'npm run dev --workspace=web',
          url: 'http://127.0.0.1:5200',
          cwd: repoRoot,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});
