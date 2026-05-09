import { describe, it, expect } from 'vitest';
import { buildApp, seedMinimalShop } from './_setup.js';
import request from 'supertest';

describe('INT-06 · login rate-limit', () => {
  it('eventually returns 429 after repeated failed attempts from the same IP', async () => {
    const { db, app } = await buildApp();
    await seedMinimalShop(db);

    // Use a unique IP+username pair per test run to avoid cross-test interference
    // since the rate limiter state is module-level and key is `ip:username`.
    const uniqueIp = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;

    let saw429 = false;
    for (let i = 0; i < 20; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', uniqueIp)
        .send({ username: 'owner', password: 'WrongPassword!' });
      if (res.status === 429) { saw429 = true; break; }
    }
    expect(saw429).toBe(true);
  });
});
