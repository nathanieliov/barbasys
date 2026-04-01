import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from './index.js';
import db from './db.js';

describe('Sales Log Privacy Enforcement', () => {
  let adminToken: string;
  let nathanielToken: string;
  let nathanielBarberId: number;
  let otherBarberId: number;
  let shopId: number;

  beforeAll(async () => {
    // 1. Setup - Clear and get tokens
    db.exec("DELETE FROM sale_items; DELETE FROM sales; DELETE FROM users WHERE username IN ('Nathaniel_Test', 'null_barber')");
    db.exec("DELETE FROM barbers WHERE name IN ('Nathaniel_Barber', 'Other_Barber')");
    
    const adminRes = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'admin123'
    });
    adminToken = adminRes.body.token;
    shopId = adminRes.body.user.shop_id;

    // Create two barbers
    const b1 = db.prepare('INSERT INTO barbers (name, fullname, shop_id) VALUES (?, ?, ?)').run('Nathaniel_Barber', 'Nathaniel Test', shopId);
    nathanielBarberId = Number(b1.lastInsertRowid);
    
    const b2 = db.prepare('INSERT INTO barbers (name, fullname, shop_id) VALUES (?, ?, ?)').run('Other_Barber', 'Other Professional', shopId);
    otherBarberId = Number(b2.lastInsertRowid);

    // Create User for Nathaniel
    await request(app).post('/api/auth/register').set('Authorization', `Bearer ${adminToken}`).send({
      username: 'Nathaniel_Test',
      email: 'nathaniel_test@ex.com',
      password_hash: 'password123',
      role: 'BARBER',
      barber_id: nathanielBarberId,
      shop_id: shopId
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'Nathaniel_Test',
      password: 'password123'
    });
    nathanielToken = loginRes.body.token;

    // Create a sale for Nathaniel
    await request(app).post('/api/sales').set('Authorization', `Bearer ${adminToken}`).send({
      barber_id: nathanielBarberId,
      items: [{ id: 1, name: 'Service', type: 'service', price: 50 }],
      shop_id: shopId
    });

    // Create a sale for the "Other Barber"
    await request(app).post('/api/sales').set('Authorization', `Bearer ${adminToken}`).send({
      barber_id: otherBarberId,
      items: [{ id: 1, name: 'Service', type: 'service', price: 30 }],
      shop_id: shopId
    });
  });

  it('should only return Nathaniel own sales and NOT the other barber sales', async () => {
    const res = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${nathanielToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].barber_id).toBe(nathanielBarberId);
  });

  it('should NOT allow Nathaniel to see other sales by providing a different barberId in query', async () => {
    const res = await request(app)
      .get(`/api/sales?barberId=${otherBarberId}`)
      .set('Authorization', `Bearer ${nathanielToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].barber_id).toBe(nathanielBarberId);
  });

  it('should return 403 when Nathaniel tries to access detail of Other Barber sale', async () => {
    const allSales = await request(app).get('/api/sales').set('Authorization', `Bearer ${adminToken}`);
    const otherSaleId = allSales.body.find((s: any) => s.barber_id === otherBarberId).id;

    const res = await request(app)
      .get(`/api/sales/${otherSaleId}`)
      .set('Authorization', `Bearer ${nathanielToken}`);
    
    expect(res.status).toBe(403);
  });

  it('should only return Nathaniel own commissions in the reports', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app)
      .get(`/api/reports?startDate=${today}&endDate=${today}`)
      .set('Authorization', `Bearer ${nathanielToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.commissions.length).toBe(1);
    expect(res.body.commissions[0].barber_id).toBe(nathanielBarberId);
  });

  it('should NOT allow Nathaniel to see sales from another shop', async () => {
    const s2 = db.prepare('INSERT INTO shops (name) VALUES (?)').run('Other Shop');
    const otherShopId = Number(s2.lastInsertRowid);

    await request(app).post('/api/sales').set('Authorization', `Bearer ${adminToken}`).send({
      barber_id: nathanielBarberId,
      items: [{ id: 1, name: 'Service', type: 'service', price: 100 }],
      shop_id: otherShopId
    });

    const res = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${nathanielToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.every((s: any) => s.shop_id === shopId)).toBe(true);
  });
});
