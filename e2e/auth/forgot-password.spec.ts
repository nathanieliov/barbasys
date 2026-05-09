import { test, expect } from '@playwright/test';
import { getOtpCode } from '../fixtures/db.js';
import { TEST_USERS } from '../fixtures/seed-test.js';

/**
 * E2E-04 — Forgot password reset flow.
 *
 * Endpoint behavior:
 *   - POST /api/auth/forgot-password ALWAYS returns 204 (anti-enumeration).
 *     For staff users (non-CUSTOMER) it stores a 6-digit OTP in users.otp_code.
 *     There is no API to retrieve the code — we read it via getOtpCode() from
 *     the test seam (e2e/fixtures/db.ts).
 *   - POST /api/auth/reset-password { email, code, new_password } updates the
 *     password_hash and clears the OTP.
 *
 * UI behavior:
 *   - /forgot-password renders a sent-confirmation message after submit.
 *   - /reset-password navigates to /login on success (no in-page success text).
 *
 * We use TEST_USERS.MANAGER (not OWNER) to mutate the password — owner is used
 * heavily in other tests, so isolating mutation to MANAGER minimizes blast
 * radius if specs interleave under future parallelization.
 */
test('E2E-04 · Forgot password resets via OTP code, allowing re-login with new password', async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[browser-console-error]', msg.text());
  });
  page.on('pageerror', err => console.log('[browser-pageerror]', err.message));

  const target = TEST_USERS.MANAGER;
  const newPassword = 'BrandNewPass456!';

  // ── Step 1: Request a reset code on /forgot-password ────────────────────
  await page.goto('/forgot-password');

  // Wait for the 204 from /auth/forgot-password before asserting on the UI
  // confirmation, so we know the OTP has been written.
  const forgotResponse = page.waitForResponse(
    res => res.url().includes('/auth/forgot-password') && res.request().method() === 'POST'
  );
  await page.locator('#email').fill(target.email);
  await page
    .getByRole('button', { name: /send reset code|enviar código|enviar/i })
    .click();
  const forgotResp = await forgotResponse;
  expect(forgotResp.status(), 'forgot-password should return 204').toBe(204);

  // The success-state UI shows the "If an account exists..." message and an
  // "Enter reset code" link.
  await expect(
    page.getByText(/has been sent|reset code has been sent|código.*enviado/i).first()
  ).toBeVisible({ timeout: 10_000 });

  // ── Step 2: Read the OTP from the test DB ──────────────────────────────
  const code = getOtpCode(target.email);
  expect(code, 'OTP code should have been stored on the user record').toMatch(/^\d{6}$/);

  // ── Step 3: Submit the reset on /reset-password ────────────────────────
  await page.goto('/reset-password');
  await page.locator('#email').fill(target.email);
  await page.locator('#code').fill(code!);
  await page.locator('#new-password').fill(newPassword);
  await page.locator('#confirm-password').fill(newPassword);

  const resetResponse = page.waitForResponse(
    res => res.url().includes('/auth/reset-password') && res.request().method() === 'POST'
  );
  await page
    .getByRole('button', { name: /set new password|cambiar contraseña|restablecer|nueva contraseña/i })
    .click();
  const resetResp = await resetResponse;
  expect(resetResp.status(), 'reset-password should return 200').toBe(200);

  // On success, the page navigates to /login.
  await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 10_000 });

  // ── Step 4: Re-login with the new password ─────────────────────────────
  await page.locator('#username').fill(target.username);
  await page.locator('#password').fill(newPassword);

  const loginResponse = page.waitForResponse(
    res => res.url().includes('/auth/login') && res.request().method() === 'POST'
  );
  await page
    .getByRole('button', { name: /sign in|iniciar|ingresar|entrar/i })
    .click();
  const loginResp = await loginResponse;
  expect(loginResp.status(), 'login with new password should return 200').toBe(200);

  // MANAGER lands on `/` (Dashboard).
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByText(/buenos días|buenas tardes|buenas noches|good morning|good afternoon|good evening/i)
  ).toBeVisible({ timeout: 10_000 });
});
