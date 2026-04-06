import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined, 
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173', // Dev server port
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'booking-flow',
      use: { 
        ...devices['Desktop Chrome'],
      },
      testMatch: /booking-flow\.spec\.ts/,
    },
  ],
  webServer: {
    command: `rm -f test_e2e.db && npm run build --prefix backend && DATABASE_URL="${path.resolve('test_e2e.db')}" npx concurrently "npm run start --prefix backend" "npm run build --prefix frontend && npm run preview --prefix frontend"`,
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
