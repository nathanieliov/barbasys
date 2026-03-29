import { test, expect } from '@playwright/test';

test.describe('Scheduling Robustness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should fail to book appointment during non-working hours', async ({ page }) => {
    await page.click('text=Schedule');
    await page.click('button:has-text("Book Appointment")');
    
    await page.selectOption('p:has-text("Barber") + select', { label: 'Nathaniel' });
    await page.selectOption('p:has-text("Service") + select', { label: 'Haircut (30m)' });
    await page.fill('input[type="time"]', '02:00'); // 2 AM
    
    await page.click('button:has-text("Create Appointments")');

    // Should show error message
    const errorMsg = page.locator('.modal-content');
    await expect(errorMsg).toContainText(/Barber not working/i);
  });

  test('should fail to book conflicting appointment', async ({ page }) => {
    await page.click('text=Schedule');
    
    // 1. Book first appointment
    await page.click('button:has-text("Book Appointment")');
    await page.selectOption('p:has-text("Barber") + select', { label: 'Alex' });
    await page.selectOption('p:has-text("Service") + select', { label: 'Haircut (30m)' });
    await page.fill('input[type="time"]', '10:00');
    await page.click('button:has-text("Create Appointments")');
    
    // Wait for modal to close
    await expect(page.locator('.modal-content')).not.toBeVisible();

    // 2. Try to book overlapping appointment
    await page.click('button:has-text("Book Appointment")');
    await page.selectOption('p:has-text("Barber") + select', { label: 'Alex' });
    await page.selectOption('p:has-text("Service") + select', { label: 'Haircut (30m)' });
    await page.fill('input[type="time"]', '10:15'); // Overlaps with 10:00-10:30
    await page.click('button:has-text("Create Appointments")');

    // Should show error message
    await expect(page.locator('.modal-content')).toContainText(/Conflict/i);
  });

  test('should properly check-in an appointment and pre-fill POS', async ({ page }) => {
    await page.click('text=Schedule');
    
    // Create an appointment for "Check-in Test"
    await page.click('button:has-text("Book Appointment")');
    await page.selectOption('p:has-text("Barber") + select', { label: 'Nathaniel' });
    await page.selectOption('p:has-text("Service") + select', { label: 'Beard Trim (15m)' });
    await page.fill('input[type="time"]', '14:00');
    await page.click('button:has-text("Create Appointments")');
    
    await expect(page.locator('.modal-content')).not.toBeVisible();

    // Find the appointment and click Check-in
    const appointmentCard = page.locator('.card').filter({ hasText: 'Beard Trim' }).filter({ hasText: '14:00' });
    await appointmentCard.click(); // Open details if needed, or just find the button
    
    const checkInBtn = page.locator('button:has-text("Check-in")');
    await checkInBtn.click();

    // Should redirect to POS
    await expect(page).toHaveURL(/\/pos/);
    
    // Verify cart contains the service
    await expect(page.locator('.pos-cart')).toContainText('Beard Trim');
    await expect(page.locator('.pos-cart')).toContainText('$15');
  });
});
