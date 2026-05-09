import { describe, it, expect, beforeAll, vi } from 'vitest';
import db from '../../../db.js';
import { SQLiteAppointmentRepository } from '../../../repositories/sqlite-appointment-repository.js';
import { SqliteConversationRepository } from '../../../repositories/sqlite-conversation-repository.js';
import { BookAppointmentFlow } from './book-appointment.js';
import { GetAvailableSlots } from '../../booking/GetAvailableSlots.js';
import type { Conversation, ConversationState } from '../../../domain/entities.js';

function makeSlotsMock(slots: string[]) {
  return { execute: vi.fn().mockResolvedValue(slots) } as unknown as GetAvailableSlots;
}

describe('BookAppointmentFlow', () => {
  let shopId: number;
  let barberId: number;
  let serviceId: number;
  let appointmentRepo: SQLiteAppointmentRepository;
  let convRepo: SqliteConversationRepository;

  beforeAll(() => {
    const shop = db.prepare('INSERT INTO shops (name, phone) VALUES (?, ?)').run('Test Shop', '+15551234567');
    shopId = shop.lastInsertRowid as number;

    const barber = db.prepare('INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('Carlos', 'Carlos Mendez', 'COMMISSION', 0.2, 0.15, shopId, 1);
    barberId = barber.lastInsertRowid as number;

    const service = db.prepare('INSERT INTO services (name, description, price, duration_minutes, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('Haircut', 'Basic haircut', 25, 30, shopId, 1);
    serviceId = service.lastInsertRowid as number;

    appointmentRepo = new SQLiteAppointmentRepository(db);
    convRepo = new SqliteConversationRepository(db);
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
    const flow = new BookAppointmentFlow(appointmentRepo, convRepo, shopId, makeSlotsMock([]));
    const result = await flow.handle({ conversation: baseConversation, body: 'I want to book' });

    expect(result.nextState).toBe('booking');
    expect(result.reply).toContain('barber');
  });

  it('transitions from barber to service selection', async () => {
    const flow = new BookAppointmentFlow(appointmentRepo, convRepo, shopId, makeSlotsMock([]));
    const context = { step: 1, barberId };
    const conv = { ...baseConversation, context_json: JSON.stringify(context), state: 'booking' as ConversationState };

    const result = await flow.handle({ conversation: conv, body: '1' });

    expect(result.nextState).toBe('booking');
    expect(result.reply.toLowerCase()).toContain('servicio');
  });

  it('transitions from service to date selection', async () => {
    const flow = new BookAppointmentFlow(appointmentRepo, convRepo, shopId, makeSlotsMock([]));
    const context = { step: 2, barberId, serviceId };
    const conv = { ...baseConversation, context_json: JSON.stringify(context), state: 'booking' as ConversationState };

    const result = await flow.handle({ conversation: conv, body: '1' });

    expect(result.nextState).toBe('booking');
    expect(result.reply.toLowerCase()).toContain('fecha');
  });

  it('shows real slots after date selection', async () => {
    const mockSlots = makeSlotsMock(['09:00', '11:00', '14:30']);
    const flow = new BookAppointmentFlow(appointmentRepo, convRepo, shopId, mockSlots);
    const context = { step: 3, barberId, serviceId };
    const conv = { ...baseConversation, context_json: JSON.stringify(context), state: 'booking' as ConversationState };

    const result = await flow.handle({ conversation: conv, body: '1' });

    expect(result.nextState).toBe('booking');
    expect(result.reply).toContain('09:00');
    expect(result.reply).toContain('11:00');
    expect(result.reply).toContain('14:30');
    expect(mockSlots.execute).toHaveBeenCalledWith(
      expect.objectContaining({ barber_id: barberId, duration: 30 })
    );
  });

  it('stays on date step and prompts retry when no slots available', async () => {
    const mockSlots = makeSlotsMock([]);
    const flow = new BookAppointmentFlow(appointmentRepo, convRepo, shopId, mockSlots);
    const context = { step: 3, barberId, serviceId };
    const conv = { ...baseConversation, context_json: JSON.stringify(context), state: 'booking' as ConversationState };

    const result = await flow.handle({ conversation: conv, body: '1' });

    expect(result.nextState).toBe('booking');
    expect(result.reply.toLowerCase()).toMatch(/no hay|no available/);
    // Context step should not advance to 4 — user must pick another date
    expect((result.nextContext as any)?.step).toBe(3);
  });

  it('transitions from slot to confirmation with stored slots', async () => {
    const storedSlots = ['09:00', '11:00', '14:30'];
    const flow = new BookAppointmentFlow(appointmentRepo, convRepo, shopId, makeSlotsMock([]));
    const context = { step: 4, barberId, serviceId, date: '2099-01-15', availableSlots: storedSlots };
    const conv = { ...baseConversation, context_json: JSON.stringify(context), state: 'booking' as ConversationState };

    const result = await flow.handle({ conversation: conv, body: '2' }); // select 11:00

    expect(result.nextState).toBe('booking');
    expect(result.reply).toContain('11:00');
    expect(result.reply.toLowerCase()).toMatch(/confirmar|confirm/);
  });

  it('rejects invalid slot index', async () => {
    const storedSlots = ['09:00', '11:00'];
    const flow = new BookAppointmentFlow(appointmentRepo, convRepo, shopId, makeSlotsMock([]));
    const context = { step: 4, barberId, serviceId, date: '2099-01-15', availableSlots: storedSlots };
    const conv = { ...baseConversation, context_json: JSON.stringify(context), state: 'booking' as ConversationState };

    const result = await flow.handle({ conversation: conv, body: '5' }); // out of range

    expect(result.nextState).toBe('booking');
    expect(result.reply.toLowerCase()).toMatch(/inválida|invalid/);
  });
});
