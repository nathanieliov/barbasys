import { test, expect } from '@playwright/test';

test.describe('Barber Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should add a new barber successfully', async ({ page }) => {
    await page.click('text=Barbers');
    await expect(page.locator('h1')).toContainText('Team Management');

    await page.click('button:has-text("Add Professional")');

    const barberName = 'E2E Barber ' + Math.random().toString(36).substring(7);
    await page.fill('input[placeholder="e.g. John Doe"]', barberName);
    await page.fill('label:has-text("Service Rate") + input', '0.7');
    await page.fill('label:has-text("Product Rate") + input', '0.2');
    
    await page.click('button:has-text("Confirm Registration")');

    // Check if the new barber is in the list
    const barberCard = page.locator('.card', { hasText: barberName });
    await expect(barberCard).toBeVisible();
    await expect(barberCard).toContainText('70%');
    await expect(barberCard).toContainText('20%');
  });
});
