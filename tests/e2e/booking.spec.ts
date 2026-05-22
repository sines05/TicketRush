import { test, expect } from '@playwright/test';

test.describe('Booking Flow & WebSocket Sync', () => {
  test('Customer can join queue and reach seatmap', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.locator('input[placeholder="you@example.com"]').fill('customer@ticketrush.com');
    await page.locator('input[type="password"]').fill('password');
    await page.click('button:has-text("Đăng nhập")');

    await expect(page).toHaveURL('/');

    // Select first event
    const firstEventCard = page.locator('.tr-event-card').first();
    await firstEventCard.scrollIntoViewIfNeeded();
    await firstEventCard.locator('button:has-text("Xem chi tiết"), a:has-text("Xem chi tiết")').first().click();

    // Click Buy Ticket
    await page.click('button:has-text("Mua vé")');

    // Should be in queue
    await expect(page).toHaveURL(/\/booking\/queue/);
    await expect(page.locator('text=Đang xếp hàng...')).toBeVisible();

    // Wait for redirect to seatmap (mock or real)
    // Polling interval is 1.2s, so we wait a bit
    await expect(page).toHaveURL(/\/booking\/seats/, { timeout: 15000 });
    await expect(page.locator('text="Chọn ghế"').first()).toBeVisible();
  });

  test('Real-time Seat Locking (WebSocket Sync)', async ({ browser }) => {
    // Create two independent browser contexts
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Login A
    await pageA.goto('/auth/login');
    await pageA.locator('input[placeholder="you@example.com"]').fill('linhchi@gmail.com');
    await pageA.locator('input[type="password"]').fill('password');
    await pageA.click('button:has-text("Đăng nhập")');
    await expect(pageA).toHaveURL('/');

    // Login B
    await pageB.goto('/auth/login');
    await pageB.locator('input[placeholder="you@example.com"]').fill('minhduc@gmail.com');
    await pageB.locator('input[type="password"]').fill('password');
    await pageB.click('button:has-text("Đăng nhập")');
    await expect(pageB).toHaveURL('/');

    // Page A joins queue and gets to seatmap
    await pageA.goto('/');
    const firstEventCardA = pageA.locator('.tr-event-card').first();
    await firstEventCardA.locator('button:has-text("Xem chi tiết"), a:has-text("Xem chi tiết")').first().click();
    await pageA.waitForURL(/\/events\/.+/);
    await pageA.click('button:has-text("Mua vé")');
    await expect(pageA).toHaveURL(/\/booking\/seats/, { timeout: 15000 });
    const seatmapUrlA = pageA.url();
    
    // Page B joins queue for the SAME event
    await pageB.goto('/');
    const firstEventCardB = pageB.locator('.tr-event-card').first();
    await firstEventCardB.locator('button:has-text("Xem chi tiết"), a:has-text("Xem chi tiết")').first().click();
    await pageB.waitForURL(/\/events\/.+/);
    await pageB.click('button:has-text("Mua vé")');
    await expect(pageB).toHaveURL(/\/booking\/seats/, { timeout: 15000 });

    // Wait for seatmap to load
    await expect(pageA.locator('button[title*="AVAILABLE"]').first()).toBeVisible();
    await expect(pageB.locator('button[title*="AVAILABLE"]').first()).toBeVisible();

    // Page A clicks an available seat
    const seatToLock = pageA.locator('button[title*="AVAILABLE"]').first();
    const seatId = await seatToLock.getAttribute('data-seat-id');

    await seatToLock.click();

    // Verify Page A shows it as selected
    await expect(seatToLock).toHaveClass(/bg-seat-selected/);
    
    // Wait for the state to update and button to be enabled
    await pageA.waitForTimeout(500);
    
    // Check for "Đặt vé" or "Tiếp tục" or "Xác nhận"
    const lockButton = pageA.locator('button:has-text("Đặt vé"), button:has-text("Tiếp tục"), button:has-text("Xác nhận")').first();
    await lockButton.click();
    await expect(pageA).toHaveURL(/\/booking\/checkout/, { timeout: 10000 });

    // Verify Page B shows it as LOCKED (WebSocket sync)
    const seatInB = pageB.locator(`button[data-seat-id="${seatId}"]`);
    await expect(seatInB).toHaveClass(/bg-seat-locked/, { timeout: 10000 });
    
    await contextA.close();
    await contextB.close();
  });

  test('Session Retention after page reload', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.locator('input[placeholder="you@example.com"]').fill('thuytrang@gmail.com');
    await page.locator('input[type="password"]').fill('password');
    await page.click('button:has-text("Đăng nhập")');
    await expect(page).toHaveURL('/');

    // Go to seatmap
    // First, let's get a real event ID by visiting home page
    await page.goto('/');
    const firstEventCard = page.locator('.tr-event-card').first();
    await firstEventCard.locator('button:has-text("Xem chi tiết"), a:has-text("Xem chi tiết")').first().click();
    await page.waitForURL(/\/events\/.+/);
    await page.click('button:has-text("Mua vé")');
    await expect(page).toHaveURL(/\/booking\/seats/, { timeout: 25000 });

    // Select a seat
    const seat = page.locator('button[title*="AVAILABLE"]').first();
    await seat.click();
    await expect(seat).toHaveClass(/bg-seat-selected/);

    // Reload page
    await page.reload();

    // Check if seat is still locked/selected for me
    // Wait for seatmap to reload
    const seatAfterReload = page.locator('button[title*="AVAILABLE"]').first(); 
    // Wait, if it was selected, it might no longer match "AVAILABLE" title in DOM
    // Let's use a more stable selector if possible, but for now let's check by class
    // In SeatMap.jsx, lockedByMe seats get 'bg-seat-selected'
    await expect(page.locator('button.bg-seat-selected')).toBeVisible({ timeout: 10000 });
  });
});
