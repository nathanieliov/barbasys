import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..');

export default defineConfig({
  testDir: '.',
  testMatch: ['**/*.spec.ts'],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../playwright-report' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  globalSetup: require.resolve('./fixtures/seed-test.ts'),
  webServer: [
    {
      command: 'npm run start --prefix backend',
      cwd: repoRoot,
      port: 3000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        // NB: do NOT set NODE_ENV=test — backend/src/index.ts:521 gates app.listen()
        // on NODE_ENV !== 'test'. We need the server to listen for E2E.
        // OTP devCode and other dev-mode behaviors trigger on NODE_ENV != 'production'.
        DB_PATH: path.join(repoRoot, 'data/test.db'),
        FAKE_TWILIO: '1',
        FAKE_LLM: '1',
        JWT_SECRET: 'e2e-secret-do-not-use-in-prod-this-is-32-chars',
        PORT: '3000',
        EMAIL_USER: '',  // ensure SendOTP simulates and returns devCode in response
      },
      timeout: 30_000,
    },
    {
      command: 'npm run preview --prefix frontend -- --port 4173 --strictPort',
      cwd: repoRoot,
      port: 4173,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
