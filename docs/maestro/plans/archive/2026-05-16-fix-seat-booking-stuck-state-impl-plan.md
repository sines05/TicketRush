---
title: "Fix Seat Booking Stuck State Implementation Plan"
design_ref: "/home/son/TicketRush/docs/maestro/plans/2026-05-16-fix-seat-booking-stuck-state-design.md"
created: "2026-05-16T17:40:00Z"
status: "draft"
total_phases: 2
estimated_files: 3
task_complexity: "medium"
---

# Fix Seat Booking Stuck State Implementation Plan

## Plan Overview

- **Total phases**: 2
- **Agents involved**: coder, tester
- **Estimated effort**: Low/Medium. Modifying one backend file (adding `user_id` to WS broadcasts) and two frontend files (fixing a reducer guard and handling WS removals).

## Dependency Graph

```text
[Phase 1: Implementation]
         |
[Phase 2: Validation]
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Full Stack Fixes |
| 2     | Phase 2 | Sequential | 1 | Validation |

## Phase 1: Full Stack Implementation

### Objective
Implement the backend WS payload enhancements and the frontend UI conflict resolution.

### Agent: coder
### Parallel: No

### Files to Create
None.

### Files to Modify

- `internal/service/order_service.go` — Update the `Broadcast` payloads in `LockSeats`, `Checkout`, and `CancelOrder` to include `"user_id": userID`.
- `frontend/src/context/BookingContext.jsx` — 
  1. Fix the `TOGGLE_SEAT` action to always allow removing a seat if it's currently selected.
  2. Implement a new `REMOVE_SEATS` action to clear specific seats from the cart.
- `frontend/src/pages/Booking/SeatMap.jsx` — 
  1. In the `useWebSocket` handler, intercept `SEATS_LOCKED` and `SEATS_SOLD` events.
  2. Check if any `targetIds` intersect with `selectedSeats`.
  3. If there is an intersection and `msg.user_id` does not match the current `user.user_id`, dispatch `REMOVE_SEATS` for those seats and show an alert/toast to the user.
  4. Allow the seat `onClick` handler to fire if the seat is currently selected, even if it is marked as `sold` or `locked`.

### Implementation Details
- Backend: Simply add `"user_id": userID` to the `map[string]interface{}` passed to `s.broadcaster.Broadcast`.
- Frontend: Ensure UUID string comparisons are case-insensitive if necessary, though direct `===` usually suffices. Use a toast library if available, otherwise just use standard browser `alert()` or whatever notification pattern the app uses (there's a `notificationService` in `Checkout.jsx`, but let's just stick to UI state or `alert` if no toast is obvious). Wait, `SeatMap.jsx` already has an `error` state. We can use `setError("Ghế bạn chọn đã bị người khác đặt mất.")`.

### Validation
- Build the backend: `go build ./...`
- Run frontend linter/build.

### Dependencies
- Blocked by: None
- Blocks: [2]

---

## Phase 2: Validation

### Objective
Ensure the fix works and doesn't break existing order flows.

### Agent: tester
### Parallel: No

### Files to Modify
- Testing files in `internal/tests/` (e.g. `order_service_test.go` or `websocket_security_test.go`) if needed, or simply verify the fix locally.

### Validation
- `go test ./internal/tests/...`

### Dependencies
- Blocked by: [1]
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/service/order_service.go` | 1 | Inject user_id into WS events |
| 2 | `frontend/src/context/BookingContext.jsx` | 1 | Fix guard clause and add REMOVE_SEATS |
| 3 | `frontend/src/pages/Booking/SeatMap.jsx` | 1 | Process WS events and remove conflicts |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Straightforward fixes identified during code review. |
| 2     | LOW | Adding standard test coverage. |

## Execution Profile

```text
Execution Profile:
- Total phases: 2
- Parallelizable phases: 0 (in 0 batches)
- Sequential-only phases: 2
- Estimated parallel wall time: N/A
- Estimated sequential wall time: 2 mins

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```