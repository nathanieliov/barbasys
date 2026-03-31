import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from './index.js';
import db from './db.js';

describe('Sales Log Privacy Enforcement', () => {
  let adminToken: string;
  let barberToken: string;
  let otherBarberId: number;
  let ownBarberId: number;
  let shopId: number;
  let otherSaleId: number;

  beforeAll(async () => {
    // 1. Setup - Clear and get tokens
    db.exec("DELETE FROM sale_items; DELETE FROM sales; DELETE FROM users WHERE username IN ('test_barber', 'other_barber')");
    
    const adminRes = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'admin123'
    });
    adminToken = adminRes.body.token;
    shopId = adminRes.body.user.shop_id;

    // Create two barbers
    const b1 = db.prepare('INSERT INTO barbers (name, shop_id) VALUES (?, ?)').run('Own Barber', shopId);
    ownBarberId = Number(b1.lastInsertRowid);
    
    const b2 = db.prepare('INSERT INTO barbers (name, shop_id) VALUES (?, ?)').run('Other Barber', shopId);
    otherBarberId = Number(b2.lastInsertRowid);

    // Create User for Own Barber
    const regRes = await request(app).post('/api/auth/register').set('Authorization', `Bearer ${adminToken}`).send({
      username: 'test_barber',
      email: 'tb@ex.com',
      password_hash: 'password123', // Input field is named password_hash in this use case but it's the raw password
      role: 'BARBER',
      barber_id: ownBarberId,
      shop_id: shopId
    });
    
    if (regRes.status !== 201) {
      console.error('Registration failed:', regRes.body);
    }

    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'test_barber',
      password: 'password123'
    });
    barberToken = loginRes.body.token;
    
    if (!barberToken) {
      console.error('Login failed:', loginRes.body);
    }

    // Create a sale for the "Other Barber"
    const saleRes = await request(app).post('/api/sales').set('Authorization', `Bearer ${adminToken}`).send({
      barber_id: otherBarberId,
      items: [{ id: 1, name: 'Service', type: 'service', price: 50 }],
      shop_id: shopId
    });
    otherSaleId = saleRes.body.saleId;
  });

  it('should only return own sales for a BARBER role', async () => {
    const res = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${barberToken}`);
    
    expect(res.status).toBe(200);
    // Should be 0 because we only created a sale for the "other" barber
    expect(res.body.length).toBe(0);
  });

  it('should ignore barberId query param if user is a BARBER', async () => {
    const res = await request(app)
      .get(`/api/sales?barberId=${otherBarberId}`)
      .set('Authorization', `Bearer ${barberToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0); // Should still be empty, ignoring the requested ID
  });

  it('should allow OWNER to filter by barberId', async () => {
    const res = await request(app)
      .get(`/api/sales?barberId=${otherBarberId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].barber_id).toBe(otherBarberId);
  });

  it('should return 403 when BARBER tries to access detail of another barber\'s sale', async () => {
    const res = await request(app)
      .get(`/api/sales/${otherSaleId}`)
      .set('Authorization', `Bearer ${barberToken}`);
    
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Access denied');
  });
});
