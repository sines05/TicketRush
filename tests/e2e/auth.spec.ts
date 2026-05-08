import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('Customer should be able to login', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[placeholder="you@example.com"]').fill('customer@ticketrush.com');
    await page.locator('input[type="password"]').fill('password');
    await page.click('button:has-text("Đăng nhập")');

    await expect(page).toHaveURL('/');
  });

  test('Admin should be able to login and see dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[placeholder="you@example.com"]').fill('admin@ticketrush.com');
    await page.locator('input[type="password"]').fill('password');
    await page.click('button:has-text("Đăng nhập")');

    await expect(page).toHaveURL('/admin/dashboard');
  });

  test('Should show error on invalid login', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[placeholder="you@example.com"]').fill('wrong@example.com');
    await page.locator('input[type="password"]').fill('wrongpass');
    await page.click('button:has-text("Đăng nhập")');

    // The error message might be specific or generic, wait for the error container
    await expect(page.locator('.bg-danger\\/10')).toBeVisible();
  });
});
