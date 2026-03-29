import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from './index.js';

describe('Barber Management CRUD', () => {
  let token: string;
  let barberId: number;

  beforeAll(async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'admin123'
    });
    token = loginRes.body.token;
  });

  it('should create a new barber via API', async () => {
    // Note: The UI uses POST /api/barbers directly or via registration? 
    // Let's check index.ts for the route.
    const res = await request(app)
      .post('/api/barbers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Barber',
        service_commission_rate: 0.6,
        product_commission_rate: 0.2
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    barberId = res.body.id;
  });

  it('should list all barbers', async () => {
    const res = await request(app)
      .get('/api/barbers')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const barber = res.body.find((b: any) => b.id === barberId);
    expect(barber).toBeDefined();
    expect(barber.name).toBe('Test Barber');
  });

  it('should update a barber', async () => {
    const res = await request(app)
      .put(`/api/barbers/${barberId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Barber',
        service_commission_rate: 0.7,
        product_commission_rate: 0.2
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const checkRes = await request(app)
      .get('/api/barbers')
      .set('Authorization', `Bearer ${token}`);
    const updated = checkRes.body.find((b: any) => b.id === barberId);
    expect(updated.name).toBe('Updated Barber');
    expect(updated.service_commission_rate).toBe(0.7);
  });

  it('should delete (deactivate) a barber', async () => {
    const res = await request(app)
      .delete(`/api/barbers/${barberId}`)
      .set('Authorization', `Bearer ${token}`);

    // If it has no appointments, it returns 200. 
    // If it fails due to logic, we just check if it was intended to fail.
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);


    // Verify it's inactive (if the list filter is active)
    const checkRes = await request(app)
      .get('/api/barbers')
      .set('Authorization', `Bearer ${token}`);
    const deleted = checkRes.body.find((b: any) => b.id === barberId);
    // If our list filters by is_active = 1, it should be missing
    // Otherwise, we check the flag
    if (deleted) {
      expect(deleted.is_active).toBe(0);
    } else {
      expect(deleted).toBeUndefined();
    }
  });
});
