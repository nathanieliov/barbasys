import { test, expect } from '@playwright/test';
import { countAppointments, getBarberIdBySlug } from '../fixtures/db.js';

/**
 * E2E-05 — Guest books an appointment for a specific barber via OTP.
 *
 * Flow (5 steps): Discovery → Barber → Service → Location → Date/Time → Confirm → OTP → Success.
 * Note: The Stepper in BookingFlow.tsx orders steps as BARBER → SERVICE → LOCATION → DATETIME →
 * CONFIRM (Barber comes first, not Service as the task spec suggested). The selectors below
 * follow the actual implementation.
 *
 * The OTP modal auto-fills the verification code from the `devCode` field on the
 * /auth/otp/send response when EMAIL_USER is empty (Playwright env sets it to '').
 *
 * Harness note: Playwright's `webServer`-spawned backend hit a SQLite "attempt to write a
 * readonly database" error that we couldn't root-cause — direct shell invocation worked fine
 * with the same env. To work around it, the harness now starts the backend out-of-band via
 * `scripts/e2e-run.sh` (invoked through `npm run test:e2e`) and only the frontend is managed
 * by Playwright's webServer.
 *
 * Selectors used below:
 *   - "Reservar Ahora" button on each shop card on /discovery (es-DO label).
 *   - Step heading "Elija un Profesional" → button "Ramón Pérez".
 *   - Service card button "Haircut".
 *   - Location heading "¿Dónde?" → "Continuar".
 *   - `[data-testid="day-strip"] > button` for the day picker (we iterate days until availability
 *     returns slots; weekends have no shifts in seed-test.ts so they're skipped).
 *   - Slot buttons by accessible name `^\d{2}:\d{2}$` (e.g. "09:00").
 *   - Confirm step heading "Revisar y Confirmar" → button "Confirmar Reserva".
 *   - OTP modal: input[type="email"], "Enviar Código", "Verificar y Continuar".
 */
test('E2E-05 · Guest books appointment via OTP for specific barber', async ({ page }) => {
  // Capture browser console errors for diagnostics in CI logs.
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[browser-console-error]', msg.text());
  });
  page.on('pageerror', err => console.log('[browser-pageerror]', err.message));

  // ── Discovery ─────────────────────────────────────────────
  await page.goto('/discovery');

  // Wait for the public/shops fetch to populate the list.
  await page.waitForResponse(
    res => res.url().includes('/api/public/shops') && res.request().method() === 'GET' && res.status() === 200,
    { timeout: 10_000 }
  );

  // Use the "Book Now" button on the seeded shop card to start the flow.
  // Note: navigation to /book/:shopId triggers the public/shops/:id fetch, but that
  // response often arrives before we attach a waitForResponse listener. Instead, just
  // wait for the Barber step heading to render — which only appears once the data has loaded.
  await page
    .getByRole('button', { name: new RegExp(`reservar (ahora|now)`, 'i') })
    .first()
    .click();

  // ── Step 0: Barber — pick Ramon (NOT "Any") ───────────────
  // OptionCard renders the fullname "Ramón Pérez" (es-DO seed) in the barber list.
  await expect(page.getByRole('heading', { name: /elija un profesional|pick your barber/i })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: /ramón pérez|ramon pérez|ramón perez|ramon perez/i }).first().click();
  await page.getByRole('button', { name: /continuar|continue/i }).click();

  // ── Step 1: Service — pick Haircut ────────────────────────
  await page.getByRole('button', { name: /haircut/i }).first().click();
  await page.getByRole('button', { name: /continuar|continue/i }).click();

  // ── Step 2: Location confirmation — just continue ─────────
  // canContinue is true once shop is loaded (which it already is from earlier fetch).
  await expect(page.getByRole('heading', { name: /dónde|where/i })).toBeVisible();
  await page.getByRole('button', { name: /continuar|continue/i }).click();

  // ── Step 3: Date/Time ─────────────────────────────────────
  // The day strip has data-testid="day-strip". Iterate days until one yields slots.
  const dayStrip = page.locator('[data-testid="day-strip"]');
  await expect(dayStrip).toBeVisible();
  const dayButtons = dayStrip.locator('button');
  const dayCount = await dayButtons.count();

  let slotPicked = false;
  for (let i = 0; i < dayCount; i++) {
    const dayBtn = dayButtons.nth(i);
    // Wait for the availability response triggered by clicking the day.
    const availabilityResp = page.waitForResponse(
      res => /\/api\/public\/barbers\/\d+\/availability/.test(res.url()) && res.status() === 200,
      { timeout: 10_000 }
    );
    await dayBtn.click();
    await availabilityResp;

    // The "no slots" message is rendered when availableSlots is empty.
    const noSlots = await page
      .getByText(/no slots available|sin horarios disponibles|no hay horarios/i)
      .isVisible()
      .catch(() => false);
    if (noSlots) continue;

    // Slots render as "btn btn-ghost btn-sm" / "btn btn-primary btn-sm" with HH:MM text.
    // We scope to buttons whose visible text matches a HH:MM pattern.
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
  // The confirm button label is "Confirmar Reserva · $25.00" (or English equivalent).
  await page.getByRole('button', { name: /confirmar reserva|confirm booking/i }).click();

  // ── OTP Modal ─────────────────────────────────────────────
  const guestEmail = `guest-${Date.now()}@test.local`;
  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeVisible({ timeout: 5_000 });
  await emailInput.fill(guestEmail);

  // Wait for the send OTP request — devCode is in the response body, the UI auto-fills the OTP input.
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

  // Wait for the verify request after clicking "Verify & continue".
  const verifyResp = page.waitForResponse(
    res => res.url().includes('/api/auth/otp/verify') && res.request().method() === 'POST',
    { timeout: 10_000 }
  );
  await page.getByRole('button', { name: /verificar y continuar|verify.*continue|verify/i }).click();
  const v = await verifyResp;
  expect(v.status(), 'OTP verify should return 200').toBe(200);

  // ── Profile completion (guests have no name/birthday) ─────
  // VerifyOTP returns `requires_profile_completion: true` for new guest users.
  // The UI swaps the OTP modal contents to a fullname + birthday form. Fill it.
  // The fullname input has placeholder "Alex Morgan" (no associated label), so we
  // locate it via the dialog scope + input[type="text"]. The birthday input is
  // input[type="date"] in the same dialog.
  const completeBtn = page.getByRole('button', { name: /completar perfil|complete profile/i });
  if (await completeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type="text"]').fill('E2E Guest');
    await dialog.locator('input[type="date"]').fill('1995-01-15');
    await completeBtn.click();
  }

  // After verification (and optional profile completion) the app calls POST /appointments.
  await page.waitForResponse(
    res => res.url().includes('/api/appointments') && res.request().method() === 'POST' && res.status() < 300,
    { timeout: 10_000 }
  );

  // ── Success screen ────────────────────────────────────────
  // The success view shows "You're booked." / "Estás reservado." style heading; safer to look for
  // the "Confirmed" chip + ref number block which is always rendered.
  await expect(
    page.getByText(/confirmed|confirmada|confirmado/i).first()
  ).toBeVisible({ timeout: 10_000 });

  // ── DB assertion ──────────────────────────────────────────
  const ramonId = getBarberIdBySlug('ramon');
  const after = countAppointments({ barber_id: ramonId });
  expect(after, 'an appointment should be persisted for ramon').toBeGreaterThanOrEqual(1);
});
