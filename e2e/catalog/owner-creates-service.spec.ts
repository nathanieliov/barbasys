import { test, expect } from '../fixtures/auth.js';

/**
 * E2E-11 — OWNER creates a service through the admin UI; the new service then
 * appears in the public booking flow's SERVICE step.
 *
 * Flow:
 *   1. Authenticated as OWNER, navigate to /catalog (Services tab is the default).
 *   2. Click the "New service" / "Nuevo servicio" affordance — Catalog.tsx routes
 *      this to the /services page where the actual create form lives.
 *   3. Open the modal via "Add new service" / "Agregar Nuevo Servicio", fill the
 *      form (name, description, price, duration), and submit.
 *   4. Assert the new service is visible in the /services list AND in /catalog.
 *   5. In a fresh anonymous browser context, walk the public booking flow up to
 *      the SERVICE step and assert the new service is rendered as an option.
 *
 * Notes:
 *   - The Catalog page itself has no inline create form; the "New service"
 *     button on /catalog navigates to /services. We follow that real user path.
 *   - Service name uses Date.now() to avoid collision with seeded "Haircut",
 *     "Beard Trim", "Combo".
 *   - In BookingFlow.tsx services render as <button class="option-card">, so
 *     getByRole('button', { name: ... }) matches them (mirrors E2E-05/E2E-06).
 */
test('E2E-11 · OWNER creates service; service appears in public booking flow', async ({ asOwner, browser }) => {
  const serviceName = `Test Trim ${Date.now()}`;

  // ── 1) OWNER creates the service via the admin UI ─────────────────
  const ownerPage = await asOwner.newPage();
  ownerPage.on('console', msg => {
    if (msg.type() === 'error') console.log('[browser-console-error]', msg.text());
  });
  ownerPage.on('pageerror', err => console.log('[browser-pageerror]', err.message));

  // Land on /catalog. Services is the default tab; Catalog.tsx fires GET
  // /api/services on mount. Wait for the "New service" button to appear before
  // clicking — its presence implies the page has rendered.
  await ownerPage.goto('/catalog');
  const newServiceBtn = ownerPage.getByRole('button', { name: /^new service$|^nuevo servicio$/i });
  await expect(newServiceBtn).toBeVisible({ timeout: 10_000 });

  // The "New service" button on /catalog navigates to /services where the
  // create form lives. Trigger that real navigation.
  const servicesGet = ownerPage.waitForResponse(
    res => res.url().includes('/api/services') && res.request().method() === 'GET' && res.status() === 200,
    { timeout: 10_000 }
  );
  await newServiceBtn.first().click();
  await expect(ownerPage).toHaveURL(/\/services$/);
  await servicesGet;

  // Open the create modal.
  await ownerPage.getByRole('button', { name: /add new service|agregar nuevo servicio/i }).first().click();

  // Modal: heading is "Add New Service" / "Agregar Nuevo Servicio".
  const dialogHeading = ownerPage.getByRole('heading', { name: /add new service|agregar nuevo servicio/i });
  await expect(dialogHeading).toBeVisible({ timeout: 5_000 });

  // Fill the form. The Services modal uses unlabeled inputs:
  //   - name: <input type="text"> (first text input)
  //   - description: <textarea>
  //   - price: <input type="number" step="0.01">
  //   - duration: <input type="number" min="1"> with default value "30"
  await ownerPage.locator('input[type="text"]').first().fill(serviceName);
  await ownerPage.locator('textarea').first().fill('E2E-created test service');
  await ownerPage.locator('input[type="number"]').nth(0).fill('20');
  await ownerPage.locator('input[type="number"]').nth(1).fill('25');

  // Submit and wait for both the POST and the post-create refetch GET.
  const createResp = ownerPage.waitForResponse(
    res => res.url().endsWith('/api/services') && res.request().method() === 'POST',
    { timeout: 10_000 }
  );
  const refetchResp = ownerPage.waitForResponse(
    res => res.url().includes('/api/services') && res.request().method() === 'GET' && res.status() === 200,
    { timeout: 10_000 }
  );
  await ownerPage.getByRole('button', { name: /confirm service|confirmar servicio/i }).first().click();
  const cr = await createResp;
  expect(cr.status(), 'POST /api/services should succeed').toBeLessThan(300);
  await refetchResp;

  // The new service must be rendered as a card heading in /services.
  await expect(ownerPage.getByRole('heading', { name: serviceName }).first()).toBeVisible({ timeout: 5_000 });

  // Cross-check: the service is also visible in /catalog (Services tab).
  const catalogResp = ownerPage.waitForResponse(
    res => res.url().includes('/api/services') && res.request().method() === 'GET' && res.status() === 200,
    { timeout: 10_000 }
  );
  await ownerPage.goto('/catalog');
  await catalogResp;
  await expect(ownerPage.getByText(serviceName).first()).toBeVisible();
  await ownerPage.close();

  // ── 2) Public booking flow: the new service is an option ──────────
  const anon = await browser.newContext();
  const guestPage = await anon.newPage();
  guestPage.on('console', msg => {
    if (msg.type() === 'error') console.log('[browser-console-error]', msg.text());
  });
  guestPage.on('pageerror', err => console.log('[browser-pageerror]', err.message));

  await guestPage.goto('/discovery');
  await guestPage.waitForResponse(
    res => res.url().includes('/api/public/shops') && res.request().method() === 'GET' && res.status() === 200,
    { timeout: 10_000 }
  );

  // Reservar Ahora on the seeded Shop A card opens the booking flow.
  await guestPage.getByRole('button', { name: /reservar (ahora|now)/i }).first().click();

  // Step 0 — Barber. Pick "Cualquier barbero" / "Any available" to advance.
  await expect(guestPage.getByRole('heading', { name: /elija un profesional|pick your barber/i })).toBeVisible({ timeout: 10_000 });
  await guestPage.getByText(/cualquier barbero|any available/i).first().click();
  await guestPage.getByRole('button', { name: /continuar|continue/i }).click();

  // Step 1 — Service. Assert the new service is selectable.
  // The heading is `t('booking.select_services', 'What are we doing today?')`.
  // es-DO renders "Seleccionar Servicios"; the en-US fallback / source string is
  // "Select Services" / "What are we doing today?". Match any of them.
  await expect(
    guestPage.getByRole('heading', { name: /seleccionar servicios|select services|what are we doing/i })
  ).toBeVisible({ timeout: 5_000 });
  await expect(guestPage.getByRole('button', { name: new RegExp(serviceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first()).toBeVisible();

  await anon.close();
});
