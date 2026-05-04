import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import db from '../db.js';
import { SqliteConversationRepository } from '../repositories/sqlite-conversation-repository.js';
import { SqliteWaMessageRepository } from '../repositories/sqlite-wa-message-repository.js';

describe('POST /webhooks/whatsapp', () => {
  const authToken = 'test-auth-token';

  beforeAll(() => {
    process.env.TWILIO_AUTH_TOKEN = authToken;
  });

  it('parses inbound, resolves customer, returns 200 with result', async () => {
    const from = '+15559876543';
    const body = 'Test message';
    const messageSid = 'SM_test_' + Date.now();

    const payload = {
      From: `whatsapp:${from}`,
      To: '+11234567890',
      Body: body,
      MessageSid: messageSid,
    };

    const res = await request(app)
      .post('/webhooks/whatsapp')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.customerId).toBeGreaterThan(0);
    expect(res.body.conversationId).toBeGreaterThan(0);
    expect(res.body.inboundMessageId).toBeGreaterThan(0);
  });

  it('persists conversation and message to database', async () => {
    const from = '+15551111111';
    const body = 'Persist test';
    const messageSid = 'SM_persist_' + Date.now();

    const payload = {
      From: `whatsapp:${from}`,
      To: '+11234567890',
      Body: body,
      MessageSid: messageSid,
    };

    const res = await request(app)
      .post('/webhooks/whatsapp')
      .send(payload);

    expect(res.status).toBe(200);
    const conversationId = res.body.conversationId;

    const convRepo = new SqliteConversationRepository(db);
    const conv = await convRepo.findById(conversationId);
    expect(conv).not.toBeNull();
    expect(conv?.wa_phone).toBe(from);

    const msgRepo = new SqliteWaMessageRepository(db);
    const msg = await msgRepo.findBySid(messageSid);
    expect(msg).not.toBeNull();
    expect(msg?.body).toBe(body);
    expect(msg?.direction).toBe('in');
  });
});
