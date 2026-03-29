import { test, expect } from '@playwright/test';

test.describe('Barber Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should add a new barber successfully', async ({ page }) => {
    await page.click('text=Barbers');
    await expect(page.locator('h1')).toContainText('Manage Barbers');

    const barberName = 'E2E Barber ' + Math.random().toString(36).substring(7);
    await page.fill('input[placeholder="Full Name"]', barberName);
    await page.fill('p:has-text("Service Rate") + input', '0.7');
    await page.fill('p:has-text("Product Rate") + input', '0.2');
    
    await page.click('button:has-text("Add Barber")');

    // Check if the new barber is in the list
    await expect(page.locator('.card').filter({ hasText: 'Current Team' })).toContainText(barberName);
    await expect(page.locator('.card').filter({ hasText: 'Current Team' })).toContainText('Services: 70%');
    await expect(page.locator('.card').filter({ hasText: 'Current Team' })).toContainText('Products: 20%');
  });
});
