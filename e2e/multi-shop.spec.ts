import { test, expect } from '@playwright/test';

test.describe('Multi-Shop UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show shop switcher and allow switching locations', async ({ page }) => {
    // 1. Verify initial shop
    const logo = page.locator('.logo');
    await expect(logo).toContainText('Main Street Shop');

    // 2. Select different shop
    const switcher = page.locator('select:near(:text("Active Location"))');
    await switcher.selectOption({ label: 'Downtown Studio' });

    // 3. Verify switch (page reloads)
    await expect(logo).toContainText('Downtown Studio');
    
    // 4. Verify persistency (settings should fetch for new shop)
    await page.click('text=Settings');
    await expect(page.locator('input[value="Downtown Studio"]')).toBeVisible();
  });
});
