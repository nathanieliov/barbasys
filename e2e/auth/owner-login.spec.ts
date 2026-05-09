import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/seed-test.js';

test('E2E-01 · Owner logs in and lands on Dashboard', async ({ page }) => {
  // Capture console + network for diagnostics in CI logs.
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[browser-console-error]', msg.text());
  });
  page.on('pageerror', err => console.log('[browser-pageerror]', err.message));

  await page.goto('/login');

  await page.locator('#username').fill(TEST_USERS.OWNER.username);
  await page.locator('#password').fill(TEST_USERS.OWNER.password);

  // Click sign-in and wait for the login API call to complete with 200 OK
  // before asserting on URL — otherwise the SPA may not have updated state yet.
  const loginResponse = page.waitForResponse(
    res => res.url().includes('/auth/login') && res.request().method() === 'POST'
  );
  await page
    .getByRole('button', { name: /sign in|iniciar|ingresar|entrar/i })
    .click();
  const resp = await loginResponse;
  expect(resp.status(), 'login API should return 200').toBe(200);

  // Owner lands on `/` (Dashboard).
  await expect(page).toHaveURL(/\/$/);

  // Wait for the post-login Dashboard to actually render. Look for a Dashboard-specific
  // greeting that only appears for an authenticated user.
  // dashboard.good_morning / good_afternoon / good_evening
  await expect(
    page.getByText(/buenos días|buenas tardes|buenas noches|good morning|good afternoon|good evening/i)
  ).toBeVisible({ timeout: 10_000 });

  // Sidebar should expose at least one admin-only nav link. The mobile layout
  // collapses the sidebar behind a hamburger, but on desktop viewports
  // (Playwright default 1280×720) the admin sidebar is rendered inline.
  // Match es-DO labels first (default locale) with English fallbacks.
  await expect(
    page
      .getByRole('link', {
        name: /productos y servicios|catálogo|catalog|reportes|reports|cuentas de usuario|users|configuración|settings/i,
      })
      .first()
  ).toBeVisible();
});
