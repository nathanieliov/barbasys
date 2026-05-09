import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/integration/**/*.test.ts'],
    setupFiles: ['./test/integration/_env.ts'],
    env: {
      JWT_SECRET: 'vitest-test-secret-key-barbasys-2026',
      // Force email/SMS simulation mode for all tests so no real Gmail/Twilio
      // calls are attempted. Without this, sales.test.ts can time out trying
      // to authenticate with stale Gmail credentials from .env.
      EMAIL_USER: '',
      EMAIL_PASS: '',
    },
  },
});
