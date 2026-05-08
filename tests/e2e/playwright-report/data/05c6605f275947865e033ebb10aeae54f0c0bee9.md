# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: booking.spec.ts >> Booking Flow & WebSocket Sync >> Real-time Seat Locking (WebSocket Sync)
- Location: booking.spec.ts:31:7

# Error details

```
Error: expect(locator).toHaveClass(expected) failed

Locator: locator('button[title^="A-1 •"]')
Expected pattern: /bg-seat-locked/
Received string:  "h-8 w-8 select-none rounded-md text-[10px] font-semibold transition bg-seat-available text-black hover:opacity-90"
Timeout: 10000ms

Call log:
  - Expect "toHaveClass" with timeout 10000ms
  - waiting for locator('button[title^="A-1 •"]')
    14 × locator resolved to <button type="button" title="A-1 • AVAILABLE" class="h-8 w-8 select-none rounded-md text-[10px] font-semibold transition bg-seat-available text-black hover:opacity-90">1</button>
       - unexpected value "h-8 w-8 select-none rounded-md text-[10px] font-semibold transition bg-seat-available text-black hover:opacity-90"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - link "TicketRush TicketRush Săn vé nhanh • Trải nghiệm mượt" [ref=e6] [cursor=pointer]:
        - /url: /
        - img "TicketRush" [ref=e9]
        - generic [ref=e10]:
          - generic [ref=e11]: TicketRush
          - generic [ref=e12]: Săn vé nhanh • Trải nghiệm mượt
      - navigation [ref=e13]:
        - textbox "Tìm sự kiện..." [ref=e15]
        - link "Hàng chờ" [ref=e16] [cursor=pointer]:
          - /url: /booking/queue
        - link "Thành viên" [ref=e17] [cursor=pointer]:
          - /url: /membership
        - link "Hỗ trợ" [ref=e18] [cursor=pointer]:
          - /url: /feedback
        - link "Vé của tôi" [ref=e19] [cursor=pointer]:
          - /url: /my-tickets
        - generic [ref=e20]:
          - 'button "Đổi giao diện: Sáng" [ref=e21] [cursor=pointer]':
            - img [ref=e22]
          - button "Hồ sơ cá nhân" [ref=e28] [cursor=pointer]:
            - generic [ref=e29]: "N"
          - generic [ref=e30]: Nguyễn Linh Chi
          - button "Đăng xuất" [ref=e31] [cursor=pointer]
  - main [ref=e32]:
    - generic [ref=e33]:
      - generic [ref=e34]:
        - generic [ref=e35]:
          - generic [ref=e36]:
            - generic [ref=e37]: Thanh toán
            - generic [ref=e38]: "Jack - J97 Concert: Đom Đóm In The Stars"
          - generic [ref=e39]: "Còn lại: 09:50"
        - generic [ref=e40]:
          - generic [ref=e41]:
            - generic [ref=e42]:
              - generic [ref=e43]: A-1
              - generic [ref=e44]: Standard A
            - generic [ref=e45]: 1.200.000 ₫
          - generic [ref=e46]:
            - generic [ref=e47]:
              - generic [ref=e48]: Tổng cộng
              - generic [ref=e49]: 1.200.000 ₫
            - generic [ref=e50]:
              - button "Sửa ghế" [ref=e51] [cursor=pointer]
              - button "Thanh toán" [ref=e52] [cursor=pointer]
            - generic [ref=e53]: "Theo contract: gọi `POST /orders/checkout` với `order_id`."
      - complementary [ref=e54]:
        - generic [ref=e55]: Lưu ý
        - list [ref=e56]:
          - listitem [ref=e57]: Checkout có đếm ngược 10 phút (demo)
          - listitem [ref=e58]: Hết giờ sẽ xóa ghế đang giữ và yêu cầu chọn lại
          - listitem [ref=e59]: Vé hiển thị QR Code bằng thư viện
  - contentinfo [ref=e60]:
    - generic [ref=e61]: TicketRush • Demo UI (React) • Có hỗ trợ light/dark
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Booking Flow & WebSocket Sync', () => {
  4   |   test('Customer can join queue and reach seatmap', async ({ page }) => {
  5   |     // Login
  6   |     await page.goto('/auth/login');
  7   |     await page.locator('input[placeholder="you@example.com"]').fill('customer@ticketrush.com');
  8   |     await page.locator('input[type="password"]').fill('password');
  9   |     await page.click('button:has-text("Đăng nhập")');
  10  | 
  11  |     await expect(page).toHaveURL('/');
  12  | 
  13  |     // Select first event
  14  |     const firstEventCard = page.locator('.tr-event-card').first();
  15  |     await firstEventCard.scrollIntoViewIfNeeded();
  16  |     await firstEventCard.locator('button:has-text("Xem chi tiết"), a:has-text("Xem chi tiết")').first().click();
  17  | 
  18  |     // Click Buy Ticket
  19  |     await page.click('button:has-text("Mua vé")');
  20  | 
  21  |     // Should be in queue
  22  |     await expect(page).toHaveURL(/\/booking\/queue/);
  23  |     await expect(page.locator('text=Đang xếp hàng...')).toBeVisible();
  24  | 
  25  |     // Wait for redirect to seatmap (mock or real)
  26  |     // Polling interval is 1.2s, so we wait a bit
  27  |     await expect(page).toHaveURL(/\/booking\/seats/, { timeout: 15000 });
  28  |     await expect(page.locator('text="Chọn ghế"').first()).toBeVisible();
  29  |   });
  30  | 
  31  |   test('Real-time Seat Locking (WebSocket Sync)', async ({ browser }) => {
  32  |     // Create two independent browser contexts
  33  |     const contextA = await browser.newContext();
  34  |     const contextB = await browser.newContext();
  35  | 
  36  |     const pageA = await contextA.newPage();
  37  |     const pageB = await contextB.newPage();
  38  | 
  39  |     // Login A
  40  |     await pageA.goto('/auth/login');
  41  |     await pageA.locator('input[placeholder="you@example.com"]').fill('linhchi@gmail.com');
  42  |     await pageA.locator('input[type="password"]').fill('password');
  43  |     await pageA.click('button:has-text("Đăng nhập")');
  44  | 
  45  |     // Login B
  46  |     await pageB.goto('/auth/login');
  47  |     await pageB.locator('input[placeholder="you@example.com"]').fill('minhduc@gmail.com');
  48  |     await pageB.locator('input[type="password"]').fill('password');
  49  |     await pageB.click('button:has-text("Đăng nhập")');
  50  | 
  51  |     // Page A joins queue and gets to seatmap
  52  |     await pageA.goto('/');
  53  |     const firstEventCardA = pageA.locator('.tr-event-card').first();
  54  |     await firstEventCardA.locator('button:has-text("Xem chi tiết"), a:has-text("Xem chi tiết")').first().click();
  55  |     await pageA.waitForURL(/\/events\/.+/);
  56  |     await pageA.click('button:has-text("Mua vé")');
  57  |     await expect(pageA).toHaveURL(/\/booking\/seats/, { timeout: 15000 });
  58  |     const seatmapUrlA = pageA.url();
  59  |     
  60  |     // Page B joins queue for the SAME event
  61  |     await pageB.goto('/');
  62  |     const firstEventCardB = pageB.locator('.tr-event-card').first();
  63  |     await firstEventCardB.locator('button:has-text("Xem chi tiết"), a:has-text("Xem chi tiết")').first().click();
  64  |     await pageB.waitForURL(/\/events\/.+/);
  65  |     await pageB.click('button:has-text("Mua vé")');
  66  |     await expect(pageB).toHaveURL(/\/booking\/seats/, { timeout: 15000 });
  67  | 
  68  |     // Wait for seatmap to load
  69  |     await expect(pageA.locator('button[title*="AVAILABLE"]').first()).toBeVisible();
  70  |     await expect(pageB.locator('button[title*="AVAILABLE"]').first()).toBeVisible();
  71  | 
  72  |     // Page A clicks an available seat
  73  |     const seatToLock = pageA.locator('button[title*="AVAILABLE"]').first();
  74  |     const seatTitle = await seatToLock.getAttribute('title');
  75  |     const seatLabel = seatTitle?.split(' • ')[0]; // e.g. "A-1"
  76  | 
  77  |     await seatToLock.click();
  78  | 
  79  |     // Verify Page A shows it as selected
  80  |     await expect(seatToLock).toHaveClass(/bg-seat-selected/);
  81  |     
  82  |     // Wait for the state to update and button to be enabled
  83  |     await pageA.waitForTimeout(500);
  84  |     
  85  |     // Check for "Đặt vé" or "Tiếp tục" or "Xác nhận"
  86  |     const lockButton = pageA.locator('button:has-text("Đặt vé"), button:has-text("Tiếp tục"), button:has-text("Xác nhận")').first();
  87  |     await lockButton.click();
  88  |     await expect(pageA).toHaveURL(/\/booking\/checkout/, { timeout: 10000 });
  89  | 
  90  |     // Verify Page B shows it as LOCKED (WebSocket sync)
  91  |     // The selector for B should find the seat by title starting with the exact label and a space
  92  |     const seatInB = pageB.locator(`button[title^="${seatLabel} •"]`);
> 93  |     await expect(seatInB).toHaveClass(/bg-seat-locked/, { timeout: 10000 });
      |                           ^ Error: expect(locator).toHaveClass(expected) failed
  94  |     
  95  |     await contextA.close();
  96  |     await contextB.close();
  97  |   });
  98  | 
  99  |   test('Session Retention after page reload', async ({ page }) => {
  100 |     // Login
  101 |     await page.goto('/auth/login');
  102 |     await page.locator('input[placeholder="you@example.com"]').fill('thuytrang@gmail.com');
  103 |     await page.locator('input[type="password"]').fill('password');
  104 |     await page.click('button:has-text("Đăng nhập")');
  105 | 
  106 |     // Go to seatmap
  107 |     // First, let's get a real event ID by visiting home page
  108 |     await page.goto('/');
  109 |     const firstEventCard = page.locator('.tr-event-card').first();
  110 |     await firstEventCard.locator('button:has-text("Xem chi tiết"), a:has-text("Xem chi tiết")').first().click();
  111 |     await page.waitForURL(/\/events\/.+/);
  112 |     await page.click('button:has-text("Mua vé")');
  113 |     await expect(page).toHaveURL(/\/booking\/seats/, { timeout: 25000 });
  114 | 
  115 |     // Select a seat
  116 |     const seat = page.locator('button[title*="AVAILABLE"]').first();
  117 |     await seat.click();
  118 |     await expect(seat).toHaveClass(/bg-seat-selected/);
  119 | 
  120 |     // Reload page
  121 |     await page.reload();
  122 | 
  123 |     // Check if seat is still locked/selected for me
  124 |     // Wait for seatmap to reload
  125 |     const seatAfterReload = page.locator('button[title*="AVAILABLE"]').first(); 
  126 |     // Wait, if it was selected, it might no longer match "AVAILABLE" title in DOM
  127 |     // Let's use a more stable selector if possible, but for now let's check by class
  128 |     // In SeatMap.jsx, lockedByMe seats get 'bg-seat-selected'
  129 |     await expect(page.locator('button.bg-seat-selected')).toBeVisible({ timeout: 10000 });
  130 |   });
  131 | });
  132 | 
```