import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/seed-test.js';

test('E2E-02 · Barber logs in and reaches My Schedule', async ({ page }) => {
  // Capture console + network for diagnostics in CI logs.
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[browser-console-error]', msg.text());
  });
  page.on('pageerror', err => console.log('[browser-pageerror]', err.message));

  await page.goto('/login');

  await page.locator('#username').fill(TEST_USERS.BARBER.username);
  await page.locator('#password').fill(TEST_USERS.BARBER.password);

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

  // After login, BARBER lands on `/` (Dashboard) like other staff roles.
  // The BARBER-specific surface lives behind the `/my-schedule` nav link, which
  // only renders for users with role === 'BARBER'. Click it to reach the
  // primary BARBER view.
  await expect(page).toHaveURL(/\/$/);
  const myScheduleLink = page
    .getByRole('link', { name: /mi agenda|my schedule/i })
    .first();
  await expect(myScheduleLink).toBeVisible();
  await myScheduleLink.click();

  // Now we should be on My Schedule.
  await expect(page).toHaveURL(/\/my-schedule$/);
  await expect(
    page.getByRole('heading', { name: /my schedule|mi agenda/i })
  ).toBeVisible({ timeout: 10_000 });

  // Sidebar should NOT expose admin-only links for BARBER. Reports and User
  // Accounts are gated by `admin: true` in App.tsx and must be hidden.
  await expect(
    page.getByRole('link', { name: /^reportes$|^reports$/i })
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: /cuentas de usuario|^users$|user accounts/i })
  ).toHaveCount(0);
});
