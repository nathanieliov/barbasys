import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from './index.js';

describe('Appointment Booking CRUD', () => {
  let token: string;
  let appointmentId: number;

  beforeAll(async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'admin123'
    });
    token = loginRes.body.token;
  });

  it('should create a new appointment', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        barber_id: 1,
        service_id: 1,
        start_time: `${dateStr}T10:00:00`,
        customer_id: null
      });

    expect(res.status).toBe(200);
    expect(res.body.ids).toHaveLength(1);
    appointmentId = res.body.ids[0];
  });

  it('should list appointments for a date', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await request(app)
      .get(`/api/appointments?date=${dateStr}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.find((a: any) => a.id === appointmentId)).toBeDefined();
  });

  it('should update appointment status', async () => {
    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'cancelled'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    const checkRes = await request(app)
      .get(`/api/appointments?date=${dateStr}`)
      .set('Authorization', `Bearer ${token}`);
    
    const updated = checkRes.body.find((a: any) => a.id === appointmentId);
    expect(updated.status).toBe('cancelled');
  });
});
