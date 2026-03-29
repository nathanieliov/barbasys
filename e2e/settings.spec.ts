import { test, expect } from '@playwright/test';

test.describe('Shop Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should update shop settings successfully', async ({ page }) => {
    await page.click('text=Settings');
    await expect(page.locator('h1')).toContainText('Shop Settings');

    const newShopName = 'E2E Elite Barbers';
    await page.fill('label:has-text("Business Name") + input', newShopName);
    
    // Update tax rate
    await page.fill('label:has-text("Default Tax Rate (%)") + input', '7.5');

    await page.click('button:has-text("Save All Settings")');

    // Check for success message
    await expect(page.locator('text=Settings saved successfully!')).toBeVisible();

    // Refresh and verify
    await page.reload();
    await expect(page.locator('input[value="E2E Elite Barbers"]')).toBeVisible();
    await expect(page.locator('input[value="7.5"]')).toBeVisible();
  });

  test('should add and remove holidays', async ({ page }) => {
    await page.click('text=Settings');
    
    const holidayDate = '2026-12-25';
    await page.fill('input[type="date"]', holidayDate);
    await page.click('button:has-text("+")'); // The small plus button

    await expect(page.locator('text=12/25/2026')).toBeVisible();

    // Remove it
    await page.click('button:has-text("12/25/2026") + button'); // Trash icon next to date
    await expect(page.locator('text=12/25/2026')).not.toBeVisible();
  });
});
