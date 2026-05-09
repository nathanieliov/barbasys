/**
 * INT-01 — POST /api/chatbot/webhooks/whatsapp drives the multi-step `book`
 * intent flow to completion.
 *
 * Discovery: the production BookAppointmentFlow is a 5-step state machine
 * driven by NUMERIC selections (1, 2, 3, ...) — barber → service → date →
 * slot → confirm. The LLM only routes to the flow on each turn; its `args`
 * are NOT consumed by the flow itself. Therefore this test queues `book`
 * intent for every turn so each follow-up message keeps re-entering the
 * book flow, advancing the conversation context one step at a time, until
 * the final confirmation creates the appointment row.
 */

// Bypass Twilio signature verification for tests. NODE_ENV=test already does this
// in the route, but set the explicit flag too for safety.
process.env.BYPASS_WEBHOOK_VERIFICATION = 'true';

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from './_setup.js';
import { fakeLLMScript } from '../../src/adapters/llm/fake-llm-client.js';
import { fakeTwilioOutbox } from '../../src/adapters/whatsapp/fake-twilio-client.js';

describe('INT-01 · POST /api/chatbot/webhooks/whatsapp · book intent', () => {
  beforeEach(() => {
    fakeLLMScript.reset();
    fakeTwilioOutbox.clear();
  });

  it('drives the multi-step book flow and creates an appointment', async () => {
    const { db, app } = await buildApp();

    // Seed shop, customer, barber, service, full-week shifts.
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
    // Shifts every day (0..6) so any date in buildDateList works.
    for (let d = 0; d <= 6; d++) {
      db.prepare(
        'INSERT INTO barber_shifts (barber_id, day_of_week, start_time, end_time) VALUES (1, ?, ?, ?)'
      ).run(d, '09:00', '18:00');
    }

    const phoneE164 = '+18095550100';
    const fromHeader = `whatsapp:${phoneE164}`;

    // Helper: queue a `book` intent + send an inbound WhatsApp message.
    let sidCounter = 0;
    const send = async (body: string) => {
      fakeLLMScript.queueIntent({ intent: 'book', args: {} });
      // NOTE: Twilio sends application/x-www-form-urlencoded, but the Express
      // app only mounts `express.json()`. Until urlencoded is wired in, send
      // JSON — `parseTwilioInbound` is body-shape-agnostic.
      const res = await request(app)
        .post('/webhooks/whatsapp')
        .set('Content-Type', 'application/json')
        .send({
          From: fromHeader,
          To: 'whatsapp:+18005550000',
          Body: body,
          MessageSid: `SM-test-${++sidCounter}`,
        });
      expect(res.status).toBeLessThan(300);
      return res;
    };

    // Turn 1: opens the book flow (any text). Bot replies with barber list.
    await send('quiero una cita');
    // Turn 2: pick barber #1 (Ramon). Bot replies with service list.
    await send('1');
    // Turn 3: pick service #1 (Haircut). Bot replies with date list.
    await send('1');
    // Turn 4: pick date #3 (two days from today — robust against past-slot
    // filtering at any wall-clock time). Bot replies with slot list.
    await send('3');
    // Turn 5: pick first available slot. Bot replies with confirmation prompt.
    await send('1');
    // Turn 6: confirm (1). Bot creates the appointment and replies success.
    await send('1');

    // The appointment must exist and reference our barber + customer.
    const appts = db
      .prepare('SELECT * FROM appointments')
      .all() as Array<{ barber_id: number; customer_id: number; shop_id: number; service_id: number }>;
    expect(appts.length).toBe(1);
    expect(appts[0].barber_id).toBe(1);
    expect(appts[0].customer_id).toBe(1);
    expect(appts[0].shop_id).toBe(1);
    expect(appts[0].service_id).toBe(1);

    // Outbound confirmation message went through FakeTwilioClient.
    const outbound = fakeTwilioOutbox.byPhone(fromHeader);
    expect(outbound.length).toBeGreaterThan(0);
    // Final reply should mention the new appointment id (formatted "#<id>").
    const lastReply = outbound[outbound.length - 1].body;
    expect(lastReply).toMatch(/#\d+/);
  });
});
