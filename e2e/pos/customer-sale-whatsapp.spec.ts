import { test, expect } from '../fixtures/auth.js';
import { apiCtx } from '../fixtures/api.js';

/**
 * E2E-10 — Customer POS sale with WhatsApp receipt.
 *
 * OWNER opens /pos, picks barber Ramón, adds a Haircut, attaches the seeded
 * customer's phone (+18095550100), and completes the sale. The seeded customer
 * has wa_opt_in=1 plus a recent inbound conversation (see seed-test.ts), which
 * routes ProcessSale → sendReceipt → WhatsApp.
 *
 * In FAKE_TWILIO=1 mode the WhatsApp client is the in-memory FakeTwilioClient
 * whose outbox is exposed by the test-only /api/test/twilio-outbox endpoint
 * (also gated on FAKE_TWILIO=1). The test asserts a WhatsApp message was
 * delivered to whatsapp:+18095550100.
 */
test('E2E-10 · Customer sale with phone triggers WhatsApp receipt', async ({ asOwner }) => {
  // Reset the FakeTwilio outbox so prior tests/runs don't leak messages.
  const ctx = await apiCtx();
  const clearRes = await ctx.post('/api/test/twilio-outbox/clear');
  expect(clearRes.status(), 'twilio-outbox/clear should be 204').toBe(204);

  const page = await asOwner.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[browser-console-error]', msg.text());
  });
  page.on('pageerror', err => console.log('[browser-pageerror]', err.message));

  await page.goto('/pos');

  // Wait for the POS page's data fetches to populate barbers, services, products.
  await page.waitForResponse(
    res => res.url().includes('/api/barbers') && res.request().method() === 'GET' && res.status() === 200,
    { timeout: 10_000 }
  );
  await page.waitForResponse(
    res => res.url().includes('/api/services') && res.request().method() === 'GET' && res.status() === 200,
    { timeout: 10_000 }
  );
  await page.waitForResponse(
    res => res.url().includes('/api/inventory') && res.request().method() === 'GET' && res.status() === 200,
    { timeout: 10_000 }
  );

  // ── Pick barber Ramón ─────────────────────────────────────
  // Resolve the barber select by locating the one with a Ramón option (the
  // sidebar shop switcher is also a <select>, so .first() is unsafe).
  const barberSelect = page.locator('select', { has: page.locator('option', { hasText: /ram[oó]n p[eé]rez/i }) });
  await expect(barberSelect).toBeVisible();
  const ramonOption = barberSelect.locator('option', { hasText: /ram[oó]n p[eé]rez/i });
  const ramonValue = await ramonOption.getAttribute('value');
  expect(ramonValue, 'expected to find a Ramón <option> in the barber select').toBeTruthy();
  await barberSelect.selectOption(ramonValue!);

  // ── Add Haircut service ───────────────────────────────────
  await page.getByRole('button', { name: /haircut/i }).first().click();

  // ── Open the checkout modal ───────────────────────────────
  await page.getByRole('button', { name: /review.*pagar|review.*checkout|review/i }).click();

  await expect(page.getByRole('heading', { name: /^pagar$|^checkout$/i })).toBeVisible({ timeout: 5_000 });

  // ── Attach the seeded customer's phone (type=tel input in the modal) ──
  const phoneInput = page.locator('input[type="tel"]').first();
  await phoneInput.fill('+18095550100');

  // ── Submit and wait for POST /api/sales ───────────────────
  const saleResponse = page.waitForResponse(
    res => res.url().includes('/api/sales') && res.request().method() === 'POST',
    { timeout: 10_000 }
  );
  await page.getByRole('button', { name: /completar pago|complete payment/i }).click();
  const saleResp = await saleResponse;
  expect(saleResp.status(), 'POST /api/sales should return 200').toBe(200);
  const saleBody = await saleResp.json();
  expect(saleBody.saleId, 'response should contain a numeric saleId').toBeGreaterThan(0);

  await expect(
    page.getByRole('heading', { name: /pago exitoso|payment successful/i })
  ).toBeVisible({ timeout: 10_000 });

  // ── Assert FakeTwilio outbox recorded the WhatsApp receipt ───
  // sendReceipt is async (fire-and-forget after sale insert); poll briefly.
  let messages: Array<{ to: string; body: string; kind: string }> = [];
  for (let i = 0; i < 20; i++) {
    const outboxRes = await ctx.get('/api/test/twilio-outbox');
    expect(outboxRes.ok(), 'twilio-outbox GET should be 200').toBe(true);
    messages = await outboxRes.json();
    if (messages.length > 0) break;
    await new Promise(r => setTimeout(r, 200));
  }

  expect(messages.length, 'FakeTwilio outbox should have at least one message').toBeGreaterThanOrEqual(1);
  const target = messages.find(m => m.to === 'whatsapp:+18095550100');
  expect(target, 'expected a WhatsApp message addressed to whatsapp:+18095550100').toBeDefined();

  await ctx.dispose();
  await page.close();
});
