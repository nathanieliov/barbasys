import { describe, it, expect } from 'vitest';
import { buildApp, seedMinimalShop } from './_setup.js';
import request from 'supertest';

describe('INT-05 · POST /api/auth/login with wrong password', () => {
  it('returns 401 with no token and no password_hash leak', async () => {
    const { db, app } = await buildApp();
    await seedMinimalShop(db);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'owner', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
    const bodyJson = JSON.stringify(res.body);
    expect(bodyJson).not.toContain('password_hash');
    expect(bodyJson).not.toContain('$2a$');
    expect(bodyJson).not.toContain('$2b$');
  });
});
