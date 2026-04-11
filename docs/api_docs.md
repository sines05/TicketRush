---

**Cập nhật:** 12/04/2026 | **Version:** 1.0.0

> **QUY ƯỚC CHUNG:**
> 
> - **Base URL:** `http://localhost:8080/api/v1`
> - **Content-Type:** `application/json`
> - **Authentication:** API nào có ghi `[Auth: Bearer]` yêu cầu gửi kèm header: `Authorization: Bearer <Access_Token>`

### STANDARD RESPONSE FORMAT

Tất cả API (kể cả khi báo lỗi) đều phải trả về đúng format này:

```json
{
  "success": true, // true hoặc false
  "data": { ... }, // Object, Array hoặc null nếu lỗi
  "message": "Thông báo cho người dùng",
  "errorCode": "MÃ_LỖI_NỘI_BỘ" // Trống nếu success là true
}
```

---

## PHẦN 1: TÀI KHOẢN (AUTHENTICATION)

### 1.1. Đăng ký tài khoản (Register)

*Yêu cầu bắt buộc lấy ngày sinh và giới tính để Admin làm thống kê.*

- **Method:** `POST /auth/register`
- **Body:**
    
    ```json
    {
      "email": "khachhang@gmail.com",
      "password": "Password123!",
      "full_name": "Nguyễn Văn A",
      "gender": "MALE", // MALE, FEMALE, OTHER
      "date_of_birth": "2000-12-25"
    }
    ```
    
- 🟢 **Response (201 Created):** `{"success": true, "message": "Đăng ký thành công", "data": null}`

### 1.2. Đăng nhập (Login)

- **Method:** `POST /auth/login`
- **Body:** `{ "email": "khachhang@gmail.com", "password": "Password123!" }`
- 🟢 **Response (200 OK):**
    
    ```json
    "data": {
      "user_id": "uuid-...",
      "full_name": "Nguyễn Văn A",
      "role": "CUSTOMER",
      "access_token": "eyJhbGciOiJIUzI1NiIsIn..."
    }
    ```
    

---

## PHẦN 2: PUBLIC (SỰ KIỆN & SƠ ĐỒ GHẾ)

### 2.1a. Lấy danh sách Sự kiện

- **Method:** `GET /events`
- 🟢 **Response (200 OK):**
    
    ```json
    "data": [
      {
        "id": "uuid-event-1",
        "title": "Sơn Tùng M-TP - Sky Tour 2026",
        "banner_url": "https://...",
        "start_time": "2026-05-20T20:00:00Z"
      }
    ]
    ```
    

### 2.1b. Lấy chi tiết sự kiện

*Frontend gọi API này để hiển thị thông tin mô tả chi tiết sự kiện trước khi người dùng bấm vào xem sơ đồ ghế.*

- **Method:** `GET /events`
- 🟢 **Response (200 OK):**
    
    ```json
    {
      "success": true,
      "message": "Thành công",
      "data": {
        "id": "uuid-event-1",
        "title": "Sơn Tùng M-TP - Sky Tour 2026",
        "description": "Đêm nhạc bùng nổ nhất năm 2026 với sân khấu hoành tráng...",
        "banner_url": "https://...",
        "start_time": "2026-05-20T20:00:00Z",
        "end_time": "2026-05-20T23:30:00Z"
      }
    }
    ```
    

### 2.2. Lấy Sơ đồ ghế (Ma trận)

- **Method:** `GET /events/:event_id/seat-map`
- 🟢 **Response (200 OK):**
    
    ```json
    {
      "success": true,
      "message": "Thành công",
      "data": {
        "event_id": "uuid-event-1",
        "zones": [
          {
            "zone_id": "uuid-vip",
            "name": "Khu VIP A",
            "price": 2000000,
            "seats": [
              { "seat_id": "uuid-seat-1", "row_label": "A", "seat_number": 1, "status": "AVAILABLE" },
              { "seat_id": "uuid-seat-2", "row_label": "A", "seat_number": 2, "status": "LOCKED", "locked_by_user_id": "uuid-user-123" },
              { "seat_id": "uuid-seat-3", "row_label": "A", "seat_number": 3, "status": "SOLD" }
            ]
          }
        ]
      }
    }
    ```
    

