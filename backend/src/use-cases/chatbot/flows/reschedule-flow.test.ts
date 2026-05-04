import { describe, it, expect, beforeAll, vi } from 'vitest';
import db from '../../../db.js';
import { SQLiteAppointmentRepository } from '../../../repositories/sqlite-appointment-repository.js';
import { SqliteConversationRepository } from '../../../repositories/sqlite-conversation-repository.js';
import { RescheduleFlow } from './reschedule-flow.js';
import { GetAvailableSlots } from '../../booking/GetAvailableSlots.js';
import type { Conversation } from '../../../domain/entities.js';

function makeSlotsMock(slots: string[]) {
  return { execute: vi.fn().mockResolvedValue(slots) } as unknown as GetAvailableSlots;
}

describe('RescheduleFlow', () => {
  let shopId: number;
  let customerId: number;
  let barberId: number;
  let serviceId: number;
  let appointmentId: number;
  let appointmentRepo: SQLiteAppointmentRepository;
  let convRepo: SqliteConversationRepository;
  let conversation: Conversation;

  beforeAll(() => {
    const shop = db.prepare('INSERT INTO shops (name, phone) VALUES (?, ?)').run('Test Shop', '+15551234567');
    shopId = shop.lastInsertRowid as number;

    const customer = db.prepare('INSERT INTO customers (name, phone) VALUES (?, ?)').run('John Doe', '+15551234567');
    customerId = customer.lastInsertRowid as number;

    const barber1 = db.prepare('INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('Carlos', 'Carlos Mendez', 'COMMISSION', 0.2, 0.15, shopId, 1);
    barberId = barber1.lastInsertRowid as number;

    db.prepare('INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('Juan', 'Juan Lopez', 'COMMISSION', 0.2, 0.15, shopId, 1);

    const service = db.prepare('INSERT INTO services (name, description, price, duration_minutes, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('Haircut', 'Basic haircut', 25, 30, shopId, 1);
    serviceId = service.lastInsertRowid as number;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const startTime = futureDate.toISOString().split('T')[0] + 'T10:00:00';

    const appointment = db.prepare('INSERT INTO appointments (barber_id, customer_id, start_time, shop_id, service_id, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run(barberId, customerId, startTime, shopId, serviceId, 'scheduled');
    appointmentId = appointment.lastInsertRowid as number;

    appointmentRepo = new SQLiteAppointmentRepository(db);
    convRepo = new SqliteConversationRepository(db);

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
    const flow = new RescheduleFlow(appointmentRepo, convRepo, shopId, makeSlotsMock([]));
    const result = await flow.handle({ conversation, body: '' });

    expect(result.nextState).toBe('rescheduling');
    expect(result.reply.toLowerCase().includes('cita') || result.reply.toLowerCase().includes('appointment')).toBe(true);
  });

  it('transitions to barber selection after selecting appointment', async () => {
    const flow = new RescheduleFlow(appointmentRepo, convRepo, shopId, makeSlotsMock([]));
    const context = { step: 1, appointmentId };
    const conv = { ...conversation, context_json: JSON.stringify(context), state: 'rescheduling' };

    const result = await flow.handle({ conversation: conv, body: '1' });

    expect(result.nextState).toBe('rescheduling');
    expect(result.reply.toLowerCase().includes('barbero') || result.reply.toLowerCase().includes('barber')).toBe(true);
  });

  it('transitions from barber to service selection', async () => {
    const flow = new RescheduleFlow(appointmentRepo, convRepo, shopId, makeSlotsMock([]));
    const context = { step: 2, appointmentId, barberId };
    const conv = { ...conversation, context_json: JSON.stringify(context), state: 'rescheduling' };

    const result = await flow.handle({ conversation: conv, body: '1' });

    expect(result.nextState).toBe('rescheduling');
    expect(result.reply.toLowerCase().includes('servicio') || result.reply.toLowerCase().includes('service')).toBe(true);
  });

  it('transitions from service to date selection', async () => {
    const flow = new RescheduleFlow(appointmentRepo, convRepo, shopId, makeSlotsMock([]));
    const context = { step: 3, appointmentId, barberId, serviceId };
    const conv = { ...conversation, context_json: JSON.stringify(context), state: 'rescheduling' };

    const result = await flow.handle({ conversation: conv, body: '1' });

    expect(result.nextState).toBe('rescheduling');
    expect(result.reply.toLowerCase().includes('fecha') || result.reply.toLowerCase().includes('date')).toBe(true);
  });

  it('shows real slots after date selection', async () => {
    const mockSlots = makeSlotsMock(['10:00', '13:00', '16:00']);
    const flow = new RescheduleFlow(appointmentRepo, convRepo, shopId, mockSlots);
    const context = { step: 4, appointmentId, barberId, serviceId };
    const conv = { ...conversation, context_json: JSON.stringify(context), state: 'rescheduling' };

    const result = await flow.handle({ conversation: conv, body: '1' });

    expect(result.nextState).toBe('rescheduling');
    expect(result.reply).toContain('10:00');
    expect(result.reply).toContain('13:00');
    expect(mockSlots.execute).toHaveBeenCalledWith(
      expect.objectContaining({ barber_id: barberId, duration: 30 })
    );
  });

  it('stays on date step when no slots available', async () => {
    const flow = new RescheduleFlow(appointmentRepo, convRepo, shopId, makeSlotsMock([]));
    const context = { step: 4, appointmentId, barberId, serviceId };
    const conv = { ...conversation, context_json: JSON.stringify(context), state: 'rescheduling' };

    const result = await flow.handle({ conversation: conv, body: '1' });

    expect(result.nextState).toBe('rescheduling');
    expect(result.reply.toLowerCase()).toMatch(/no hay|no available/);
    expect((result.nextContext as any)?.step).toBe(4);
  });

  it('transitions from slot to confirmation with stored slots', async () => {
    const storedSlots = ['10:00', '13:00', '16:00'];
    const flow = new RescheduleFlow(appointmentRepo, convRepo, shopId, makeSlotsMock([]));
    const context = { step: 5, appointmentId, barberId, serviceId, date: '2099-01-15', availableSlots: storedSlots };
    const conv = { ...conversation, context_json: JSON.stringify(context), state: 'rescheduling' };

    const result = await flow.handle({ conversation: conv, body: '2' }); // select 13:00

    expect(result.nextState).toBe('rescheduling');
    expect(result.reply).toContain('13:00');
    expect(result.reply.toLowerCase()).toMatch(/confirmar|confirm/);
  });

  it('shows no appointments message when none exist', async () => {
    const flow = new RescheduleFlow(appointmentRepo, convRepo, shopId, makeSlotsMock([]));
    const emptyConv = { ...conversation, customer_id: 9999 };

    const result = await flow.handle({ conversation: emptyConv, body: '' });

    expect(result.nextState).toBe('idle');
    expect(result.reply.includes('no appointment') || result.reply.includes('ninguna cita')).toBe(true);
  });
});
