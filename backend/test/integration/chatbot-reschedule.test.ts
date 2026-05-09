/**
 * INT-03 — POST /webhooks/whatsapp drives the multi-step `reschedule` intent
 * flow to completion.
 *
 * Discovery: the production RescheduleFlow is a 7-step state machine (steps
 * 0..6) driven by NUMERIC selections — list upcoming appointments → pick
 * appointment → pick barber → pick service → pick date → pick slot → confirm.
 * The LLM only routes to the flow on each turn; its `args` are NOT consumed
 * by the flow itself. Therefore this test queues `reschedule` intent for
 * every turn so each follow-up message keeps re-entering the reschedule
 * flow, advancing the conversation context one step at a time, until step 6
 * UPDATEs the appointment row's barber_id, service_id, and start_time.
 */

// Bypass Twilio signature verification for tests. NODE_ENV=test already does
// this in the route, but set the explicit flag too for safety.
process.env.BYPASS_WEBHOOK_VERIFICATION = 'true';

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from './_setup.js';
import { fakeLLMScript } from '../../src/adapters/llm/fake-llm-client.js';
import { fakeTwilioOutbox } from '../../src/adapters/whatsapp/fake-twilio-client.js';

describe('INT-03 · POST /webhooks/whatsapp · reschedule intent', () => {
  beforeEach(() => {
    fakeLLMScript.reset();
    fakeTwilioOutbox.clear();
  });

  it('drives the multi-step reschedule flow and updates the appointment start_time', async () => {
    const { db, app } = await buildApp();

    // Seed shop, customer, barber (with fullname — used in RescheduleFlow's
    // JOIN), service, and full-week shifts so any date in buildDateList works.
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
    for (let d = 0; d <= 6; d++) {
      db.prepare(
        'INSERT INTO barber_shifts (barber_id, day_of_week, start_time, end_time) VALUES (1, ?, ?, ?)'
      ).run(d, '09:00', '18:00');
    }

    // Future appointment (24h ahead) so the `date(start_time) >= date('now')`
    // filter in RescheduleFlow includes it.
    const oldStart = new Date(Date.now() + 86_400_000).toISOString();
    const inserted = db
      .prepare(
        `INSERT INTO appointments (barber_id, customer_id, service_id, start_time, status, shop_id)
         VALUES (1, 1, 1, ?, 'scheduled', 1)`
      )
      .run(oldStart);
    const appointmentId = Number(inserted.lastInsertRowid);

    const phoneE164 = '+18095550100';
    const fromHeader = `whatsapp:${phoneE164}`;

    // Helper: queue a `reschedule` intent + send an inbound WhatsApp message.
    let sidCounter = 0;
    const send = async (body: string) => {
      fakeLLMScript.queueIntent({ intent: 'reschedule', args: {} });
      // NOTE: Twilio sends application/x-www-form-urlencoded, but the Express
      // app only mounts `express.json()`. Sending JSON works because
      // `parseTwilioInbound` is body-shape-agnostic.
      const res = await request(app)
        .post('/webhooks/whatsapp')
        .set('Content-Type', 'application/json')
        .send({
          From: fromHeader,
          To: 'whatsapp:+18005550000',
          Body: body,
          MessageSid: `SM-resched-${++sidCounter}`,
        });
      expect(res.status).toBeLessThan(300);
      return res;
    };

    // Turn 1: opens the reschedule flow. Bot replies with appointment list.
    await send('cambiar mi cita');
    // Turn 2: pick appointment #1. Bot replies with barber list.
    await send('1');
    // Turn 3: pick barber #1. Bot replies with service list.
    await send('1');
    // Turn 4: pick service #1. Bot replies with date list.
    await send('1');
    // Turn 5: pick date #3 (two days from today — robust against past-slot
    // filtering at any wall-clock time). Bot replies with slot list.
    await send('3');
    // Turn 6: pick first available slot. Bot replies with confirmation prompt.
    await send('1');
    // Turn 7: confirm (1). Bot updates the appointment.
    await send('1');

    // The appointment's start_time must have changed.
    const updated = db
      .prepare('SELECT start_time FROM appointments WHERE id = ?')
      .get(appointmentId) as { start_time: string };
    expect(updated).toBeDefined();
    expect(updated.start_time).not.toBe(oldStart);

    // Outbound confirmation went through FakeTwilioClient.
    const outbound = fakeTwilioOutbox.byPhone(fromHeader);
    expect(outbound.length).toBeGreaterThan(0);
    const lastReply = outbound[outbound.length - 1].body;
    expect(lastReply).toMatch(/reprogramad|rescheduled/i);
  });
});
