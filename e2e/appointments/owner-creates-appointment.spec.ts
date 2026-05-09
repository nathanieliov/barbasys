import { test, expect } from '../fixtures/auth.js';
import { getJSON } from '../fixtures/api.js';

/**
 * E2E-07 — OWNER creates an appointment from the Schedule page.
 *
 * Flow: OWNER navigates to /schedule, opens the "Nueva Cita" modal via the
 * top-right "Nueva Cita" button (key: schedule.book_new), fills in barber
 * Ramón, service Combo, leaves customer = walk-in, picks tomorrow (skipping
 * weekends — seed only has Mon-Fri shifts) at 10:00, and submits. We verify
 * via API that the appointments count increased by 1 and the latest record
 * has barber_id = Ramón.
 *
 * Selector notes (es-DO):
 *   - The "Nueva Cita" button uses the `schedule.book_new` key, label
 *     "Nueva Cita" in es-DO. The submit button reuses the same key with a
 *     fallback "Book appointment", so es-DO renders both as "Nueva Cita".
 *     We disambiguate the submit button by clicking inside the open dialog
 *     scope, after the modal heading "Nueva Cita" appears.
 *   - The booking form uses unnamed <select> elements; we resolve the right
 *     one by looking for an <option> whose text matches Ramón / Combo and
 *     calling selectOption with the option's `value` attribute.
 *   - Date input is the only `input[type="date"]` in the dialog.
 *   - Time input is the only `input[type="time"]` in the dialog (default 10:00
 *     anyway, but we set it explicitly for clarity).
 *
 * The Schedule page also has a top-level date input that drives the grid view.
 * The booking modal's date input is bound to the same `date` state, so we can
 * scope our date input lookup to the dialog to avoid the outer one.
 */
test('E2E-07 · OWNER creates appointment from Schedule page', async ({ asOwner, ownerToken }) => {
  const page = await asOwner.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[browser-console-error]', msg.text());
  });
  page.on('pageerror', err => console.log('[browser-pageerror]', err.message));

  // ── Pick a target date: tomorrow, skipping weekends ───────
  const target = new Date();
  target.setDate(target.getDate() + 1);
  while (target.getDay() === 0 || target.getDay() === 6) {
    target.setDate(target.getDate() + 1);
  }
  const isoDate = target.toISOString().slice(0, 10);

  await page.goto('/schedule');

  // Wait for the initial GET /api/appointments and dependent fetches.
  await page.waitForResponse(
    res => res.url().includes('/api/appointments') && res.request().method() === 'GET' && res.status() === 200,
    { timeout: 10_000 }
  );
  await page.waitForResponse(
    res => res.url().includes('/api/barbers') && res.request().method() === 'GET' && res.status() === 200,
    { timeout: 10_000 }
  );
  await page.waitForResponse(
    res => res.url().includes('/api/services') && res.request().method() === 'GET' && res.status() === 200,
    { timeout: 10_000 }
  );

  // Capture appointment count before — scope to our target date because the
  // backend filters GET /api/appointments by `date` query (defaults to today).
  const before = await getJSON(ownerToken, `/api/appointments?date=${isoDate}`);
  expect(before.status).toBe(200);
  const beforeCount = (before.body as unknown[]).length;

  // ── Open the new-appointment modal ────────────────────────
  // The button "Nueva Cita" is the only "btn btn-accent" in the page-head
  // and uses key schedule.book_new. We match by accessible name regex.
  await page.getByRole('button', { name: /nueva cita|booking|book/i }).first().click();

  // The modal's heading uses key schedule.book_new fallback "New booking"
  // — in es-DO the same translation "Nueva Cita" applies.
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  await expect(dialog.getByRole('heading', { name: /nueva cita|new booking/i })).toBeVisible();

  // ── Fill barber select ────────────────────────────────────
  // The form has 4 <select> elements in order: barber, customer, service,
  // recurring rule. We disambiguate by index (nth) and select by label.
  const selects = dialog.locator('select');
  await expect(selects.nth(0)).toBeVisible();

  // Resolve Ramón's option value first (used for DB assertion below).
  const ramonValue = await selects.nth(0).locator('option', { hasText: /ram[oó]n p[eé]rez/i }).getAttribute('value');
  expect(ramonValue, 'expected Ramón option').toBeTruthy();
  await selects.nth(0).selectOption({ label: 'Ramón Pérez' });

  // ── Customer: leave walk-in (do nothing) ──────────────────

  // ── Fill service select (Combo) ───────────────────────────
  // Service options render as "Combo (RD$35.00)" — match label by regex.
  const comboOption = selects.nth(2).locator('option', { hasText: /^Combo\b/ });
  const comboValue = await comboOption.getAttribute('value');
  const comboLabel = await comboOption.textContent();
  expect(comboValue, 'expected Combo option').toBeTruthy();
  await selects.nth(2).selectOption({ label: comboLabel!.trim() });

  // ── Date / time ───────────────────────────────────────────
  await dialog.locator('input[type="date"]').fill(isoDate);
  await dialog.locator('input[type="time"]').fill('10:00');

  // ── Submit ────────────────────────────────────────────────
  // The submit button has type="submit" and label "Nueva Cita" (es-DO) —
  // share the same key as the open-modal button. Scope to dialog and look
  // for the submit-typed button.
  const postPromise = page.waitForResponse(
    res => res.url().includes('/api/appointments') && res.request().method() === 'POST',
    { timeout: 10_000 }
  );
  await dialog.locator('button[type="submit"]').click();
  const postResp = await postPromise;
  expect(postResp.status(), 'POST /api/appointments should succeed').toBeLessThan(300);

  // ── Success view appears (chec mark + Done button) ────────
  await expect(dialog.getByRole('button', { name: /listo|done/i })).toBeVisible({ timeout: 5_000 });

  // ── DB-via-API assertion ──────────────────────────────────
  const after = await getJSON(ownerToken, `/api/appointments?date=${isoDate}`);
  expect(after.status).toBe(200);
  const afterList = after.body as Array<{ id: number; barber_id: number; start_time: string; service_id: number }>;
  expect(afterList.length).toBe(beforeCount + 1);

  // The newest appointment should belong to Ramón.
  const newest = [...afterList].sort((a, b) => b.id - a.id)[0];
  expect(newest.barber_id).toBe(Number(ramonValue));
  expect(newest.service_id).toBe(Number(comboValue));
  // SQLite normalizes the ISO `T` separator to a space — start_time comes
  // back as `${isoDate} 10:00:00`. Assert each component independently.
  expect(newest.start_time).toContain(isoDate);
  expect(newest.start_time).toMatch(/[ T]10:00/);

  await page.close();
});
