import { test, expect } from '@playwright/test';

test.describe('Inventory & Supplier Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should add a new supplier', async ({ page }) => {
    await page.click('text=Suppliers');
    await expect(page).toHaveURL('/suppliers');

    await page.fill('input:below(:text("Company Name"))', 'E2E Supplier');
    await page.fill('input:below(:text("Contact Person"))', 'Test Agent');
    await page.click('button:has-text("Add Supplier")');

    const partnersList = page.locator('.card', { hasText: 'Current Partners' });
    await expect(partnersList).toContainText('E2E Supplier');
    await expect(partnersList).toContainText('Test Agent');
  });
});
