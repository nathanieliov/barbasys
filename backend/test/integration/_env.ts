// Vitest setupFile: configures env vars before any backend module is loaded.
// Referenced from backend/vitest.config.ts.
process.env.NODE_ENV = 'test';
process.env.FAKE_TWILIO = '1';
process.env.FAKE_LLM = '1';
process.env.JWT_SECRET ??= 'vitest-test-secret-key-barbasys-2026';
delete process.env.DB_PATH;
