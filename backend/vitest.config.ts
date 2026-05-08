import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    setupFiles: ['./test/integration/_env.ts'],
    env: {
      JWT_SECRET: 'vitest-test-secret-key-barbasys-2026',
    },
  },
});
