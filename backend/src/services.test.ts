import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from './index.js';
import db from './db.js';

describe('Service Catalog CRUD', () => {
  let token: string;
  let serviceId: number;

  beforeAll(async () => {
    // Login to get token
    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'admin123'
    });
    token = loginRes.body.token;
  });

  it('should create a new service', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Service',
        price: 50,
        duration_minutes: 45
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    serviceId = res.body.id;
  });

  it('should list all services', async () => {
    const res = await request(app)
      .get('/api/services')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const service = res.body.find((s: any) => s.id === serviceId);
    expect(service).toBeDefined();
    expect(service.name).toBe('Test Service');
  });

  it('should get a single service', async () => {
    const res = await request(app)
      .get(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Test Service');
    expect(res.body.price).toBe(50);
  });

  it('should update a service', async () => {
    const res = await request(app)
      .put(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Service',
        price: 60,
        duration_minutes: 60
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const checkRes = await request(app)
      .get(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(checkRes.body.name).toBe('Updated Service');
    expect(checkRes.body.price).toBe(60);
  });

  it('should delete a service', async () => {
    const res = await request(app)
      .delete(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const checkRes = await request(app)
      .get(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(checkRes.status).toBe(404);
  });
});
