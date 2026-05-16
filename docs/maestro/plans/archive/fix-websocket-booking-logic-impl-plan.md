---
title: "Fix WebSocket & Booking Logic Implementation Plan"
design_ref: "/home/son/TicketRush/docs/maestro/plans/fix-websocket-booking-logic-design.md"
created: "2026-05-16T12:28:00Z"
status: "draft"
total_phases: 4
estimated_files: 10
task_complexity: "medium"
---

# Fix WebSocket & Booking Logic Implementation Plan

## Plan Overview

- **Total phases**: 4
- **Agents involved**: `coder`, `tester`
- **Estimated effort**: Cập nhật hệ thống biến môi trường, dọn dẹp toàn bộ mock mode ở frontend, sửa đổi logic hook WebSocket, cấu trúc lại `CanvasSeatmap.tsx` và `queueService.js`, bổ sung xử lý `ping` trên backend, cuối cùng là kiểm thử đa luồng với script simulation.

## Dependency Graph

```text
[Phase 1: Environment & Foundation]
       |
       v
[Phase 2: Remove Mock Mode]
       |
       v
[Phase 3: WebSocket Refactor (Seatmap & Queue)]
       |
       v
[Phase 4: Simulation & Validation]
```

## Execution Strategy

| Stage | Phases  | Execution | Agent Count | Notes |
|-------|---------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential| 1           | Nền tảng cấu hình |
| 2     | Phase 2 | Sequential| 1           | Dọn dẹp code rác |
| 3     | Phase 3 | Sequential| 1           | Logic realtime cốt lõi |
| 4     | Phase 4 | Sequential| 1           | Đảm bảo chất lượng |

## Phase 1: Environment & Foundation

### Objective
Cập nhật file môi trường và sửa hook WebSocket ở frontend để trích xuất URL backend đúng, đồng thời xử lý Heartbeat (`ping`) ở cả frontend và backend.

### Agent: `coder`
### Parallel: No

### Files to Modify

- `frontend/.env.example` — Cập nhật/thêm `VITE_API_BASE_URL` và loại bỏ `VITE_USE_MOCK`.
- `frontend/src/hooks/useWebSocket.js` — Thay đổi logic khởi tạo URL (`socketUrl`) để dùng `VITE_API_BASE_URL`. Thêm cơ chế gửi `{"action": "ping"}` định kỳ 30s.
- `internal/websocket/client.go` — Cập nhật hàm `readPump` để nếu message action là "ping" thì không báo lỗi, giữ kết nối ổn định.

### Validation
- Build frontend thành công.
- Go tests pass: `cd internal && go test ./websocket/...`

### Dependencies
- Blocked by: None
- Blocks: [2, 3]

---

## Phase 2: Remove Mock Mode

### Objective
Loại bỏ hoàn toàn chế độ giả lập (Mock Mode) khỏi tất cả các Frontend services, ép hệ thống sử dụng kết nối API thực tế tới Backend.

### Agent: `coder`
### Parallel: No

### Files to Modify

- `frontend/src/services/orderService.js` — Xóa biến `USE_MOCK`, xóa hàm `sleep`.
- `frontend/src/services/queueService.js` — Xóa biến `USE_MOCK`, xóa hàm `sleep`.
- `frontend/src/services/authService.js` — Tương tự, xóa `USE_MOCK` và hàm giả lập auth.

### Validation
- Frontend linter pass: `cd frontend && npm run lint`

### Dependencies
- Blocked by: [1]
- Blocks: [3]

---

## Phase 3: WebSocket Refactor (Seatmap & Queue)

### Objective
Tích hợp hook WebSocket chuẩn vào `CanvasSeatmap.tsx` và chuyển đổi cơ chế check hàng đợi sang event-driven.

### Agent: `coder`
### Parallel: No

### Files to Modify

- `frontend/src/components/SeatMap/CanvasSeatmap.tsx` — Xóa logic `new WebSocket` trong `useEffect`. Đổi sang sử dụng dữ liệu realtime từ component cha (`SeatMap.jsx`).
- `frontend/src/services/queueService.js` — Xóa hàm `startPollingJoin`.
- `frontend/src/pages/Booking/VirtualQueue.jsx` — Tích hợp hook `useWebSocket` để lắng nghe event `{ type: "QUEUE_PASSED" }`.

### Validation
- Frontend linter pass: `cd frontend && npm run lint`
- Frontend build: `cd frontend && npm run build`

### Dependencies
- Blocked by: [1, 2]
- Blocks: [4]

---

## Phase 4: Simulation & Validation

### Objective
Xây dựng công cụ kiểm thử giả lập để xác minh tính đúng đắn của logic đặt vé đa luồng và WebSocket realtime.

### Agent: `tester`
### Parallel: No

### Files to Create

- `scratch/simulate_multi_booking.js` — Script để đăng nhập 3-5 tài khoản và đồng loạt gọi API `LockSeats`.

### Validation
- Chạy script thành công và hiển thị rõ output mong đợi.

### Dependencies
- Blocked by: [3]
- Blocks: None
