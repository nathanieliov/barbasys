import { describe, it, expect, beforeAll, vi } from 'vitest';
import db from '../../../db.js';
import { SQLiteAppointmentRepository } from '../../../repositories/sqlite-appointment-repository.js';
import { SqliteConversationRepository } from '../../../repositories/sqlite-conversation-repository.js';
import { BookAppointmentFlow } from './book-appointment.js';
import type { Conversation } from '../../../domain/entities.js';

describe('BookAppointmentFlow', () => {
  let shopId: number;
  let flow: BookAppointmentFlow;

  beforeAll(() => {
    const shop = db.prepare('INSERT INTO shops (name, phone) VALUES (?, ?)').run('Test Shop', '+15551234567');
    shopId = shop.lastInsertRowid as number;

    db.prepare('INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('Carlos', 'Carlos Mendez', 'COMMISSION', 0.2, 0.15, shopId, 1);

    db.prepare('INSERT INTO services (name, description, price, duration_minutes, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('Haircut', 'Basic haircut', 25, 30, shopId, 1);

    const appointmentRepo = new SQLiteAppointmentRepository(db);
    const convRepo = new SqliteConversationRepository(db);
    flow = new BookAppointmentFlow(appointmentRepo, convRepo, shopId);
  });

  const baseConversation: Conversation = {
    id: 1,
    customer_id: 1,
    wa_phone: '+15551234567',
    language: 'es',
    state: 'booking',
    context_json: null,
    last_inbound_at: null,
    last_outbound_at: null,
    created_at: '2026-04-20T00:00:00',
    updated_at: '2026-04-20T00:00:00',
  };

  it('starts booking flow with barber selection', async () => {
    const result = await flow.handle({
      conversation: baseConversation,
      body: 'I want to book',
    });

    expect(result.nextState).toBe('booking');
    expect(result.reply).toContain('barber');
  });

  it('transitions from barber to service selection', async () => {
    const context = { step: 1, barberId: 1 };
    const conv = { ...baseConversation, context_json: JSON.stringify(context), state: 'booking' };

    const result = await flow.handle({
      conversation: conv,
      body: '1',
    });

    expect(result.nextState).toBe('booking');
    expect(result.reply.toLowerCase()).toContain('servicio');
  });

  it('transitions from service to date selection', async () => {
    const context = { step: 2, barberId: 1, serviceId: 1 };
    const conv = { ...baseConversation, context_json: JSON.stringify(context), state: 'booking' };

    const result = await flow.handle({
      conversation: conv,
      body: '1',
    });

    expect(result.nextState).toBe('booking');
    expect(result.reply.toLowerCase()).toContain('fecha');
  });
});
