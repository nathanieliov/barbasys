import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from './index.js';
import db from './db.js';

describe('Sales and Reports API', () => {
  let barberId: number;
  let serviceId: number;
  let productId: number;
  let token: string;

  beforeAll(async () => {
    // Clean up any existing sales to start fresh
    db.exec('DELETE FROM sale_items; DELETE FROM sales;');

    // Login to get token
    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'admin123'
    });
    token = loginRes.body.token;

    // Fetch seed data to dynamically get IDs
    const barbersRes = await request(app).get('/api/barbers').set('Authorization', `Bearer ${token}`);
    barberId = barbersRes.body.find((b: any) => b.name === 'Nathaniel').id;

    const servicesRes = await request(app).get('/api/services').set('Authorization', `Bearer ${token}`);
    serviceId = servicesRes.body.find((s: any) => s.name === 'Haircut').id;

    const inventoryRes = await request(app).get('/api/inventory').set('Authorization', `Bearer ${token}`);
    productId = inventoryRes.body.find((p: any) => p.name === 'Pomade').id;
  });

  it('should process a sale with tip and discount and calculate commissions correctly', async () => {
    const saleData = {
      barber_id: barberId,
      items: [
        { id: serviceId, type: 'service', price: 25 },
        { id: productId, type: 'product', price: 18 }
      ],
      tip_amount: 5,
      discount_amount: 3
    };

    const saleRes = await request(app).post('/api/sales').set('Authorization', `Bearer ${token}`).send(saleData);
    expect(saleRes.status).toBe(200);
    expect(saleRes.body.success).toBe(true);

    // Verify the Daily Report
    const today = new Date().toISOString().split('T')[0];
    const reportRes = await request(app).get(`/api/reports?date=${today}`).set('Authorization', `Bearer ${token}`);
    
    if (reportRes.status !== 200) console.log('DEBUG Report Error:', reportRes.body);
    expect(reportRes.status).toBe(200);
    expect(reportRes.body.revenue).toBe(45);
    expect(reportRes.body.tips).toBe(5);

    // Verify Nathaniel's specific commission and tip aggregation
    const nathanielData = reportRes.body.commissions.find((c: any) => c.name === 'Nathaniel');
    expect(nathanielData).toBeDefined();
    expect(nathanielData.service_commission).toBeCloseTo(15, 2);
    expect(nathanielData.product_commission).toBeCloseTo(2.7, 2);
    expect(nathanielData.tips).toBeCloseTo(5, 2);
  });
});
