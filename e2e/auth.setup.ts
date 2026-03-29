import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[placeholder="Enter your username"]', 'admin');
  await page.fill('input[placeholder="••••••••"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await expect(page).toHaveURL('/');
  await expect(page.locator('h1')).toContainText('Welcome back, admin!');

  await page.context().storageState({ path: authFile });
});
