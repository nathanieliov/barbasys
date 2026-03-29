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
    await page.click('button:has-text("Haircut")');
    
    // 3. Add Product
    await page.click('button:has-text("Pomade")');

    // 4. Add Tip
    await page.fill('input[placeholder="Tip Amount"]', '5');

    // 5. Apply Discount
    await page.fill('input[placeholder="Discount"]', '3');

    // Cart Total: 25 (Haircut) + 18 (Pomade) + 5 (Tip) - 3 (Discount) = 45
    await expect(page.locator('.pos-cart')).toContainText('Total: $45');

    // 6. Complete Checkout
    await page.click('button:has-text("Checkout $45.00")');
    
    // Verify Success Modal
    await expect(page.locator('.modal-content')).toContainText('Sale Completed');
    await page.click('button:has-text("New Sale")');

    // 7. Verify Inventory reduction
    await page.click('text=Inventory');
    const pomadeRow = page.locator('tr').filter({ hasText: 'Pomade' });
    // If it started at 10 (seed), it should be 9
    await expect(pomadeRow).toContainText('9');

    // 8. Verify Reports update
    await page.click('text=Reports');
    await expect(page.locator('.revenue-card')).toContainText('$45');
    await expect(page.locator('.tips-card')).toContainText('$5');
    
    // Check Nathaniel's commission
    const commissionRow = page.locator('tr').filter({ hasText: 'Nathaniel' });
    await expect(commissionRow).toContainText('$15.00'); // Service (25 * 0.6)
    await expect(commissionRow).toContainText('$2.70');  // Product (18 * 0.15)
  });
});
