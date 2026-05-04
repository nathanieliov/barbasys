import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhoneRateLimiter } from './phone-rate-limiter.js';

describe('PhoneRateLimiter', () => {
  let limiter: PhoneRateLimiter;

  beforeEach(() => {
    limiter = new PhoneRateLimiter({
      maxRequests: 5,
      windowMs: 60000 // 1 minute
    });
  });

  it('allows requests within limit', async () => {
    const phone = '+15551234567';
    for (let i = 0; i < 5; i++) {
      const result = limiter.isAllowed(phone);
      expect(result).toBe(true);
    }
  });

  it('blocks requests exceeding limit', async () => {
    const phone = '+15551234567';
    for (let i = 0; i < 5; i++) {
      limiter.isAllowed(phone);
    }
    const result = limiter.isAllowed(phone);
    expect(result).toBe(false);
  });

  it('resets count after window expires', async () => {
    const limiter = new PhoneRateLimiter({
      maxRequests: 2,
      windowMs: 100 // 100ms for testing
    });
    const phone = '+15551234567';

    limiter.isAllowed(phone);
    limiter.isAllowed(phone);
    expect(limiter.isAllowed(phone)).toBe(false);

    await new Promise(resolve => setTimeout(resolve, 120));
    expect(limiter.isAllowed(phone)).toBe(true);
  });

  it('tracks different phones independently', async () => {
    const phone1 = '+15551111111';
    const phone2 = '+15552222222';

    limiter.isAllowed(phone1);
    limiter.isAllowed(phone1);
    expect(limiter.isAllowed(phone1)).toBe(true);

    limiter.isAllowed(phone2);
    expect(limiter.isAllowed(phone2)).toBe(true);
  });

  it('returns remaining requests', () => {
    const phone = '+15551234567';
    const remaining1 = limiter.getRemainingRequests(phone);
    expect(remaining1).toBe(5);

    limiter.isAllowed(phone);
    const remaining2 = limiter.getRemainingRequests(phone);
    expect(remaining2).toBe(4);

    limiter.isAllowed(phone);
    const remaining3 = limiter.getRemainingRequests(phone);
    expect(remaining3).toBe(3);
  });
});
