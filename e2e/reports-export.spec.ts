import { test, expect } from '@playwright/test';

test.describe('Reports Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show export button on reports page', async ({ page }) => {
    await page.click('text=Reports');
    await expect(page.locator('h1')).toContainText('Business Insights');

    const exportBtn = page.locator('button:has-text("Export CSV")');
    await expect(exportBtn).toBeVisible();
  });
});
