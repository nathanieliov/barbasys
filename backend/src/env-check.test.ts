import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEnv } from './env-check.js';

describe('validateEnv', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('skips all checks when NODE_ENV=test', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.JWT_SECRET;
    expect(() => validateEnv()).not.toThrow();
  });

  it('throws when JWT_SECRET is missing in non-test env', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    expect(() => validateEnv()).toThrow(/JWT_SECRET/);
  });

  it('throws when JWT_SECRET is shorter than 32 chars', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'too-short';
    expect(() => validateEnv()).toThrow(/32 characters/);
  });

  it('warns about disabled features when optional vars are missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(32);
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.OPENAI_API_KEY;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    validateEnv();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Optional features disabled'));
  });

  it('logs success when all features configured', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.TWILIO_ACCOUNT_SID = 'x';
    process.env.TWILIO_AUTH_TOKEN = 'x';
    process.env.TWILIO_FROM_NUMBER = 'x';
    process.env.OPENAI_API_KEY = 'x';
    process.env.EMAIL_USER = 'x';
    process.env.EMAIL_PASS = 'x';
    process.env.GCAL_REDIRECT_URI = 'x';
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    validateEnv();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('All optional features configured'));
  });
});
