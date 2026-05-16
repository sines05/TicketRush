---
title: "Queue Broadcast & Seat Conflict Fix Implementation Plan"
design_ref: "/home/son/TicketRush/docs/maestro/plans/2026-05-16-queue-broadcast-and-seat-conflict-fix-design.md"
created: "2026-05-16T13:08:00Z"
status: "approved"
total_phases: 3
estimated_files: 8
task_complexity: "medium"
---

# Queue Broadcast & Seat Conflict Fix Implementation Plan

## Plan Overview

- **Total phases**: 3
- **Agents involved**: `coder`, `tester`
- **Estimated effort**: Cập nhật logic Redis counter, thay đổi worker queue broadcast, tích hợp frontend logic offset, và xử lý UI pop-up cho SeatMap.

## Dependency Graph

```text
[Phase 1: Queue Broadcast Optimization]
       |
       v
[Phase 2: Seat Conflict UI]
       |
       v
[Phase 3: Validation & Simulation]
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Backend and Frontend Queue logic |
| 2     | Phase 2 | Sequential | 1 | Frontend SeatMap modal |
| 3     | Phase 3 | Sequential | 1 | End-to-end testing |

## Phase 1: Queue Broadcast Optimization

### Objective
Triển khai cơ chế Global Offset Broadcast. Backend sẽ lưu trữ và phát sóng số thứ tự đang được phục vụ (`current_index`). Frontend nhận và tự tính toán vị trí chờ của user.

### Agent: `coder`
### Parallel: No

### Files to Modify

- `internal/queue/repository.go` — Thêm hàm `GetNextJoinIndex(ctx context.Context, eventID string) (int64, error)` dùng `INCR`.
- `internal/queue/service.go` — Sửa hàm `JoinQueue` để trả về `JoinIndex`.
- `internal/worker/worker.go` — Sửa luồng xử lý queue. Thay vì gửi cho từng user `QUEUE_UPDATE`, tạo 1 message `{type: "QUEUE_UPDATE", current_index: X}` và gọi `broadcast <- msg` cho toàn bộ channel `event:{eventID}`. `X` là số lượng người đã được phép active.
- `frontend/src/services/queueService.js` — Thêm trường `joinIndex` vào state/response nếu cần.
- `frontend/src/pages/Booking/VirtualQueue.jsx` — Nhận `joinIndex` khi Join Queue, lưu vào state. Khi nhận được `QUEUE_UPDATE`, tính `vị trí chờ = joinIndex - current_index`.

### Implementation Details
- Backend: Sử dụng `redis.Client.Incr` cho key `queue:event_id:counter` khi có người Join.
- Worker cần biết số lượng người đã Active để làm `current_index` hoặc lưu `current_index` riêng. Đơn giản nhất là dùng `redis.Client.Get("queue:event_id:active_counter")` (tăng khi pop khỏi queue) làm `current_index`.

### Validation
- `go test ./internal/queue/...`
- `cd frontend && npm run lint`

### Dependencies
- Blocked by: None
- Blocks: [2, 3]

---

## Phase 2: Seat Conflict UI

### Objective
Thêm Pop-up Modal vào trang `SeatMap.jsx` để hiển thị lỗi "Ghế đã bị đặt" (HTTP 409) mà không làm gián đoạn luồng đặt vé.

### Agent: `coder`
### Parallel: No

### Files to Modify

- `frontend/src/pages/Booking/SeatMap.jsx` — Thêm UI components cho Dialog/Modal (sử dụng thư viện radix-ui hoặc component có sẵn).
- Thêm state `isConflictModalOpen` và `conflictMessage`.
- Trong hàm catch lỗi API `/orders/lock`: Nếu status 409 và errorCode `SEAT_ALREADY_TAKEN`, set `isConflictModalOpen(true)`.

### Implementation Details
- Khi Pop-up bật lên, cung cấp nút "Đồng ý" để đóng Pop-up.
- Khi đóng, có thể gọi một callback để clear `selectedSeats` cho các ghế bị lỗi (hoặc clear toàn bộ `selectedSeats`). 
- Các ghế lỗi sẽ tự động được cập nhật màu nhờ WebSocket `SEAT_LOCKED` từ backend.

### Validation
- `cd frontend && npm run lint`

### Dependencies
- Blocked by: [1]
- Blocks: [3]

---

## Phase 3: Validation & Simulation

### Objective
Xác minh tính đúng đân của logic tính toán hàng chờ và hiển thị pop-up thông qua kịch bản kiểm thử đa luồng.

### Agent: `tester`
### Parallel: No

### Files to Modify
- `scratch/simulate_multi_booking.js` — Sửa đổi kịch bản kiểm thử (đã có từ lần trước) để bao gồm việc lắng nghe đúng luồng `VirtualQueue` và xác minh Conflict.

### Validation
- Chạy script: `node scratch/simulate_multi_booking.js` để thấy log 1 người được ghế, 2 người bị conflict.

### Dependencies
- Blocked by: [1, 2]
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/queue/repository.go` | 1 | Redis Counter logic |
| 2 | `internal/queue/service.go` | 1 | JoinQueue returns index |
| 3 | `internal/worker/worker.go` | 1 | Broadcast Global Offset |
| 4 | `frontend/src/services/queueService.js` | 1 | Xử lý API response |
| 5 | `frontend/src/pages/Booking/VirtualQueue.jsx` | 1 | Client-side math for offset |
| 6 | `frontend/src/pages/Booking/SeatMap.jsx` | 2 | Conflict Modal UI |
| 7 | `scratch/simulate_multi_booking.js` | 3 | Simulation updates |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | HIGH | Backend Queue logic là lõi nghiệp vụ. Nếu đếm sai STT, người dùng sẽ thấy số âm hoặc không nhảy. |
| 2 | MEDIUM | Phải đảm bảo Modal không loop vô hạn và state ghế được đồng bộ sạch sẽ sau khi đóng Modal. |
| 3 | LOW | Chỉ sửa đổi script test. |

## Execution Profile

```text
Execution Profile:
- Total phases: 3
- Parallelizable phases: 0
- Sequential-only phases: 3
- Estimated parallel wall time: N/A
- Estimated sequential wall time: 10 minutes

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```