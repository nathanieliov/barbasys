import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[placeholder="Enter your username"]', 'admin');
  await page.fill('input[placeholder="••••••••"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await expect(page).toHaveURL('/');
  await expect(page.locator('h1')).toContainText('Welcome back, admin!');

  // Ensure we are in Main Street Shop for other tests
  const logo = page.locator('.sidebar .logo');
  const logoText = await logo.innerText();
  if (!logoText.includes('Main Street Shop')) {
    const switcher = page.locator('.sidebar select');
    await switcher.selectOption({ label: 'Main Street Shop' });
    await expect(logo).toContainText('Main Street Shop');
  }

  await page.context().storageState({ path: authFile });
});
