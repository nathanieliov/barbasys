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
    await expect(pomadeRow).toContainText('Current Stock');
    await expect(pomadeRow).toContainText('9');

    // 8. Verify Reports update
    await page.click('text=Reports');
    // Revenue should at least include this sale ($45)
    const revenueCard = page.locator('.card', { hasText: 'Revenue' });
    await expect(revenueCard).toBeVisible();
    const revenueText = await revenueCard.innerText();
    const revenueAmount = parseFloat(revenueText.match(/\d+\.\d+/)?.[0] || '0');
    expect(revenueAmount).toBeGreaterThanOrEqual(45);
    
    // Tips are shown in the Earnings Breakdown card
    await expect(page.locator('.card', { hasText: 'Tips' })).toContainText('$5');
    
    // Check Nathaniel's commission in the Earnings Breakdown card
    const nathanielEarnings = page.locator('.card', { hasText: 'Nathaniel' }).filter({ hasText: 'Earnings Breakdown' });
    // Accumulated: $15 (CRM test) + $15 (POS test) = $30
    await expect(nathanielEarnings).toContainText('$30.00'); // Services total
    await expect(nathanielEarnings).toContainText('$2.70');  // Products total
    await expect(nathanielEarnings).toContainText('$5.00');  // Tip
    await expect(nathanielEarnings).toContainText('$37.70'); // Total payout
  });
});
