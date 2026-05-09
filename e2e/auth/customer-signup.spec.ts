import { test, expect } from '@playwright/test';
import { apiCtx } from '../fixtures/api.js';

/**
 * E2E-03 — Customer registers via OTP and lands on the Customer Portal.
 *
 * In this app there is no `/signup` for customers — that endpoint creates a NEW shop+OWNER.
 * Customers register via the OTP flow:
 *   - POST /api/auth/otp/send  → creates a CUSTOMER user if email is new (SendOTP.execute), and
 *     in dev/test mode (no EMAIL_USER configured) the response includes `devCode`.
 *   - POST /api/auth/otp/verify → returns { token, user, requires_profile_completion }.
 *
 * Strategy: API-driven registration (more deterministic than driving the multi-entry UI). After
 * verifying, inject the token+user into localStorage and navigate. The Customer Portal is rendered
 * by `HomeSelector` at `/` for users with role=CUSTOMER (there is no `/portal` route).
 *
 * For brand-new customers, `requires_profile_completion` is true because no birthday is set —
 * but the portal itself does not gate on this; only the booking OTP modal does. Asserting on
 * `t('portal.welcome', { name })` ("Hola, ...") and `t('portal.book_new')` ("Reservar Nueva Cita")
 * confirms the portal rendered.
 */
test('E2E-03 · Customer registers via OTP and lands on Customer Portal', async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[browser-console-error]', msg.text());
  });
  page.on('pageerror', err => console.log('[browser-pageerror]', err.message));

  const newEmail = `new-customer-${Date.now()}@test.local`;

  // Step 1: SendOTP — creates a fresh CUSTOMER user and returns devCode.
  const ctx = await apiCtx();
  const sendRes = await ctx.post('/api/auth/otp/send', { data: { email: newEmail } });
  expect(sendRes.ok(), 'OTP send should return 2xx').toBe(true);
  const sendBody = await sendRes.json();
  const devCode = sendBody.devCode;
  expect(devCode, 'devCode should be present in dev/test mode').toMatch(/^\d{6}$/);

  // Step 2: VerifyOTP — returns { token, user, requires_profile_completion }.
  const verifyRes = await ctx.post('/api/auth/otp/verify', {
    data: { email: newEmail, code: devCode },
  });
  expect(verifyRes.ok(), 'OTP verify should return 2xx').toBe(true);
  const verifyBody = await verifyRes.json();
  expect(verifyBody.token, 'token should be returned').toBeTruthy();
  expect(verifyBody.user.role, 'newly created user must have role CUSTOMER').toBe('CUSTOMER');
  expect(verifyBody.user.customer_id, 'user must be linked to a customer record').toBeTruthy();
  await ctx.dispose();

  // Step 3: Navigate to the origin first to be able to set localStorage, then inject the
  // session and reload at `/`. HomeSelector routes role=CUSTOMER users to <CustomerPortal/>.
  await page.goto('/login');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, { token: verifyBody.token, user: verifyBody.user });

  await page.goto('/');

  // Step 4: Assert Customer Portal rendered. The portal greeting is `t('portal.welcome', { name })`
  // = "Hola, <fullname>" in es-DO. SendOTP seeds fullname to the local-part of the email, so the
  // greeting will contain "Hola," reliably.
  await expect(
    page.getByRole('heading', { name: /^hola,|^hi,/i }).first()
  ).toBeVisible({ timeout: 10_000 });

  // The "Book New" CTA is a Customer-Portal-specific button (`t('portal.book_new')`).
  await expect(
    page.getByRole('button', { name: /reservar nueva cita|book new/i })
  ).toBeVisible();

  // Sanity: we should NOT have been redirected back to login.
  expect(page.url()).not.toMatch(/\/login(\?|$)/);
});
