import { test, expect } from '@playwright/test';

test.describe('Inventory & Supplier Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should add a new supplier', async ({ page }) => {
    await page.click('text=Suppliers');
    await expect(page).toHaveURL('/suppliers');

    // Open modal
    await page.click('button:has-text("Add Supplier")');

    await page.fill('input[placeholder*="Grooming Essentials"]', 'E2E Supplier');
    await page.fill('input[placeholder*="Jane Smith"]', 'Test Agent');
    await page.fill('input[type="number"]', '5');
    
    await page.click('button:has-text("Confirm Registration")');

    // Check if the new supplier is in the list
    const supplierCard = page.locator('.card', { hasText: 'E2E Supplier' });
    await expect(supplierCard).toBeVisible();
    await expect(supplierCard).toContainText('Test Agent');
    await expect(supplierCard).toContainText('5 days');
  });
});
