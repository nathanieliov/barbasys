import { test, expect } from '@playwright/test';

test.describe('BarbaSys Core Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to all core modules', async ({ page }) => {
    const modules = [
      { text: 'POS', url: '/pos', heading: 'Point of Sale' },
      { text: 'Schedule', url: '/schedule', heading: 'Schedule' },
      { text: 'Inventory', url: '/inventory', heading: 'Inventory' },
      { text: 'Suppliers', url: '/suppliers', heading: 'Supplier Management' },
      { text: 'Reports', url: '/reports', heading: 'Business Insights' },
      { text: 'Barbers', url: '/barbers', heading: 'Team Management' },
      { text: 'Customers', url: '/customers', heading: 'Customer Directory' },
      { text: 'Settings', url: '/settings', heading: 'Shop Settings' },
    ];

    for (const module of modules) {
      await page.click(`text=${module.text}`);
      await expect(page).toHaveURL(module.url);
      await expect(page.locator('h1')).toContainText(module.heading);
    }
  });

  test('should complete a minimal checkout flow', async ({ page }) => {
    await page.click('text=POS');
    await page.selectOption('select:near(:text("Select Professional"))', { index: 1 });
    await page.locator('button', { hasText: 'Haircut' }).first().click();
    await page.click('button:has-text("Review & Checkout")');
    await page.click('button:has-text("Complete Payment")');
    await expect(page.locator('.modal-content')).toContainText('Sale Completed');
  });

  test('should open booking modal and show services', async ({ page }) => {
    await page.click('text=Schedule');
    await page.click('button:has-text("Book New")');
    await expect(page.locator('.modal-content')).toContainText('Book Appointment');
    
    // Target service select specifically within the modal context
    // nth(0) is barber, nth(1) is customer, nth(2) is service
    const serviceSelect = page.locator('.modal-content select').nth(2);
    await expect(serviceSelect).toContainText('Haircut');
  });
});
