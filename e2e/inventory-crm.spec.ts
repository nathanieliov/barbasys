import { test, expect } from '@playwright/test';

test.describe('Inventory & CRM Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should create a customer during POS and view their history in CRM', async ({ page }) => {
    const customerEmail = `test-${Math.random().toString(36).substring(7)}@example.com`;
    const customerPhone = `555-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Perform a sale for a new customer
    await page.click('text=POS');
    await page.selectOption('select:near(:text("Select Professional"))', { label: 'Nathaniel' });
    await page.click('button:text("Haircut")');
    await page.click('button:has-text("Checkout")');
    
    // Fill customer details in modal
    await page.fill('input[placeholder="name@example.com"]', customerEmail);
    await page.fill('input[placeholder="+1 (555) 000-0000"]', customerPhone);
    
    await page.click('button:has-text("Complete Payment")');
    await expect(page.locator('.modal-content')).toContainText('Sale Completed');
    await page.click('button:has-text("New Sale")');

    // 2. Verify customer profile in CRM
    await page.click('text=Customers');
    await page.fill('input[placeholder*="Search by name"]', customerEmail);
    
    const customerCard = page.locator('.card').filter({ hasText: customerEmail });
    await expect(customerCard).toBeVisible();
    
    // 3. Open full profile and check history
    await customerCard.click('button:has-text("Full Profile")');
    await expect(page.locator('.modal-content')).toContainText(customerEmail);
    await expect(page.locator('.modal-content')).toContainText('Total Visits: 1');
    await expect(page.locator('.modal-content')).toContainText('Haircut');
    await expect(page.locator('.modal-content')).toContainText('Nathaniel');
  });

  test('should show inventory intelligence and reorder suggestions', async ({ page }) => {
    await page.click('text=Inventory');
    // More logic could go here once the intelligence section is refined.
  });
});
