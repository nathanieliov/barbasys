import { describe, it, expect } from 'vitest';
import db from '../db.js';
import { SqliteConversationRepository } from './sqlite-conversation-repository.js';

describe('SqliteConversationRepository', () => {
  const repo = new SqliteConversationRepository(db);

  it('creates a conversation', async () => {
    const id = await repo.create({
      wa_phone: '+18095551212',
      language: 'es',
      state: 'idle',
      customer_id: null,
    });
    expect(id).toBeGreaterThan(0);
  });

  it('finds conversation by phone', async () => {
    const id = await repo.create({
      wa_phone: '+11234567890',
      language: 'en',
      state: 'idle',
      customer_id: null,
    });
    const conv = await repo.findByPhone('+11234567890');
    expect(conv).not.toBeNull();
    expect(conv?.id).toBe(id);
    expect(conv?.wa_phone).toBe('+11234567890');
  });

  it('finds conversation by id', async () => {
    const id = await repo.create({
      wa_phone: '+15551234567',
      language: 'en',
      state: 'booking',
      customer_id: null,
    });
    const conv = await repo.findById(id);
    expect(conv).not.toBeNull();
    expect(conv?.id).toBe(id);
  });

  it('updates state and context', async () => {
    const id = await repo.create({
      wa_phone: '+15559876543',
      language: 'es',
      state: 'idle',
      customer_id: null,
    });
    const ctx = { step: 'pick_barber', options: ['barber1', 'barber2'] };
    await repo.updateState(id, 'booking', ctx);

    const conv = await repo.findById(id);
    expect(conv?.state).toBe('booking');
    expect(conv?.context_json).not.toBeNull();
    const parsed = JSON.parse(conv?.context_json || '{}');
    expect(parsed.step).toBe('pick_barber');
  });

  it('links customer to conversation', async () => {
    const customerId = db.prepare(
      `INSERT INTO customers (name, email, phone, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
    ).run('Test Customer', 'test@example.com', '+12125551234').lastInsertRowid as number;

    const id = await repo.create({
      wa_phone: '+15558899001',
      language: 'en',
      state: 'idle',
      customer_id: null,
    });
    await repo.linkCustomer(id, customerId);

    const conv = await repo.findById(id);
    expect(conv?.customer_id).toBe(customerId);
  });

  it('touches inbound timestamp', async () => {
    const id = await repo.create({
      wa_phone: '+15552233445',
      language: 'es',
      state: 'idle',
      customer_id: null,
    });
    await repo.touchInbound(id);

    const conv = await repo.findById(id);
    expect(conv?.last_inbound_at).not.toBeNull();
  });

  it('touches outbound timestamp', async () => {
    const id = await repo.create({
      wa_phone: '+15556677889',
      language: 'en',
      state: 'idle',
      customer_id: null,
    });
    await repo.touchOutbound(id);

    const conv = await repo.findById(id);
    expect(conv?.last_outbound_at).not.toBeNull();
  });
});
