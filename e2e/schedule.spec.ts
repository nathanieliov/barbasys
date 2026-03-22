import { test, expect } from '@playwright/test';

test.describe('Advanced Scheduling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="Username"]', 'admin');
    await page.fill('input[placeholder="Password"]', 'admin123');
    await page.click('button:has-text("Login")');
  });

  test('should book a recurring weekly appointment', async ({ page }) => {
    await page.click('text=Schedule');
    await expect(page).toHaveURL('/schedule');

    await page.click('button:has-text("Book Appointment")');
    
    // Fill the form
    await page.selectOption('select:below(:text("Barber"))', { label: 'Nathaniel' });
    await page.selectOption('select:below(:text("Service"))', { label: 'Haircut (30m)' });
    await page.fill('input[type="time"]', '11:00');
    
    // Set recurrence
    await page.selectOption('select:below(:text("Repeat Appointment"))', 'weekly');
    await page.fill('input[placeholder="Times"]', '3');

    await page.click('button:has-text("Create Appointments")');

    // Verify first one appears
    await expect(page.locator('.card')).toContainText('Haircut');
    await expect(page.locator('.card')).toContainText('11:00 AM');
  });
});
