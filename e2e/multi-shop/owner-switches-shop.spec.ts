import { test, expect } from '@playwright/test';
import { loginViaApi, getJSON } from '../fixtures/api.js';

/**
 * E2E-13 — Multi-shop data isolation.
 *
 * The schema does not allow a single user to span multiple shops
 * (`users.shop_id` is a single FK), so we cannot exercise an in-app
 * "shop switcher". Instead we verify the underlying property the
 * switcher would protect: each shop's OWNER sees ONLY that shop's
 * data.
 *
 * The seed creates two shops:
 *   - Shop A "Barbería Test"   → owner=`owner`,   services: Haircut/Beard Trim/Combo
 *   - Shop B "Barbería Test 2" → owner=`owner_b`, service:  Shop B Cut
 *
 * API checks (definitive):
 *   - /api/auth/me reports a different shop_id for each owner
 *   - /api/services for owner A includes Haircut and excludes "Shop B Cut"
 *   - /api/services for owner B includes "Shop B Cut" and excludes Haircut
 *
 * UI smoke check:
 *   - Logging in as owner A and visiting /catalog (Services tab is the
 *     default) shows Haircut but NOT "Shop B Cut".
 */
test('E2E-13 · OWNER for two shops sees data scoped per shop', async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[browser-console-error]', msg.text());
  });
  page.on('pageerror', err => console.log('[browser-pageerror]', err.message));

  // ── API: Login both owners ─────────────────────────────────
  const ownerA = await loginViaApi('owner', 'TestPass123!');
  const ownerB = await loginViaApi('owner_b', 'TestPass123!');

  // ── API: /auth/me reports different shop_ids ──────────────
  const aMe = await getJSON(ownerA.token, '/api/auth/me');
  const bMe = await getJSON(ownerB.token, '/api/auth/me');
  expect(aMe.status, '/auth/me for owner A').toBe(200);
  expect(bMe.status, '/auth/me for owner B').toBe(200);
  expect(aMe.body.shop_id).toBeTruthy();
  expect(bMe.body.shop_id).toBeTruthy();
  expect(aMe.body.shop_id).not.toBe(bMe.body.shop_id);

  // ── API: services list is scoped per shop ─────────────────
  const aServices = await getJSON(ownerA.token, '/api/services');
  expect(aServices.status).toBe(200);
  const aNames = (aServices.body as Array<{ name: string }>).map(s => s.name);
  expect(aNames).toContain('Haircut');
  expect(aNames).not.toContain('Shop B Cut');

  const bServices = await getJSON(ownerB.token, '/api/services');
  expect(bServices.status).toBe(200);
  const bNames = (bServices.body as Array<{ name: string }>).map(s => s.name);
  expect(bNames).toContain('Shop B Cut');
  expect(bNames).not.toContain('Haircut');

  // ── UI smoke: Shop A owner only sees Shop A services in /catalog ──
  await page.goto('/login');
  await page.locator('#username').fill('owner');
  await page.locator('#password').fill('TestPass123!');

  const loginResponse = page.waitForResponse(
    res => res.url().includes('/auth/login') && res.request().method() === 'POST'
  );
  await page.getByRole('button', { name: /sign in|iniciar|ingresar|entrar/i }).click();
  const loginResp = await loginResponse;
  expect(loginResp.status(), 'login API should return 200').toBe(200);

  await expect(page).toHaveURL(/\/$/);

  // Navigate to Catalog and wait for /api/services to populate (default tab is Services).
  await page.goto('/catalog');
  await page.waitForResponse(
    res => res.url().includes('/api/services') && res.request().method() === 'GET' && res.status() === 200,
    { timeout: 10_000 }
  );

  // Shop A's "Haircut" must be visible in the catalog table.
  await expect(page.getByText(/^Haircut$/).first()).toBeVisible();

  // Shop B's "Shop B Cut" must NOT appear anywhere on the page.
  await expect(page.getByText('Shop B Cut')).toHaveCount(0);
});
