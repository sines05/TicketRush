import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard & Event Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Admin
    await page.goto('/auth/login');
    await page.locator('input[placeholder="you@example.com"]').fill('admin@ticketrush.com');
    await page.locator('input[type="password"]').fill('password');
    await page.click('button:has-text("Đăng nhập")');
    await expect(page).toHaveURL('/admin/dashboard');
  });

  test('Admin can view dashboard stats', async ({ page }) => {
    // Check KPI cards
    await expect(page.locator('text=Doanh thu')).toBeVisible();
    await expect(page.locator('text=Vé đã bán')).toBeVisible();
    await expect(page.locator('text=Tỉ lệ lấp đầy')).toBeVisible();

    // Check charts
    await expect(page.locator('text=Phân bố Giới tính')).toBeVisible();
    await expect(page.locator('text=Nhóm tuổi')).toBeVisible();

    // Check events list
    await expect(page.locator('text=Danh sách Sự kiện')).toBeVisible();
  });

  test('Admin can create a new event', async ({ page }) => {
    await page.click('text=Tạo sự kiện mới');
    await expect(page).toHaveURL('/admin/events/new');

    const eventTitle = `E2E Test Event ${Date.now()}`;
    await page.fill('input[placeholder="VD: Rock Night 2026"]', eventTitle);
    await page.selectOption('select', 'music_festival');
    await page.fill('input[placeholder="Mô tả ngắn về sự kiện"]', 'This is a test event created by Playwright.');
    
    // Zone setup - default zone should exist
    await expect(page.locator('button:has-text("Front Stalls")').first()).toBeVisible();
    
    // Submit
    await page.click('button:has-text("Tạo trên backend")');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/admin/dashboard', { timeout: 10000 });
    
    // Refresh to make sure the list is updated
    await page.reload();
    
    // Verify event in list
    await expect(page.locator(`h3:has-text("${eventTitle}")`)).toBeVisible();
  });

  test('Admin can access Check-in page', async ({ page }) => {
    await page.click('text=Check-in vé');
    await expect(page).toHaveURL('/admin/check-in');
    
    await expect(page.locator('text=Admin Check-in')).toBeVisible();
    await expect(page.locator('text=Chọn sự kiện')).toBeVisible();
    await expect(page.locator('input[placeholder="Nhập QR token ở đây"]')).toBeVisible();
  });
});
