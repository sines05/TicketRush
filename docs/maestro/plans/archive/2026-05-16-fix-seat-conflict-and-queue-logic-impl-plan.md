---
title: "Fix Seat Conflict UX and Queue Index Logic Implementation Plan"
design_ref: "/home/son/TicketRush/docs/maestro/plans/2026-05-16-fix-seat-conflict-and-queue-logic-design.md"
created: "2026-05-16T14:05:00Z"
status: "approved"
total_phases: 3
estimated_files: 3
task_complexity: "medium"
---

# Fix Seat Conflict UX and Queue Index Logic Implementation Plan

## Plan Overview

- **Total phases**: 3
- **Agents involved**: `coder`, `tester`
- **Estimated effort**: Cập nhật handler WebSocket tại Frontend để sử dụng Component Modal thay vì đẩy lỗi global; sửa đổi logic cấp số thứ tự tại Backend để đảm bảo tính Idempotent; cập nhật kịch bản E2E.

## Dependency Graph

```text
[Phase 1: Fix SeatMap UX]
       |
[Phase 2: Fix Queue Idempotency]
       |
       v
[Phase 3: Validation & Simulation]
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1, Phase 2 | Parallel | 2 | Frontend (UX) và Backend (Queue) |
| 2     | Phase 3 | Sequential | 1 | Testing sau khi code hoàn tất |

## Phase 1: Fix SeatMap UX

### Objective
Ngăn chặn hiện tượng `SeatMap.jsx` bị crash thành toàn bộ trang lỗi khi nhận được sự kiện Cart Eviction từ WebSocket, thay vào đó hiển thị Pop-up Dialog.

### Agent: `coder`
### Parallel: Yes

### Files to Modify

- `frontend/src/pages/Booking/SeatMap.jsx` — Sửa đổi callback của `setOnMessage` trong `useEffect` (khoảng dòng 129-130).

### Implementation Details
- Thay vì gọi `setError("Một số ghế bạn chọn đã được người khác giữ hoặc đặt mất.");`
- Hãy gọi:
  ```javascript
  setConflictMessage("Một số ghế bạn chọn đã được người khác giữ hoặc đặt mất.");
  setIsConflictModalOpen(true);
  ```

### Validation
- `cd frontend && npm run lint`

### Dependencies
- Blocked by: None
- Blocks: [3]

---

## Phase 2: Fix Queue Idempotency

### Objective
Đảm bảo hàm `JoinQueue` ở Backend không cấp số mới vô điều kiện nếu user đã có `JoinIndex` từ session trước đó.

### Agent: `coder`
### Parallel: Yes

### Files to Modify

- `internal/queue/service.go` — Cập nhật hàm `JoinQueue`.

### Implementation Details
- Trước khi thực hiện `s.repo.AddToQueue` và `s.repo.GetNextJoinIndex`:
  ```go
  session, err := s.repo.GetSessionByEventAndUser(ctx, eventID, userID)
  if err == nil && session != nil && session.JoinIndex > 0 {
      joinIndex = session.JoinIndex
  } else {
      joinIndex, _ = s.repo.GetNextJoinIndex(ctx, eventID)
  }
  ```

### Validation
- `go test ./internal/queue/...`

### Dependencies
- Blocked by: None
- Blocks: [3]

---

## Phase 3: Validation & Simulation

### Objective
Xác minh tính đúng đắn của logic tính toán hàng chờ (F5 không nhảy số) và hiển thị pop-up (thông qua mã lỗi API và WebSocket).

### Agent: `tester`
### Parallel: No

### Files to Modify
- `scratch/simulate_multi_booking.js` — Thêm kịch bản user B bị Cart Eviction và user B gọi lại Join Queue nhiều lần.

### Validation
- Chạy script: `node scratch/simulate_multi_booking.js` để thấy log 1 người được ghế, 2 người bị conflict.

### Dependencies
- Blocked by: [1, 2]
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `frontend/src/pages/Booking/SeatMap.jsx` | 1 | Fix UX error redirect |
| 2 | `internal/queue/service.go` | 2 | Fix Queue increment bug |
| 3 | `scratch/simulate_multi_booking.js` | 3 | Simulation updates |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | LOW | Chỉ thay đổi hàm state handler trong component React. |
| 2 | MEDIUM | Đảm bảo luồng cấp số thứ tự Redis vẫn chạy đúng đắn và an toàn. |
| 3 | LOW | Chỉ sửa đổi script test nội bộ. |

## Execution Profile

```text
Execution Profile:
- Total phases: 3
- Parallelizable phases: 2 (in 1 batches)
- Sequential-only phases: 1
- Estimated parallel wall time: N/A
- Estimated sequential wall time: 5 minutes

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
