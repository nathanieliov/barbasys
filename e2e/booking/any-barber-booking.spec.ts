import { test, expect } from '@playwright/test';
import { countAppointments, getBarberIdBySlug } from '../fixtures/db.js';

/**
 * E2E-06 — Guest books an appointment picking "Any" / "Cualquier barbero" at the
 * barber step; the system assigns a real barber under the hood.
 *
 * Mirror of E2E-05 (guest-otp-booking.spec.ts) — same 5-step flow, but at the
 * BARBER step we click the "Cualquier barbero" / "Any available" OptionCard
 * instead of a named barber. BookingFlow.tsx represents this as
 * `selectedBarber = { id: 'any' }`; on submission it substitutes `barbers[0]?.id`,
 * which (given the seed insertion order) is Ramón Pérez.
 *
 * The success card displays `selectedBarber.fullname || selectedBarber.name` —
 * for the "any" pseudo-selection both are undefined, so the rendered field is
 * empty. We don't assert on the displayed barber name; instead we assert:
 *   - the success view is reached (chip text "Confirmed" / "Confirmado")
 *   - the success card does NOT contain the literal "Any available" / "Cualquier barbero"
 *   - the DB has a new appointment with a non-null barber_id (it lands on Ramón).
 */
test('E2E-06 · Guest books with Any barber; system assigns a real barber', async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[browser-console-error]', msg.text());
  });
  page.on('pageerror', err => console.log('[browser-pageerror]', err.message));

  const ramonId = getBarberIdBySlug('ramon');
  const beforeAll = countAppointments({});
  const beforeRamon = countAppointments({ barber_id: ramonId });

  // ── Discovery ─────────────────────────────────────────────
  await page.goto('/discovery');
  await page.waitForResponse(
    res => res.url().includes('/api/public/shops') && res.request().method() === 'GET' && res.status() === 200,
    { timeout: 10_000 }
  );
  await page
    .getByRole('button', { name: /reservar (ahora|now)/i })
    .first()
    .click();

  // ── Step 0: Barber — pick "Any" / "Cualquier barbero" ─────
  await expect(
    page.getByRole('heading', { name: /elija un profesional|pick your barber/i })
  ).toBeVisible({ timeout: 10_000 });
  // The OptionCard renders "Cualquier barbero" (es-DO) / "Any available" (en-US).
  // OptionCard is clickable but isn't a <button>; click by visible text.
  await page.getByText(/cualquier barbero|any available/i).first().click();
  await page.getByRole('button', { name: /continuar|continue/i }).click();

  // ── Step 1: Service — pick Haircut ────────────────────────
  await page.getByRole('button', { name: /haircut/i }).first().click();
  await page.getByRole('button', { name: /continuar|continue/i }).click();

  // ── Step 2: Location confirmation — just continue ─────────
  await expect(page.getByRole('heading', { name: /dónde|where/i })).toBeVisible();
  await page.getByRole('button', { name: /continuar|continue/i }).click();

  // ── Step 3: Date/Time ─────────────────────────────────────
  const dayStrip = page.locator('[data-testid="day-strip"]');
  await expect(dayStrip).toBeVisible();
  const dayButtons = dayStrip.locator('button');
  const dayCount = await dayButtons.count();

  let slotPicked = false;
  for (let i = 0; i < dayCount; i++) {
    const dayBtn = dayButtons.nth(i);
    const availabilityResp = page.waitForResponse(
      res => /\/api\/public\/barbers\/\d+\/availability/.test(res.url()) && res.status() === 200,
      { timeout: 10_000 }
    );
    await dayBtn.click();
    await availabilityResp;

    const noSlots = await page
      .getByText(/no slots available|sin horarios disponibles|no hay horarios/i)
      .isVisible()
      .catch(() => false);
    if (noSlots) continue;

    const slotButton = page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first();
    if (await slotButton.isVisible().catch(() => false)) {
      await slotButton.click();
      slotPicked = true;
      break;
    }
  }
  expect(slotPicked, 'expected at least one day to have available slots').toBe(true);

  await page.getByRole('button', { name: /continuar|continue/i }).click();

  // ── Step 4: Confirm — trigger OTP ─────────────────────────
  await expect(page.getByRole('heading', { name: /revisar|look right|confirm/i })).toBeVisible();
  await page.getByRole('button', { name: /confirmar reserva|confirm booking/i }).click();

  // ── OTP Modal ─────────────────────────────────────────────
  const guestEmail = `guest-any-${Date.now()}@test.local`;
  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeVisible({ timeout: 5_000 });
  await emailInput.fill(guestEmail);

  const sendResp = page.waitForResponse(
    res => res.url().includes('/api/auth/otp/send') && res.request().method() === 'POST',
    { timeout: 10_000 }
  );
  await page.getByRole('button', { name: /enviar código|send code/i }).click();
  const sr = await sendResp;
  if (sr.status() !== 200) {
    const body = await sr.text();
    throw new Error(`OTP send returned ${sr.status()}: ${body}`);
  }

  const verifyResp = page.waitForResponse(
    res => res.url().includes('/api/auth/otp/verify') && res.request().method() === 'POST',
    { timeout: 10_000 }
  );
  await page.getByRole('button', { name: /verificar y continuar|verify.*continue|verify/i }).click();
  const v = await verifyResp;
  expect(v.status(), 'OTP verify should return 200').toBe(200);

  // ── Profile completion (new guest user) ───────────────────
  const completeBtn = page.getByRole('button', { name: /completar perfil|complete profile/i });
  if (await completeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type="text"]').fill('E2E Any Guest');
    await dialog.locator('input[type="date"]').fill('1995-02-20');
    await completeBtn.click();
  }

  // Wait for the appointment POST.
  await page.waitForResponse(
    res => res.url().includes('/api/appointments') && res.request().method() === 'POST' && res.status() < 300,
    { timeout: 10_000 }
  );

  // ── Success screen ────────────────────────────────────────
  await expect(
    page.getByText(/confirmed|confirmada|confirmado/i).first()
  ).toBeVisible({ timeout: 10_000 });

  // The success card should NOT advertise "Any" / "Cualquier barbero" — at this
  // point a real barber (Ramón, since he's barbers[0]) has been bound to the
  // appointment in the DB. The UI happens to render an empty barber field because
  // selectedBarber === { id: 'any' } in client state, but it definitely should not
  // surface the "Any available" placeholder text.
  const successCard = page.locator('.card').filter({ hasText: /confirmed|confirmada|confirmado/i }).first();
  await expect(successCard).not.toContainText(/cualquier barbero|any available/i);

  // ── DB assertion ──────────────────────────────────────────
  const afterAll = countAppointments({});
  const afterRamon = countAppointments({ barber_id: ramonId });
  expect(afterAll, 'one new appointment should be persisted').toBe(beforeAll + 1);
  // The "Any" path resolves to barbers[0] — given the seed (Ramón inserted before
  // Luis), the new appointment must land on Ramón. This also implicitly checks
  // that barber_id is non-null (count would be unchanged otherwise).
  expect(afterRamon, "the 'Any' booking should resolve to Ramón (barbers[0])").toBe(beforeRamon + 1);
});