*(**Ghi chú cho FE:** Nếu status == 'LOCKED' VÀ locked_by_user_id == current_user_id, hãy tô màu ghế đó là màu vàng (Ghế đang được chính user này giữ). Nếu locked_by_user_id khác user hiện tại, tô màu xám/disable).*

## PHẦN 3: CORE BUSINESS (GIỮ GHẾ & THANH TOÁN)

### 3.1. Xếp hàng ảo - Virtual Queue

*FE gọi liên tục (Polling) API này để lấy thứ tự.*

- **Method:** `POST /queue/join` `[Auth: Bearer]`
- **Body:** `{ "event_id": "uuid-event-1" }`
- 🟡 **Response (202 Accepted - Đang chờ):**`"data": { "status": "WAITING", "queue_position": 105 }`
- 🟢 **Response (200 OK - Đến lượt):**`"data": { "status": "PASSED", "queue_token": "token-dac-biet" }`

### 3.2. Giữ ghế & Tạo Đơn hàng Nháp (Race Condition Logic)

*API quan trọng nhất. Phải dùng DB Transaction & Row Locking.*

- **Method:** `POST /orders/lock-seats` `[Auth: Bearer]`
- **Headers:** `X-Queue-Token: <token-dac-biet>` (Nếu có làm Hàng chờ ảo)
- **Body:**
    
    ```json
    {
      "event_id": "uuid-event-1",
      "seat_ids": ["uuid-seat-A1", "uuid-seat-A2"]
    }
    ```
    
- 🟢 **Response (200 OK):**
    
    ```json
    "data": {
      "order_id": "uuid-order-abc",
      "total_amount": 4000000,
      "status": "PENDING",
      "expires_at": "2026-04-12T17:10:00Z" // Có 10 phút để thanh toán
    }
    ```
    
- 🔴 **Response (409 Conflict):**`{"success": false, "errorCode": "SEAT_ALREADY_TAKEN", "message": "Ghế đã bị người khác chọn."}`

### 3.3. Xác nhận Thanh toán (Checkout)

- **Method:** `POST /orders/checkout` `[Auth: Bearer]`
- **Body:** `{ "order_id": "uuid-order-abc" }`
- 🟢 **Response (200 OK):**
    
    ```json
    "data": {
      "order_id": "uuid-order-abc",
      "status": "COMPLETED",
      "ticket_count": 2
    },
    "message": "Thanh toán thành công! Vé đã được tạo."
    ```
    
- 🔴 **Response (400 Bad Request):**`{"success": false, "errorCode": "ORDER_EXPIRED", "message": "Đơn hàng đã hết hạn giữ chỗ 10 phút."}`

---

## PHẦN 4: VÉ ĐIỆN TỬ (TICKETS)

### 4.1. Lấy danh sách vé của tôi

- **Method:** `GET /tickets/my-tickets` `[Auth: Bearer]`
- 🟢 **Response (200 OK):**
    
    ```json
    "data": [
      {
        "ticket_id": "uuid-ticket-1",
        "event_title": "Sky Tour 2026",
        "zone_name": "Khu VIP A",
        "seat_label": "A-1",
        "qr_code_token": "TICKETRUSH-XYZ-12345",
        "is_checked_in": false
      }
    ]
    ```
    

---

## PHẦN 5: ADMIN & QUẢN TRỊ

### 5.1. Admin tạo Sự kiện và Sinh ma trận ghế

*Backend sẽ tự động chia vòng lặp để Insert vào bảng `event_zones` và `seats`.*

- **Method:** `POST /admin/events` `[Auth: Bearer - Yêu cầu role ADMIN]`
- **Body:**
    
    ```json
    {
      "title": "EDM Festival 2026",
      "start_time": "2026-06-01T18:00:00Z",
      "zones": [
        {
          "name": "Khu VIP",
          "price": 2000000,
          "total_rows": 5,
          "seats_per_row": 10
        }
      ]
    }
    ```
    
