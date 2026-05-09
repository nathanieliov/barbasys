import { test, expect } from '../fixtures/auth.js';
import { getJSON } from '../fixtures/api.js';

/**
 * E2E-09 — Walk-in POS sale (no customer attached).
 *
 * OWNER navigates to /pos, picks barber Ramón, adds a Haircut service ($25)
 * and a Pomade product ($12), opens the checkout modal WITHOUT filling any
 * customer email/phone, and submits. The success view ("¡Pago Exitoso!")
 * appears, and the persisted sale is verified via GET /api/sales:
 *   - total_amount = 37 (subtotal $37, tax 0%, no tip/discount)
 *   - customer_id = null
 *
 * Selectors notes (es-DO is the default locale):
 *   - The barber dropdown is a <select> with options labelled by `fullname`
 *     (e.g. "Ramón Pérez"). Use selectOption with a label regex.
 *   - Service & product tiles are <button class="svc-tile"> with the
 *     name/meta/price as text — accessible name matches /haircut/i / /pomade/i.
 *   - The "review & pay" trigger label in es-DO is "Review & Pagar"
 *     (key: pos.review_checkout). Match both locales defensively.
 *   - The final submit label in es-DO is "Completar Pago"
 *     (key: pos.complete_payment).
 *   - Success heading: "¡Pago Exitoso!" / "Payment Successful!"
 *     (key: pos.payment_successful).
 *   - The success view shows "no contact info" copy when neither email nor
 *     phone was captured — useful as an extra assertion that this was a
 *     walk-in sale.
 */
test('E2E-09 · Walk-in sale (no customer) completes and persists', async ({ asOwner, ownerToken }) => {
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
  // Note: the admin sidebar also contains a <select> (shop switcher), so the
  // barber select is NOT page.locator('select').first(). Find the one that
  // contains a Ramón <option>.
  // selectOption() doesn't accept a regex label — resolve to a value first.
  const barberSelect = page.locator('select', { has: page.locator('option', { hasText: /ram[oó]n p[eé]rez/i }) });
  await expect(barberSelect).toBeVisible();
  const ramonOption = barberSelect.locator('option', { hasText: /ram[oó]n p[eé]rez/i });
  const ramonValue = await ramonOption.getAttribute('value');
  expect(ramonValue, 'expected to find a Ramón <option> in the barber select').toBeTruthy();
  await barberSelect.selectOption(ramonValue!);

  // ── Add Haircut service ───────────────────────────────────
  await page.getByRole('button', { name: /haircut/i }).first().click();

  // ── Add Pomade product ────────────────────────────────────
  await page.getByRole('button', { name: /pomade/i }).first().click();

  // ── Verify cart total is $37.00 ───────────────────────────
  // The cart summary renders the total inside the sticky cart card. The
  // currency symbol from seed is "$", but settings render it as "RD$"
  // (Spanish-DR formatCurrency convention). Match either.
  await expect(page.getByText(/(?:RD)?\$\s*37\.00/).first()).toBeVisible();

  // ── Open the checkout modal ───────────────────────────────
  await page.getByRole('button', { name: /review.*pagar|review.*checkout|review/i }).click();

  // The modal should be visible — assert "Pagar" / "Checkout" heading.
  await expect(page.getByRole('heading', { name: /^pagar$|^checkout$/i })).toBeVisible({ timeout: 5_000 });

  // ── Walk-in: do NOT fill customer email/phone. Submit directly. ──
  // Wait for the POST /api/sales response after clicking complete payment.
  const saleResponse = page.waitForResponse(
    res => res.url().includes('/api/sales') && res.request().method() === 'POST',
    { timeout: 10_000 }
  );
  await page.getByRole('button', { name: /completar pago|complete payment/i }).click();
  const saleResp = await saleResponse;
  expect(saleResp.status(), 'POST /api/sales should return 200').toBe(200);

  const saleBody = await saleResp.json();
  expect(saleBody.saleId, 'response should contain a numeric saleId').toBeGreaterThan(0);

  // ── Success view ──────────────────────────────────────────
  await expect(
    page.getByRole('heading', { name: /pago exitoso|payment successful/i })
  ).toBeVisible({ timeout: 10_000 });

  // Confirms walk-in: the "no contact info" message is rendered when neither
  // email nor phone was provided to the sale.
  await expect(
    page.getByText(/no contact info|sin información de contacto/i)
  ).toBeVisible();

  // ── DB-via-API assertion ──────────────────────────────────
  const sales = await getJSON(ownerToken, '/api/sales');
  expect(sales.status).toBe(200);
  const all = sales.body as Array<{ id: number; total_amount: number; customer_id: number | null }>;
  const recent = [...all].sort((a, b) => b.id - a.id)[0];
  expect(recent.id).toBe(saleBody.saleId);
  expect(recent.total_amount).toBeCloseTo(37, 2);
  expect(recent.customer_id).toBeNull();

  await page.close();
});
