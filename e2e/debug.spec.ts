import { test, expect } from '@playwright/test';

test('debug frontend load', async ({ page }) => {
  await page.goto('/login'); // Go specifically to login
  await page.waitForLoadState('networkidle');
  const h1 = await page.locator('h1').innerText();
  console.log('H1 Text:', h1);
  const body = await page.content();
  console.log('Body snippet:', body.substring(0, 500));
});
