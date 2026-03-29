import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from './index.js';

describe('Customer Management (CRM) CRUD', () => {
  let token: string;
  let customerId: number;

  beforeAll(async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'admin123'
    });
    token = loginRes.body.token;
  });

  it('should create a customer', async () => {
    // Customers are often created during sales, but let's check for a direct route
    // Searching index.ts shows GET /api/customers but no POST.
    // If no direct POST exists, we'll verify they appear after a sale.
    const uniqueEmail = `crm-${Date.now()}@example.com`;
    
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        barber_id: 1,
        customer_email: uniqueEmail,
        customer_phone: '555-0001',
        items: [{ id: 1, type: 'service', price: 25 }]
      });

    expect(res.status).toBe(200);

    const listRes = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${token}`);
    
    const customer = listRes.body.find((c: any) => c.email === uniqueEmail);
    expect(customer).toBeDefined();
    customerId = customer.id;
  });

  it('should list all customers', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should update customer notes', async () => {
    // Checking index.ts for PATCH /api/customers/:id
    const res = await request(app)
      .patch(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        notes: 'VIP Customer',
        tags: 'premium,regular'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const listRes = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${token}`);
    const updated = listRes.body.find((c: any) => c.id === customerId);
    expect(updated.notes).toBe('VIP Customer');
    expect(updated.tags).toBe('premium,regular');
  });
});
