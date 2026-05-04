import { describe, it, expect, beforeAll } from 'vitest';
import db from '../../../db.js';
import { SQLiteAppointmentRepository } from '../../../repositories/sqlite-appointment-repository.js';
import { SqliteConversationRepository } from '../../../repositories/sqlite-conversation-repository.js';
import { RescheduleFlow } from './reschedule-flow.js';
import type { Conversation } from '../../../domain/entities.js';

describe('RescheduleFlow', () => {
  let shopId: number;
  let customerId: number;
  let appointmentId: number;
  let flow: RescheduleFlow;
  let conversation: Conversation;

  beforeAll(() => {
    const shop = db.prepare('INSERT INTO shops (name, phone) VALUES (?, ?)').run('Test Shop', '+15551234567');
    shopId = shop.lastInsertRowid as number;

    const customer = db.prepare('INSERT INTO customers (name, phone) VALUES (?, ?)').run('John Doe', '+15551234567');
    customerId = customer.lastInsertRowid as number;

    const barber1 = db.prepare('INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('Carlos', 'Carlos Mendez', 'COMMISSION', 0.2, 0.15, shopId, 1);
    const barberId1 = barber1.lastInsertRowid as number;

    const barber2 = db.prepare('INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('Juan', 'Juan Lopez', 'COMMISSION', 0.2, 0.15, shopId, 1);

    const service = db.prepare('INSERT INTO services (name, description, price, duration_minutes, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('Haircut', 'Basic haircut', 25, 30, shopId, 1);
    const serviceId = service.lastInsertRowid as number;

    // Create upcoming appointment
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const startTime = futureDate.toISOString().split('T')[0] + 'T10:00:00';

    const appointment = db.prepare('INSERT INTO appointments (barber_id, customer_id, start_time, shop_id, service_id, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run(barberId1, customerId, startTime, shopId, serviceId, 'scheduled');
    appointmentId = appointment.lastInsertRowid as number;

    const appointmentRepo = new SQLiteAppointmentRepository(db);
    const convRepo = new SqliteConversationRepository(db);
    flow = new RescheduleFlow(appointmentRepo, convRepo, shopId);

    conversation = {
      id: 1,
      customer_id: customerId,
      wa_phone: '+15551234567',
      language: 'es',
      state: 'idle',
      context_json: null,
      last_inbound_at: null,
      last_outbound_at: null,
      created_at: '2026-04-20T00:00:00',
      updated_at: '2026-04-20T00:00:00',
    };
  });

  it('shows list of appointments to reschedule', async () => {
    const result = await flow.handle({ conversation, body: '' });

    expect(result.nextState).toBe('rescheduling');
    expect(result.reply.toLowerCase().includes('cita') || result.reply.toLowerCase().includes('appointment')).toBe(true);
  });

  it('transitions to barber selection after selecting appointment', async () => {
    const context = { step: 1, appointmentId };
    const conv = { ...conversation, context_json: JSON.stringify(context), state: 'rescheduling' };

    const result = await flow.handle({ conversation: conv, body: '1' });

    expect(result.nextState).toBe('rescheduling');
    expect(result.reply.toLowerCase().includes('barbero') || result.reply.toLowerCase().includes('barber')).toBe(true);
  });

  it('transitions from barber to service selection', async () => {
    const context = { step: 2, appointmentId, barberId: 1 };
    const conv = { ...conversation, context_json: JSON.stringify(context), state: 'rescheduling' };

    const result = await flow.handle({ conversation: conv, body: '1' });

    expect(result.nextState).toBe('rescheduling');
    expect(result.reply.toLowerCase().includes('servicio') || result.reply.toLowerCase().includes('service')).toBe(true);
  });

  it('shows no appointments message when none exist', async () => {
    const emptyConv = { ...conversation, customer_id: 9999 };

    const result = await flow.handle({ conversation: emptyConv, body: '' });

    expect(result.nextState).toBe('idle');
    expect(result.reply.includes('no appointment') || result.reply.includes('ninguna cita')).toBe(true);
  });
});
