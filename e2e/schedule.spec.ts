import { test, expect } from '@playwright/test';

test.describe('Advanced Scheduling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should book a recurring weekly appointment', async ({ page }) => {
    await page.click('text=Schedule');
    await expect(page).toHaveURL('/schedule');

    await page.click('button:has-text("Book New")');
    
    // Fill the form
    await page.selectOption('label:has-text("Select Professional") + select', { label: 'Nathaniel' });
    await page.selectOption('label:has-text("Service") + select', { label: 'Haircut (30m) - $25' });
    await page.fill('input[type="time"]', '11:00');
    
    // Set recurrence
    await page.selectOption('select:near(:text("Recurring Appointment"))', { label: 'Weekly' });
    await page.fill('input[placeholder="Count"]', '3');

    await page.click('button:has-text("Confirm Booking")');

    // Verify first one appears in the main schedule card
    const appointmentCard = page.locator('.card', { hasText: 'Nathaniel' });
    await expect(appointmentCard).toBeVisible();
    await expect(appointmentCard).toContainText('Haircut');
  });
});
