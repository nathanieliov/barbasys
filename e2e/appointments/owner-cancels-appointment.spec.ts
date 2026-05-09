import { test, expect } from '../fixtures/auth.js';
import { getJSON } from '../fixtures/api.js';
import { openTestDb, getBarberIdBySlug } from '../fixtures/db.js';

/**
 * E2E-08 — OWNER cancels an existing appointment from the Schedule page.
 *
 * Flow:
 *   1. Pre-create a `scheduled` appointment in the DB for tomorrow (skipping
 *      weekends — only Mon-Fri shifts seeded) at 10:00 for Ramón / Haircut.
 *   2. OWNER navigates to /schedule, changes the top-level date input to the
 *      target date, and waits for the appointment list to load.
 *   3. Clicks the appointment block (a <div className="appt …"> rendered in
 *      the schedule grid). This opens the appointment-detail Modal.
 *   4. Inside the modal, clicks the "Cancelar" button. The handler calls
 *      `window.prompt()` for a reason — Playwright must accept the dialog
 *      before the POST fires.
 *   5. Waits for POST /api/appointments/:id/cancel to return 2xx.
 *   6. Verifies via API GET /api/appointments/:id that status === 'cancelled'.
 *
 * Selector notes (es-DO):
 *   - The Schedule date filter is the only `input[type="date"]` outside the
 *     booking modal. We scope the locator to the page-head area / page root.
 *   - The appointment block has class "appt" and shows the customer / service
 *     text. Walk-in fallback shows the i18n key for "Walk-in"; we click the
 *     first appointment block on the page since we control which exists.
 *   - The cancel button uses key common.cancel = "Cancelar" (es-DO).
 *   - The detail modal heading is the customer_name OR walk-in label, both
 *     differ from the booking modal heading "Nueva Cita", so we can wait on
 *     the dialog by ensuring the in-chair / cancel buttons are present.
 */
test('E2E-08 · OWNER cancels appointment; status becomes cancelled', async ({ asOwner, ownerToken }) => {
  // ── Pick target date: tomorrow, skipping weekends ─────────
  const target = new Date();
  target.setDate(target.getDate() + 1);
  while (target.getDay() === 0 || target.getDay() === 6) {
    target.setDate(target.getDate() + 1);
  }
  const isoDate = target.toISOString().slice(0, 10);

  // Build an ISO start_time at 10:00 local — the frontend Schedule grid
  // splits by `T` to extract the hour, so we keep the `T` separator.
  // We use a fixed naive "${isoDate}T10:00:00" (same shape as the booking
  // modal POSTs) to ensure the appointment renders in the 10:00 slot.
  const startTime = `${isoDate}T10:00:00`;

  // ── Pre-create appointment via direct DB insert ───────────
  const ramonId = getBarberIdBySlug('ramon');
  const db = openTestDb();
  const haircut = db.prepare('SELECT id FROM services WHERE name = ?').get('Haircut') as { id: number };
  const shopRow = db.prepare('SELECT shop_id FROM barbers WHERE id = ?').get(ramonId) as { shop_id: number };

  const result = db.prepare(
    'INSERT INTO appointments (barber_id, service_id, start_time, total_duration_minutes, status, shop_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(ramonId, haircut.id, startTime, 30, 'scheduled', shopRow.shop_id);
  const appointmentId = Number(result.lastInsertRowid);
  db.close();

  // Sanity: API confirms it exists and is scheduled before we begin.
  const before = await getJSON(ownerToken, `/api/appointments/${appointmentId}`);
  expect(before.status).toBe(200);
  expect(before.body.status).toBe('scheduled');

  // ── Open Schedule and navigate to target date ─────────────
  const page = await asOwner.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[browser-console-error]', msg.text());
  });
  page.on('pageerror', err => console.log('[browser-pageerror]', err.message));

  // Auto-accept the window.prompt that handleCancel() shows.
  page.on('dialog', async d => {
    if (d.type() === 'prompt') await d.accept('E2E cancel');
    else await d.dismiss();
  });

  await page.goto('/schedule');

  // Wait for initial GET /api/appointments (today's date by default).
  await page.waitForResponse(
    res => res.url().includes('/api/appointments') && res.request().method() === 'GET' && res.status() === 200,
    { timeout: 10_000 }
  );

  // Change the date filter to the target date. The Schedule page has exactly
  // one top-level `input[type="date"]` outside any open modal, so the first
  // visible one is the page filter.
  // The Schedule page-head currently has no date input in the live UI — date
  // is changed via the prev/next/today buttons. Easiest: use those to walk to
  // the target date if it's `today + N` business days. Since we computed
  // tomorrow-skipping-weekends, just click "next" until URL/UI shows it.
  // Simpler: use the booking modal's date field to drive the same React state
  // is not feasible (separate state). Instead we set the React state by
  // reloading directly after dispatching to the date input — there isn't one.
  //
  // The Schedule component holds `date` in local state and changes it via
  // changeDate(±1) wired to the chevron buttons. Walk forward day-by-day.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetMidnight = new Date(target);
  targetMidnight.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((targetMidnight.getTime() - today.getTime()) / 86_400_000);
  for (let i = 0; i < dayDiff; i++) {
    const respPromise = page.waitForResponse(
      res => res.url().includes('/api/appointments') && res.request().method() === 'GET',
      { timeout: 10_000 }
    );
    // The "next" chevron has aria-label = t('common.next') = "Siguiente" (es-DO)
    await page.getByRole('button', { name: /siguiente|next/i }).click();
    await respPromise;
  }

  // ── Click the appointment block ───────────────────────────
  // Block has class "appt"; for a freshly seeded DB this is the only one on
  // the target date. Scope by the .appt class and click the first.
  const apptBlock = page.locator('.appt').first();
  await expect(apptBlock).toBeVisible({ timeout: 10_000 });
  await apptBlock.click();

  // ── Detail modal opens; click "Cancelar" ──────────────────
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 5_000 });

  // The footer has multiple buttons; "Cancelar" is the cancel-appointment
  // button (key common.cancel). It's the first in the footer for scheduled
  // status. Match by accessible name regex, scoped to the dialog.
  const cancelPromise = page.waitForResponse(
    res => res.url().includes(`/api/appointments/${appointmentId}/cancel`) && res.request().method() === 'POST',
    { timeout: 10_000 }
  );
  await dialog.getByRole('button', { name: /^cancelar$|^cancel$/i }).first().click();
  const cancelResp = await cancelPromise;
  expect(cancelResp.status(), 'POST /cancel should succeed').toBeLessThan(300);

  // ── Verify via API ────────────────────────────────────────
  const after = await getJSON(ownerToken, `/api/appointments/${appointmentId}`);
  expect(after.status).toBe(200);
  expect(after.body.status).toBe('cancelled');

  await page.close();
});
