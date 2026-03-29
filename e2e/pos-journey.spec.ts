import { test, expect } from '@playwright/test';

test.describe('POS Checkout Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete a mixed sale with tip and verify report update', async ({ page }) => {
    await page.click('text=POS');
    await expect(page).toHaveURL('/pos');

    // 1. Select Barber
    await page.selectOption('select:near(:text("Select Professional"))', { label: 'Nathaniel' });

    // 2. Add Service
    await page.locator('button', { hasText: 'Haircut' }).first().click();
    
    // 3. Add Product
    await page.locator('button', { hasText: 'Pomade' }).first().click();

    // 4. Open Checkout
    await page.click('button:has-text("Checkout Now")');

    // 5. Add Tip & Discount in modal
    await page.fill('label:has-text("Tip ($)") + input', '5');
    await page.fill('label:has-text("Discount ($)") + input', '3');

    // Cart Total: 25 (Haircut) + 18 (Pomade) + 5 (Tip) - 3 (Discount) = 45
    await expect(page.locator('.modal-content')).toContainText('$45.00');

    // 6. Complete Checkout
    await page.click('button:has-text("Complete Payment")');
    
    // Verify Success Modal
    await expect(page.locator('.modal-content')).toContainText('Sale Completed');
    await page.click('button:has-text("New Sale")');

    // 7. Verify Inventory reduction
    await page.click('text=Inventory');
    const pomadeRow = page.locator('.card', { hasText: 'Pomade' });
    // If it started at 10 (seed), it should be 9
    await expect(pomadeRow).toContainText('Stock: 9');

    // 8. Verify Reports update
    await page.click('text=Reports');
    // Reports might use different classes, let's check the Reports page if needed
    // But assuming some card contains the revenue
    await expect(page.locator('.card', { hasText: 'Revenue' })).toContainText('$45');
    await expect(page.locator('.card', { hasText: 'Tips' })).toContainText('$5');
    
    // Check Nathaniel's commission
    const commissionRow = page.locator('tr').filter({ hasText: 'Nathaniel' });
    await expect(commissionRow).toContainText('$15.00'); // Service (25 * 0.6)
    await expect(commissionRow).toContainText('$2.70');  // Product (18 * 0.15)
  });
});
