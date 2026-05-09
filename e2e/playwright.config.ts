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
  // NOTE: seed-test runs BEFORE Playwright via scripts/e2e-run.sh (out-of-band
  // to avoid the backend reading from an unlinked DB inode after the seed
  // file unlinks/recreates the test DB). Don't add `globalSetup: seed-test`
  // here — it would run again after the backend has connected, and the
  // backend would then serve stale data from the old inode.
  webServer: [
    // Backend is started out-of-band by scripts/e2e-run.sh.
    // Playwright's webServer spawn semantics cause better-sqlite3 to
    // see writes as "readonly database" — root cause unidentified, but
    // direct shell invocation works fine. Frontend (Vite preview) works
    // under webServer, so we keep it there.
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
