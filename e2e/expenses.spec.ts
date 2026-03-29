import { test, expect } from '@playwright/test';

test.describe('Expense Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should log a new expense successfully', async ({ page }) => {
    await page.click('text=Expenses');
    await expect(page.locator('h1')).toContainText('Expense Tracking');

    await page.click('button:has-text("Log Expense")');

    const amount = '45.50';
    const description = 'E2E Test Expense ' + Math.random().toString(36).substring(7);

    await page.selectOption('label:has-text("Category") + select', { label: 'Supplies' });
    await page.fill('input[type="number"]', amount);
    await page.fill('textarea', description);
    
    await page.click('button:has-text("Confirm Expense")');

    // Check if the new expense is in the list
    const expenseCard = page.locator('.card', { hasText: description });
    await expect(expenseCard).toBeVisible();
    await expect(expenseCard).toContainText('Supplies');
    await expect(expenseCard).toContainText('-$45.50');
  });
});
