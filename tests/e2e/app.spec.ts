import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Expense Categorizer/);
});

test('displays welcome message', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Welcome to Expense Categorizer' })
  ).toBeVisible();
});
