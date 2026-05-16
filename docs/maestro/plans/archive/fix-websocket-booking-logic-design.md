---
title: "Fix WebSocket & Booking Logic"
created: "2026-05-16T12:08:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "medium"
---

# Fix WebSocket & Booking Logic Design Document

## Problem Statement

Hệ thống đặt vé TicketRush hiện đang gặp một số lỗi nghiêm trọng ngăn cản người dùng thao tác thực tế với server:
1. **Lỗi xác thực WebSocket**: Hook `useWebSocket.js` ở Frontend không gửi token xác thực khi khởi tạo kết nối (trong khi Backend yêu cầu header `Sec-WebSocket-Protocol` hoặc cookie). Điều này làm mọi kết nối realtime bị từ chối (Unauthorized).
2. **WebSocket trùng lặp**: Component `CanvasSeatmap.tsx` đang tự khởi tạo một đối tượng WebSocket riêng (cũng thiếu auth) thay vì sử dụng hook `useWebSocket` đã được xây dựng, gây dư thừa và không thể nhận được dữ liệu realtime về trạng thái ghế.
3. **Mắc kẹt ở Mock Mode**: Các service như `orderService.js` và `queueService.js` đang bật chế độ giả lập (Mock Mode) theo mặc định, khiến các thao tác chọn ghế, giữ chỗ và vào hàng đợi không được gửi tới Backend.
4. **Queue dùng Polling**: Hệ thống hàng đợi đang dùng cơ chế Polling (gọi lại API liên tục) thay vì tận dụng WebSocket.
5. **Thiếu cơ chế Heartbeat**: Kết nối WebSocket dễ bị ngắt đột ngột bởi proxy/load balancer vì thiếu cơ chế ping/pong giữ kết nối.

Mục tiêu là khắc phục toàn bộ các lỗi trên, loại bỏ hoàn toàn mã giả lập ở Frontend, đồng nhất kiến trúc giao tiếp realtime để hệ thống đặt vé hoạt động mượt mà, và xây dựng cơ chế kiểm thử đa luồng (multi-account simulation) để đảm bảo độ tin cậy.

## Requirements

### Functional Requirements
1. **REQ-1 (Xác thực WebSocket bằng HttpOnly Cookie)**: Sửa lại cách sinh `socketUrl` trong `useWebSocket.js` để nó trỏ đúng tới domain/port của backend (parse từ `VITE_API_BASE_URL`) thay vì dùng `window.location.host`. Trình duyệt sẽ tự động gửi cookie xác thực.
2. **REQ-2 (Dọn dẹp Mock Code)**: Loại bỏ hoàn toàn mọi logic giả lập (Mock Mode), các hàm `sleep`, và biến `USE_MOCK` khỏi tất cả frontend services (`queueService.js`, `orderService.js`, `authService.js`, v.v.). Set mặc định dùng API thật.
3. **REQ-3 (Đồng nhất WebSocket ở Seatmap)**: Component `CanvasSeatmap.tsx` phải được cấu trúc lại để tái sử dụng instance từ hook `useWebSocket` thay vì tự tạo `new WebSocket()` riêng lẻ.
4. **REQ-4 (Queue qua WebSocket)**: `queueService.js` ngừng dùng Polling. `VirtualQueue.jsx` sẽ đăng ký lắng nghe channel event để nhận thông báo qua hàng chờ.
5. **REQ-5 (Multi-account Simulation Testing)**: Tạo kịch bản kiểm thử tự động (hoặc hướng dẫn test E2E) bằng cách giả lập nhiều tài khoản cùng truy cập một sự kiện để kiểm chứng việc đồng bộ ghế ngồi và hàng đợi realtime.

### Non-Functional Requirements
1. **REQ-6 (Độ tin cậy của kết nối)**: Thêm logic tự động gửi Ping (`{"action": "ping"}`) mỗi 30s từ Frontend (trong `useWebSocket.js`) và xử lý trên Backend (nếu cần) để giữ kết nối không bị timeout.

### Constraints
- Hàng đợi phải tận dụng kết nối global hoặc channel event để nhận token thay vì liên tục query.

## Approach

### Selected Approach

**1. Sửa URL kết nối WebSocket (Dựa trên HttpOnly Cookie)**
Thay vì cố truy cập token trong JS (điều không thể do bảo mật HttpOnly), Frontend sẽ được sửa để trích xuất domain của backend từ biến môi trường `VITE_API_BASE_URL`. Khi kết nối WebSocket hướng đúng vào backend, trình duyệt sẽ tự động quản lý và đính kèm cookie xác thực.

**2. Làm sạch Mock Mode**
Xóa hoàn toàn tham số `USE_MOCK` và hàm `sleep()` tại các service Frontend. Mọi lời gọi API sẽ truyền thẳng payload xuống hàm `api.post/get` và xử lý kết quả trả về bằng hàm `unwrap()`.

**3. Tái cấu trúc WebSocket tại Seatmap và Queue**
`CanvasSeatmap.tsx` sẽ xoá đoạn logic `new WebSocket` dư thừa và sử dụng hàm `setOnMessage` từ hook `useWebSocket`. Hệ thống Queue (VirtualQueue) sẽ đăng ký kênh `event:{eventID}` và lắng nghe tín hiệu có type `QUEUE_PASSED`.

