import { test, expect } from '../fixtures/auth.js';
import { openTestDb, getBarberIdBySlug } from '../fixtures/db.js';

/**
 * E2E-12 — OWNER views the commissions report and the math matches the
 * seeded sales.
 *
 * Setup:
 *   - Insert a $25 Haircut sale for Ramón (service_commission_rate = 0.6).
 *   - Insert a $25 Haircut sale for Luis (service_commission_rate = 0.5).
 *   - Both sales default `timestamp = CURRENT_TIMESTAMP` so they fall under
 *     today's "Day" range — which is the Reports page default.
 *
 * Expected commission payouts (no tips, no products, COMMISSION model):
 *   - Ramón: 25 * 0.6 = 15.00
 *   - Luis:  25 * 0.5 = 12.50
 *
 * The frontend renders amounts via formatCurrency(amount, '$') — the seeded
 * shop_settings.currency_symbol is '$'. Intl.NumberFormat('es-DO', { currency:
 * 'DOP' }) emits "RD$" as the literal symbol, and the format util's
 * `.replace('DOP', symbol)` is a no-op here, so we expect "RD$15.00" and
 * "RD$12.50" on the page.
 */
test('E2E-12 · OWNER views commissions; numbers match seeded sales', async ({ asOwner }) => {
  const ramonId = getBarberIdBySlug('ramon');
  const luisId = getBarberIdBySlug('luis');

  const db = openTestDb();
  const haircut = db.prepare('SELECT id FROM services WHERE name = ?').get('Haircut') as { id: number };
  const shopRow = db.prepare('SELECT shop_id FROM barbers WHERE id = ?').get(ramonId) as { shop_id: number };

  const insertSale = (barberId: number, name: string) => {
    const sale = db.prepare(
      'INSERT INTO sales (barber_id, total_amount, shop_id, barber_name) VALUES (?, ?, ?, ?)'
    ).run(barberId, 25, shopRow.shop_id, name);
    const saleId = Number(sale.lastInsertRowid);
    db.prepare(
      'INSERT INTO sale_items (sale_id, item_id, type, price, item_name) VALUES (?, ?, ?, ?, ?)'
    ).run(saleId, haircut.id, 'service', 25, 'Haircut');
  };
  insertSale(ramonId, 'Ramón Pérez');
  insertSale(luisId, 'Luis Gómez');
  db.close();

  const page = await asOwner.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[browser-console-error]', msg.text());
  });
  page.on('pageerror', err => console.log('[browser-pageerror]', err.message));

  await page.goto('/reports');

  // Wait for the report data to load.
  await page.waitForResponse(
    res => res.url().includes('/api/reports') && res.request().method() === 'GET' && res.status() === 200,
    { timeout: 10_000 }
  );

  // Both formatted amounts should render somewhere on the page.
  await expect(page.getByText(/RD\$\s*15\.00/).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/RD\$\s*12\.50/).first()).toBeVisible({ timeout: 10_000 });

  // And both barbers should be named in the Team Performance / Earnings panels.
  await expect(page.getByText(/Ram[oó]n P[eé]rez/).first()).toBeVisible();
  await expect(page.getByText(/Luis G[oó]mez/).first()).toBeVisible();

  await page.close();
});
