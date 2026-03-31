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
    db.exec("DELETE FROM sale_items; DELETE FROM sales; DELETE FROM users WHERE username = 'Nathaniel_Test'");
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

  it('should strictly only return Nathaniel own sales and NOT the other barber sales', async () => {
    const res = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${nathanielToken}`);
    
    expect(res.status).toBe(200);
    
    // Log for debugging if it fails
    if (res.body.length > 1) {
      console.log('Nathaniel saw too many sales:', res.body.map((s: any) => s.barber_id));
    }

    // Should be exactly 1 sale (his own)
    expect(res.body.length).toBe(1);
    expect(res.body[0].barber_id).toBe(nathanielBarberId);
    
    // Double check: No sale from Other Barber should be present
    const hasOtherSale = res.body.some((s: any) => s.barber_id === otherBarberId);
    expect(hasOtherSale).toBe(false);
  });

  it('should return 403 when Nathaniel tries to access detail of Other Barber sale', async () => {
    // 1. Get other sale ID
    const allSales = await request(app).get('/api/sales').set('Authorization', `Bearer ${adminToken}`);
    const otherSaleId = allSales.body.find((s: any) => s.barber_id === otherBarberId).id;

    // 2. Try to access it as Nathaniel
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
    // Commissions array should have exactly 1 entry
    expect(res.body.commissions.length).toBe(1);
    expect(res.body.commissions[0].barber_id).toBe(nathanielBarberId);
  });

  it('should only return Nathaniel own performance in the analytics', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app)
      .get(`/api/reports/analytics?startDate=${today}&endDate=${today}`)
      .set('Authorization', `Bearer ${nathanielToken}`);
    
    expect(res.status).toBe(200);
    // barberPerformance array should have exactly 1 entry
    expect(res.body.barberPerformance.length).toBe(1);
    expect(res.body.barberPerformance[0].name).toBe('Nathaniel Test');
  });

  it('should return NO sales for a BARBER role with NO linked barber_id', async () => {
    // 1. Create a barber user with null barber_id
    await request(app).post('/api/auth/register').set('Authorization', `Bearer ${adminToken}`).send({
      username: 'null_barber',
      email: 'null@ex.com',
      password_hash: 'password123',
      role: 'BARBER',
      barber_id: null,
      shop_id: shopId
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'null_barber',
      password: 'password123'
    });
    const nullToken = loginRes.body.token;

    const res = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${nullToken}`);
    
    expect(res.status).toBe(200);
    // If it's undefined in the filter, it might return EVERYTHING. 
    // We want it to return NOTHING or strictly filter.
    expect(res.body.length).toBe(0);
  });
});
