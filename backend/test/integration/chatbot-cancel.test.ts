/**
 * INT-02 — POST /webhooks/whatsapp drives the multi-step `cancel` intent
 * flow to completion.
 *
 * Discovery: the production CancelFlow is a 3-step state machine driven by
 * NUMERIC selections — list upcoming appointments → pick "1" (target) →
 * confirm "1" (yes). The LLM only routes to the flow on each turn; its `args`
 * are NOT consumed by the flow itself. Therefore this test queues `cancel`
 * intent for every turn so each follow-up message keeps re-entering the
 * cancel flow, advancing the conversation context one step at a time, until
 * step 2 DELETEs the appointment row.
 *
 * Note: CancelFlow currently DELETEs the appointment rather than flipping
 * status to 'cancelled', so this test asserts on row absence (and on the
 * outbound confirmation message via FakeTwilioClient).
 */

// Bypass Twilio signature verification for tests. NODE_ENV=test already does
// this in the route, but set the explicit flag too for safety.
process.env.BYPASS_WEBHOOK_VERIFICATION = 'true';

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from './_setup.js';
import { fakeLLMScript } from '../../src/adapters/llm/fake-llm-client.js';
import { fakeTwilioOutbox } from '../../src/adapters/whatsapp/fake-twilio-client.js';

describe('INT-02 · POST /webhooks/whatsapp · cancel intent', () => {
  beforeEach(() => {
    fakeLLMScript.reset();
    fakeTwilioOutbox.clear();
  });

  it('drives the multi-step cancel flow and removes the scheduled appointment', async () => {
    const { db, app } = await buildApp();

    // Seed shop, customer, barber (with fullname — used in CancelFlow's JOIN),
    // service, and a future scheduled appointment.
    db.prepare('INSERT INTO shops (id, name) VALUES (1, ?)').run('Test Shop');
    db.prepare(
      "INSERT INTO customers (id, phone, shop_id, wa_opt_in, name) VALUES (1, ?, 1, 1, ?)"
    ).run('+18095550100', 'Test Customer');
    db.prepare(
      "INSERT INTO barbers (id, name, fullname, slug, shop_id, is_active, service_commission_rate) VALUES (1, ?, ?, ?, 1, 1, 0.5)"
    ).run('Ramon', 'Ramon Tester', 'ramon');
    db.prepare(
      'INSERT INTO services (id, name, price, duration_minutes, shop_id, is_active) VALUES (1, ?, 25, 30, 1, 1)'
    ).run('Haircut');

    // Future appointment (24h ahead) so the `date(start_time) >= date('now')`
    // filter in CancelFlow includes it.
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const inserted = db
      .prepare(
        `INSERT INTO appointments (barber_id, customer_id, service_id, start_time, status, shop_id)
         VALUES (1, 1, 1, ?, 'scheduled', 1)`
      )
      .run(future);
    const appointmentId = Number(inserted.lastInsertRowid);

    const phoneE164 = '+18095550100';
    const fromHeader = `whatsapp:${phoneE164}`;

    // Helper: queue a `cancel` intent + send an inbound WhatsApp message.
    let sidCounter = 0;
    const send = async (body: string) => {
      fakeLLMScript.queueIntent({ intent: 'cancel', args: {} });
      const res = await request(app)
        .post('/webhooks/whatsapp')
        .set('Content-Type', 'application/json')
        .send({
          From: fromHeader,
          To: 'whatsapp:+18005550000',
          Body: body,
          MessageSid: `SM-cancel-${++sidCounter}`,
        });
      expect(res.status).toBeLessThan(300);
      return res;
    };

    // Turn 1: open the cancel flow. Bot replies with the appointment list.
    await send('cancela mi cita');
    // Turn 2: pick appointment #1. Bot replies with confirmation prompt.
    await send('1');
    // Turn 3: confirm with "1" (yes). Bot deletes the appointment row.
    await send('1');

    // Appointment must be gone (CancelFlow uses DELETE, not status update).
    const remaining = db
      .prepare('SELECT id FROM appointments WHERE id = ?')
      .get(appointmentId);
    expect(remaining).toBeUndefined();

    // Outbound confirmation went through FakeTwilioClient.
    const outbound = fakeTwilioOutbox.byPhone(fromHeader);
    expect(outbound.length).toBeGreaterThan(0);
    const lastReply = outbound[outbound.length - 1].body;
    expect(lastReply).toMatch(/cancelad|cancelled/i);
  });
});
