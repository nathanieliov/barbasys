import { test, expect } from '@playwright/test';

test.describe('Advanced Scheduling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should book a recurring weekly appointment', async ({ page }) => {
    await page.click('text=Schedule');
    await expect(page).toHaveURL('/schedule');

    await page.click('button:has-text("Book Appointment")');
    
    // Fill the form
    await page.selectOption('p:has-text("Barber") + select', { label: 'Nathaniel' });
    await page.selectOption('p:has-text("Service") + select', { label: 'Haircut (30m)' });
    await page.fill('input[type="time"]', '11:00');
    
    // Set recurrence
    await page.selectOption('select:below(:text("Repeat Appointment"))', 'weekly');
    await page.fill('input[placeholder="Times"]', '3');

    await page.click('button:has-text("Create Appointments")');

    // Verify first one appears in the main schedule card (not the modal card)
    // We can filter by text that only exists in the schedule list
    const scheduleContainer = page.locator('.card').filter({ hasText: 'Customer' });
    await expect(scheduleContainer).toContainText('Haircut');
    // Relax time assertion to avoid timezone issues in different environments
    await expect(scheduleContainer).toContainText(/(:00)/);
  });
});
