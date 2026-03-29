import { test, expect } from '@playwright/test';

test.describe('Automated Communications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show receipt confirmation in POS when customer info is provided', async ({ page }) => {
    await page.click('text=POS');
    
    // Select Barber
    await page.selectOption('select:near(:text("Select Professional"))', { label: 'Nathaniel' });

    // Add Service
    await page.locator('button', { hasText: 'Haircut' }).first().click();
    
    // Open Checkout
    await page.click('button:has-text("Checkout Now")');

    // Initially should not show receipt note
    await expect(page.locator('text=Digital receipt will be sent')).not.toBeVisible();

    // Fill email
    await page.fill('input[placeholder="name@example.com"]', 'test@example.com');
    
    // Now it should show
    await expect(page.locator('text=Digital receipt will be sent')).toBeVisible();
  });

  test('should show confirmation checkbox in Schedule booking', async ({ page }) => {
    await page.click('text=Schedule');
    await page.click('button:has-text("Book New")');
    
    const checkbox = page.locator('label:has-text("Send booking confirmation")');
    await expect(checkbox).toBeVisible();
    
    const input = page.locator('input#sendConfirmation');
    await expect(input).toBeChecked();
  });
});
