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

  it('should create a customer directly via POST /api/customers', async () => {
    const uniqueEmail = `direct-${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Direct Test', email: uniqueEmail });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  it('should return 409 when a customer with the same email already exists', async () => {
    const email = `dup-${Date.now()}@example.com`;

    const first = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Original', email });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Duplicate', email });
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/already exists/i);
  });

  it('should return 409 when a customer with the same phone already exists', async () => {
    const phone = `555-${Date.now().toString().slice(-7)}`;

    const first = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone });
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/already exists/i);
  });

  it('should return 400 when no identifying info is provided', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
  });

  it('should return 404 JSON for unmatched API routes instead of hanging', async () => {
    const res = await request(app)
      .post('/api/this-route-does-not-exist')
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('walk-in sentinel should not appear in customer list', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const walkIns = res.body.filter((c: any) => c.is_walkin === 1);
    expect(walkIns).toHaveLength(0);
  });

  it('sale with no customer info should have a walk-in customer_id', async () => {
    const saleRes = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        barber_id: 1,
        items: [{ id: 1, type: 'service', price: 20, name: 'Cut' }],
      });

    expect(saleRes.status).toBe(200);
    const saleId = saleRes.body.saleId;

    const detailRes = await request(app)
      .get(`/api/sales/${saleId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.customer_id).not.toBeNull();
    expect(detailRes.body.is_walkin).toBe(1);
  });
});
