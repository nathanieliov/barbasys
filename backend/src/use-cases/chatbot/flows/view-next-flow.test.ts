import { describe, it, expect, beforeAll } from 'vitest';
import db from '../../../db.js';
import { SQLiteAppointmentRepository } from '../../../repositories/sqlite-appointment-repository.js';
import { ViewNextFlow } from './view-next-flow.js';
import type { Conversation } from '../../../domain/entities.js';

describe('ViewNextFlow', () => {
  let shopId: number;
  let customerId: number;
  let flow: ViewNextFlow;
  let conversation: Conversation;

  beforeAll(() => {
    const shop = db.prepare('INSERT INTO shops (name, phone) VALUES (?, ?)').run('Test Shop', '+15551234567');
    shopId = shop.lastInsertRowid as number;

    const customer = db.prepare('INSERT INTO customers (name, phone) VALUES (?, ?)').run('John Doe', '+15551234567');
    customerId = customer.lastInsertRowid as number;

    const barber = db.prepare('INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('Carlos', 'Carlos Mendez', 'COMMISSION', 0.2, 0.15, shopId, 1);
    const barberId = barber.lastInsertRowid as number;

    const service = db.prepare('INSERT INTO services (name, description, price, duration_minutes, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('Haircut', 'Basic haircut', 25, 30, shopId, 1);
    const serviceId = service.lastInsertRowid as number;

    // Create an upcoming appointment
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const startTime = futureDate.toISOString().split('T')[0] + 'T10:00:00';

    db.prepare('INSERT INTO appointments (barber_id, customer_id, start_time, shop_id, service_id, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run(barberId, customerId, startTime, shopId, serviceId, 'scheduled');

    flow = new ViewNextFlow(new SQLiteAppointmentRepository(db));

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

  it('shows next upcoming appointment', async () => {
    const result = await flow.handle({ conversation, body: '' });

    expect(result.nextState).toBe('idle');
    expect(result.reply.includes('Carlos') || result.reply.includes('Haircut')).toBe(true);
  });

  it('shows no appointments message when none exist', async () => {
    const emptyConv = { ...conversation, customer_id: 9999 };

    const result = await flow.handle({ conversation: emptyConv, body: '' });

    expect(result.reply.includes('no appointment') || result.reply.includes('ninguna cita')).toBe(true);
  });
});