- 🟢 **Response (201 Created):** `{"success": true, "message": "Đã tạo sự kiện và sinh thành công 50 ghế"}`

### 5.2. Admin Dashboard (Thống kê)

- **Method:** `GET /admin/dashboard/stats?event_id=uuid-event-1` `[Auth: Bearer]`
- 🟢 **Response (200 OK):**
    
    ```json
    "data": {
      "total_revenue": 500000000,
      "total_tickets_sold": 450,
      "fill_rate_percentage": 90.5,
      "demographics": {
        "gender": { "MALE": 200, "FEMALE": 230, "OTHER": 20 },
        "age_groups": { "18-24": 300, "25-34": 100, "35+": 50 }
      }
    }
    ```
    

---

### GÓC LƯU Ý

1. **Cho Frontend**
    - Vẽ sơ đồ ghế: Gọi API `2.2`, dùng vòng lặp render theo `row_label` và `seat_number`.
    - Render mã QR: Lấy chuỗi `qr_code_token` ở API `4.1` ném vào thư viện `qrcode.react` để gen ra hình ảnh mã vạch.
    - Khi gọi API `3.2` Lock ghế, chạy đồng hồ đếm ngược 10 phút từ tham số `expires_at` trả về.
    - **Tích hợp WebSocket:** Thay vì dùng Polling (F5 lại trang), hãy lắng nghe sự kiện `SEAT_UPDATED` từ socket để đổi màu ghế real-time.
2. **Cho Backend**
    - **API 3.2 (Lock Seats):** Tuyệt đối bắt buộc phải dùng `BEGIN` -> `SELECT ... FOR UPDATE` -> `UPDATE seats` -> `INSERT orders` -> `INSERT order_items` -> `COMMIT`. (Xử lý Race Condition).
    - **Background Worker (Cronjob):** Viết 1 script chạy mỗi 1 phút: Quét bảng `orders` tìm các đơn hàng có `status = 'PENDING'` VÀ `expires_at <= NOW()`. Nếu thấy -> Update order thành `CANCELLED` -> Trả trạng thái của các `seats` liên quan về `AVAILABLE`.
    - **API 5.1:** Khi Admin tạo sự kiện có ma trận 10 hàng x 20 ghế. Dùng vòng lặp tạo 200 bản ghi ghế chèn vào DB. Nhớ dùng Bulk Insert để khỏi sập DB.
- **Logic Checkout API (3.3):** Khi orders.status cập nhật thành COMPLETED, backend **bắt buộc** phải thực hiện thêm 2 việc trong cùng 1 Transaction:
    1. Update bảng seats: Chuyển status = 'SOLD' đối với các ghế nằm trong order_items.
    2. Insert dữ liệu vào bảng tickets: Lặp qua các ghế đã mua, mỗi ghế tạo 1 bản ghi vé, sinh ra một chuỗi qr_code_token ngẫu nhiên và unique.
- **Bảo mật Hàng chờ Ảo (API 3.2):** Nếu đã triển khai Virtual Queue, Backend phải lấy X-Queue-Token từ Header. Verify xem token này có hợp lệ và được cấp phép vào mua vé hay không (dùng Redis để lưu token hợp lệ). Không có token -> Trả về 403 Forbidden.
- **Dọn dẹp ghế quá hạn (Cronjob Release Seats):** Trong file script chạy quét đơn hàng hết hạn 10 phút, khi rollback vé về AVAILABLE, nhớ phải update set locked_by_user_id = NULL và locked_at = NULL để ghế hoàn toàn trống, sẵn sàng cho người khác mua.
- **Logic tự sinh nhãn ghế (Row Label) ở API 5.1:** Frontend truyền vào "total_rows": 5, Backend tự động code logic vòng lặp để map 1 -> A, 2 -> B, 3 -> C, 4 -> D, 5 -> E để insert dữ liệu cột row_label vào bảng seats cho đúng chuẩn thiết kế cơ sở dữ liệu.