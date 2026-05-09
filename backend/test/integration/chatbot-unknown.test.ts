/**
 * INT-04 — POST /webhooks/whatsapp falls back to a menu reply when the LLM
 * classifies the inbound message as `unknown`.
 *
 * Single turn, no flow state machine. Verifies that:
 *   1. The endpoint accepts the request (HTTP < 300).
 *   2. No appointment row is created (unknown intent must NOT mutate domain
 *      tables).
 *   3. An outbound WhatsApp text was sent through FakeTwilioClient with a
 *      non-empty body (the i18n menu fallback).
 */

// Bypass Twilio signature verification for tests. NODE_ENV=test already does
// this in the route, but set the explicit flag too for safety.
process.env.BYPASS_WEBHOOK_VERIFICATION = 'true';

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from './_setup.js';
import { fakeLLMScript } from '../../src/adapters/llm/fake-llm-client.js';
import { fakeTwilioOutbox } from '../../src/adapters/whatsapp/fake-twilio-client.js';

describe('INT-04 · POST /webhooks/whatsapp · unknown intent fallback', () => {
  beforeEach(() => {
    fakeLLMScript.reset();
    fakeTwilioOutbox.clear();
  });

  it('returns a fallback message and writes nothing to appointments', async () => {
    const { db, app } = await buildApp();

    db.prepare('INSERT INTO shops (id, name) VALUES (1, ?)').run('Test Shop');
    db.prepare(
      'INSERT INTO customers (id, phone, shop_id, wa_opt_in, name) VALUES (1, ?, 1, 1, ?)'
    ).run('+18095550100', 'Test Customer');

    fakeLLMScript.queueIntent({ intent: 'unknown', args: {} });

    const res = await request(app)
      .post('/webhooks/whatsapp')
      .set('Content-Type', 'application/json')
      .send({
        From: 'whatsapp:+18095550100',
        To: 'whatsapp:+18005550000',
        Body: 'qué hay de nuevo',
        MessageSid: 'SM-unknown-1',
      });

    expect(res.status).toBeLessThan(300);

    // No appointments created — unknown intent is a pure read/reply path.
    const apptCount = (
      db.prepare('SELECT COUNT(*) AS n FROM appointments').get() as { n: number }
    ).n;
    expect(apptCount).toBe(0);

    // Fallback message went out via FakeTwilioClient. Soft body assertion —
    // any non-empty string keeps us decoupled from i18n copy churn.
    expect(fakeTwilioOutbox.messages.length).toBeGreaterThan(0);
    const lastReply = fakeTwilioOutbox.messages[fakeTwilioOutbox.messages.length - 1];
    expect(lastReply.body.length).toBeGreaterThan(0);
    expect(lastReply.to).toBe('whatsapp:+18095550100');
  });
});
