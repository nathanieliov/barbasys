import { test, expect } from '@playwright/test';

test.describe('Authentication & RBAC', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('admin should see all restricted tabs', async ({ page }) => {
    await expect(page.locator('.sidebar')).toContainText('Analytics');
    await expect(page.locator('.sidebar')).toContainText('Settings');
    await expect(page.locator('.sidebar')).toContainText('Barbers');
  });
});
