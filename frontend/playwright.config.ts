/**
 * Playwright config for responsive/visual-regression E2E tests.
 *
 * Install playwright first:
 *   npm install -D @playwright/test
 *   npx playwright install chromium
 *
 * Then run:
 *   npx playwright test
 */

import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/results',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { outputFolder: 'e2e/report' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // All projects use Chromium (only browser installed via `npx playwright install chromium`)
    { name: 'phone-360',    use: { browserName: 'chromium', viewport: { width: 360,  height: 640  } } },
    { name: 'phone-414',    use: { browserName: 'chromium', viewport: { width: 414,  height: 896  } } },
    { name: 'tablet-768',   use: { browserName: 'chromium', viewport: { width: 768,  height: 1024 } } },
    { name: 'tablet-1024',  use: { browserName: 'chromium', viewport: { width: 1024, height: 768  } } },
    { name: 'desktop-1280', use: { browserName: 'chromium', viewport: { width: 1280, height: 900  } } },
    { name: 'desktop-1440', use: { browserName: 'chromium', viewport: { width: 1440, height: 900  } } },
  ],
});
