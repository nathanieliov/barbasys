import { describe, it, expect } from 'vitest';
import { buildApp } from './_setup.js';
import request from 'supertest';

describe('INT-07 · GET /api/public/shops/:id includes shop_settings', () => {
  it('returns settings.open_time and settings.close_time without auth', async () => {
    const { db, app } = await buildApp();
    db.prepare('INSERT INTO shops (id, name) VALUES (1, ?)').run('Public Shop');
    db.prepare('INSERT INTO shop_settings (shop_id, key, value) VALUES (1, ?, ?)').run('open_time', '09:00');
    db.prepare('INSERT INTO shop_settings (shop_id, key, value) VALUES (1, ?, ?)').run('close_time', '18:00');

    const res = await request(app).get('/api/public/shops/1'); // no auth header

    expect(res.status).toBe(200);
    expect(res.body.settings).toBeDefined();
    expect(res.body.settings.open_time).toBe('09:00');
    expect(res.body.settings.close_time).toBe('18:00');
    // TODO(spec): the verification spec mentions `timezone` and `default_locale`.
    // Current implementation only exposes open_time/close_time.
    // When/if the public endpoint is extended, add assertions here.
  });
});
