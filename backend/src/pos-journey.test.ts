import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from './index.js';
import db from './db.js';

describe('POS Journey API Integration', () => {
  let barberId: number;
  let serviceId: number;
  let productId: number;
  let token: string;

  beforeAll(async () => {
    // Clean up to start fresh
    db.exec('DELETE FROM sale_items; DELETE FROM sales;');
    
    // Login to get token
    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'admin123'
    });
    token = loginRes.body.token;

    // Get IDs for Alex, Haircut, and Pomade
    const barbersRes = await request(app).get('/api/barbers').set('Authorization', `Bearer ${token}`);
    barberId = barbersRes.body.find((b: any) => b.name === 'Alex').id;

    const servicesRes = await request(app).get('/api/services').set('Authorization', `Bearer ${token}`);
    serviceId = servicesRes.body.find((s: any) => s.name === 'Haircut').id;

    const inventoryRes = await request(app).get('/api/inventory').set('Authorization', `Bearer ${token}`);
    productId = inventoryRes.body.find((p: any) => p.name === 'Pomade').id;
  });

  it('should complete a mixed sale and verify all downstream effects (Inventory, Reports, Commissions)', async () => {
    // 1. Check initial stock
    const initialInv = await request(app).get('/api/inventory').set('Authorization', `Bearer ${token}`);
    const initialStock = initialInv.body.find((p: any) => p.id === productId).stock;

    // 2. Process Sale
    const saleData = {
      barber_id: barberId,
      items: [
        { id: serviceId, type: 'service', name: 'Haircut', price: 25 },
        { id: productId, type: 'product', name: 'Pomade', price: 18 }
      ],
      tip_amount: 5,
      discount_amount: 3
    };

    const saleRes = await request(app).post('/api/sales').set('Authorization', `Bearer ${token}`).send(saleData);
    expect(saleRes.status).toBe(200);
    expect(saleRes.body.success).toBe(true);

    // 3. Verify Inventory Reduction
    const postInv = await request(app).get('/api/inventory').set('Authorization', `Bearer ${token}`);
    const postStock = postInv.body.find((p: any) => p.id === productId).stock;
    expect(postStock).toBe(initialStock - 1);

    // 4. Verify Reports & Commissions
    const today = new Date().toISOString().split('T')[0];
    const reportRes = await request(app).get(`/api/reports?date=${today}`).set('Authorization', `Bearer ${token}`);
    
    expect(reportRes.status).toBe(200);
    // Revenue: 25 + 18 + 5 - 3 = 45
    expect(reportRes.body.revenue).toBe(45);
    expect(reportRes.body.tips).toBe(5);

    // Alex's Commissions: 
    // Service: 25 * 0.5 = 12.50
    // Product: 18 * 0.1 = 1.80
    // Tip: 5.00
    // Total: 19.30
    const alexData = reportRes.body.commissions.find((c: any) => c.name === 'Alex');
    expect(alexData).toBeDefined();
    expect(alexData.service_commission).toBeCloseTo(12.50, 2);
    expect(alexData.product_commission).toBeCloseTo(1.80, 2);
    expect(alexData.tips).toBeCloseTo(5.00, 2);
    expect(alexData.total_payout).toBeCloseTo(19.30, 2);
  });
});
