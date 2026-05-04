import { describe, it, expect } from 'vitest';
import db from '../db.js';
import { SqliteWaMessageRepository } from './sqlite-wa-message-repository.js';
import { SqliteConversationRepository } from './sqlite-conversation-repository.js';

describe('SqliteWaMessageRepository', () => {
  const convRepo = new SqliteConversationRepository(db);
  const msgRepo = new SqliteWaMessageRepository(db);

  let convId: number;

  it('creates conversation for tests', async () => {
    convId = await convRepo.create({
      wa_phone: '+18095551212',
      language: 'es',
      state: 'idle',
      customer_id: null,
    });
    expect(convId).toBeGreaterThan(0);
  });

  it('records inbound message', async () => {
    const id = await msgRepo.recordInbound({
      conversation_id: convId,
      wa_message_sid: 'SM001',
      body: 'Hello',
      media_url: null,
      raw_payload_json: '{}',
    });
    expect(id).toBeGreaterThan(0);
  });

  it('returns null on duplicate inbound SID', async () => {
    await msgRepo.recordInbound({
      conversation_id: convId,
      wa_message_sid: 'SM002',
      body: 'First',
      media_url: null,
      raw_payload_json: null,
    });
    const id = await msgRepo.recordInbound({
      conversation_id: convId,
      wa_message_sid: 'SM002',
      body: 'Duplicate',
      media_url: null,
      raw_payload_json: null,
    });
    expect(id).toBeNull();
  });

  it('records outbound message', async () => {
    const id = await msgRepo.recordOutbound({
      conversation_id: convId,
      wa_message_sid: 'SM_OUT_001',
      body: 'We have availability',
      status: 'queued',
    });
    expect(id).toBeGreaterThan(0);
  });

  it('sets intent on message', async () => {
    const id = await msgRepo.recordInbound({
      conversation_id: convId,
      wa_message_sid: 'SM003',
      body: 'Book an appointment',
      media_url: null,
      raw_payload_json: null,
    });
    await msgRepo.setIntent(id!, 'book');

    const msg = await msgRepo.findBySid('SM003');
    expect(msg?.intent).toBe('book');
  });

  it('finds message by SID', async () => {
    await msgRepo.recordInbound({
      conversation_id: convId,
      wa_message_sid: 'SM004',
      body: 'Test find',
      media_url: null,
      raw_payload_json: null,
    });

    const msg = await msgRepo.findBySid('SM004');
    expect(msg).not.toBeNull();
    expect(msg?.body).toBe('Test find');
    expect(msg?.direction).toBe('in');
  });

  it('counts recent inbound messages by phone', async () => {
    const now = new Date().toISOString();
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

    await msgRepo.recordInbound({
      conversation_id: convId,
      wa_message_sid: 'SM005',
      body: 'Msg1',
      media_url: null,
      raw_payload_json: null,
    });
    await msgRepo.recordInbound({
      conversation_id: convId,
      wa_message_sid: 'SM006',
      body: 'Msg2',
      media_url: null,
      raw_payload_json: null,
    });

    const count = await msgRepo.countRecentInbound('+18095551212', oneMinuteAgo);
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
