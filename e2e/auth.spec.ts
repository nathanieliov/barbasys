import { test, expect } from '@playwright/test';

test.describe('Authentication & RBAC', () => {
  test('should login successfully as admin', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[placeholder="Username"]', 'admin');
    await page.fill('input[placeholder="Password"]', 'admin123');
    await page.click('button:has-text("Login")');

    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Welcome back, admin!');
    await expect(page.locator('.sidebar')).toContainText('Main Street Shop');
  });

  test('admin should see all restricted tabs', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="Username"]', 'admin');
    await page.fill('input[placeholder="Password"]', 'admin123');
    await page.click('button:has-text("Login")');

    await expect(page.locator('.sidebar')).toContainText('Analytics');
    await expect(page.locator('.sidebar')).toContainText('Settings');
    await expect(page.locator('.sidebar')).toContainText('Barbers');
  });
});