**4. Kịch bản Kiểm thử Đa luồng (Multi-account E2E/Simulation)**
Viết một script Bash hoặc Node.js nhỏ (đặt tại thư mục `scratch/`) để gọi API đăng nhập và giữ ghế từ 3-5 tài khoản cùng lúc, hoặc cung cấp tài liệu hướng dẫn cụ thể dùng công cụ DevTools (Profile/Incognito) để test toàn bộ usecase nghiệp vụ.

### Alternatives Considered

#### Alternative 1: Nhúng JWT vào JSON Response và truyền qua Header
- **Description**: Sửa backend Go trả về JWT trong body (JSON) để lưu vào LocalStorage rồi gắn vào `Sec-WebSocket-Protocol`.
- **Rejected Because**: Phá vỡ lớp bảo mật HttpOnly, tạo rủi ro XSS (cross-site scripting) nghiêm trọng.

#### Alternative 2: Xử lý thông qua Reverse Proxy (Vite Proxy)
- **Description**: Giữ nguyên `socketUrl` trỏ về Frontend (`/ws`), sau đó dựa vào cấu hình proxy sang backend.
- **Rejected Because**: Thiếu tính linh hoạt khi deploy Production do cấu hình proxy cứng.

### Decision Matrix

| Tiêu chí | Trọng số | Cookie-based Target (Selected) | Truyền JWT qua Header | Dùng Reverse Proxy |
|-----------|--------|--------------|--------------|--------------|
| **Bảo mật (Chống XSS)** | 40% | 5 | 1 | 5 |
| **Tính khả thi Production** | 30% | 4 | 5 | 2 |
| **Độ phức tạp Code** | 30% | 4 | 5 | 3 |
| **Weighted Total** | | **4.4** | 3.4 | 3.5 |

## Architecture

### Component Diagram

```text
+-----------------------+              +------------------------+
|    Frontend (React)   |              |     Backend (Go)       |
|                       |              |                        |
|  +-----------------+  | HttpOnly     |  +------------------+  |
|  | useWebSocket.js |<==================>|  websocket/hub.go  |  |
|  +--------+--------+  | WSS + Cookie |  +--------+---------+  |
|           |           |              |           |            |
|     +-----+-----+     |              |  +--------v---------+  |
|     |           |     |              |  | order_service.go |  |
| +---v---+   +---v---+ |              |  +--------+---------+  |
| | Seat  |   | Queue | |              |           |            |
| | Map   |   | Status| |              |  +--------v---------+  |
| +-------+   +-------+ |              |  | Database (Redis/ |  |
+-----------------------+              |  | Postgres)        |  |
                                       +------------------------+
```

### Data Flow
1. **Khởi tạo kết nối**: Khi Component mount, `useWebSocket` trích xuất `VITE_API_BASE_URL`, chuyển sang dạng `ws://` và nối vào `/ws`. Trình duyệt tự đính kèm HttpOnly cookie. Backend kiểm tra và đăng ký client vào `Hub`.
2. **Heartbeat**: Mỗi 30s, Frontend gửi `{"action": "ping"}` lên Backend. Backend xử lý message này để duy trì.
3. **Queue Notification**: Khi user qua hàng đợi, Backend gửi thông báo qua kênh `event:{event_id}` với type `QUEUE_PASSED`. Frontend tự động chuyển luồng sang trang chọn ghế.
4. **Seat Lock Notification**: Các user chọn ghế, Backend push sự kiện `SEATS_LOCKED` để các Frontend bôi mờ ghế.

### Key Interfaces

```typescript
interface WSPayload {
  action: 'subscribe' | 'unsubscribe' | 'ping';
  channel?: string;
}

interface WSResponse {
  type: 'SEAT_LOCKED' | 'SEATS_SOLD' | 'SEATS_RELEASED' | 'QUEUE_PASSED';
  seat_ids?: string[];
  user_id?: string;
}
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Loại bỏ Mock Mode, sửa hook `useWebSocket.js`, `CanvasSeatmap.tsx`, cập nhật `.env`. |
| 2     | `coder`  | No       | Sửa `queueService` dùng WebSocket, cập nhật Backend xử lý message ping, tinh chỉnh queue worker. |
| 3     | `tester` | No       | Xây dựng kịch bản kiểm thử giả lập nhiều tài khoản (multi-account) và kiểm thử toàn bộ quá trình WebSocket auth, Queue event, và Seat Lock flow. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Cấu hình URL WebSocket sai dẫn đến rớt kết nối | HIGH | LOW | `useWebSocket` sẽ xử lý cẩn thận `VITE_API_BASE_URL` cho cả dạng relative và absolute path. |
| Message `ping` làm crash Backend Go | HIGH | LOW | Go client parser `readPump` sẽ được cập nhật để an toàn xử lý action `ping`. |

## Success Criteria

1. Kết nối WebSocket báo "Connected" (101 Switching Protocols), không có lỗi 401.
2. Hoàn thành luồng từ "Vào hàng đợi" -> "Giữ ghế" -> "Thanh toán" 100% bằng dữ liệu thật, không có Mock.
3. Chức năng realtime Seat Lock phản hồi ngay lập tức trên các trình duyệt khác nhau khi kiểm thử bằng nhiều tài khoản.
4. Chạy giả lập (simulation script) hoặc E2E để chứng minh 5 tài khoản cùng truy cập sẽ nhìn thấy đúng trạng thái ghế và không thể đặt trùng.
