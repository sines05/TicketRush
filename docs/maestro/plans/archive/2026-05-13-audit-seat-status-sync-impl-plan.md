---
title: "Audit Seat Status Sync Implementation Plan"
design_ref: "/home/son/TicketRush/docs/maestro/plans/2026-05-13-audit-seat-status-sync-design.md"
created: "2026-05-13T00:00:00Z"
status: "draft"
total_phases: 2
estimated_files: 2
task_complexity: "medium"
---

# Audit Seat Status Sync Implementation Plan

## Plan Overview

- **Total phases**: 2
- **Agents involved**: coder
- **Estimated effort**: Medium. Fixes require minor localized changes to both frontend component and backend repository to ensure seat states are successfully cleaned up after a successful checkout.

## Dependency Graph

```
[Phase 1: Backend Database Consistency]
        |
        v
[Phase 2: Frontend State Cleanup]
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Backend database logic update |
| 2     | Phase 2 | Sequential | 1 | Frontend React state cleanup |

## Phase 1: Backend Database Consistency

### Objective
Update the `CompleteOrder` function in the Order repository to atomically clear the temporary lock fields (`locked_by_user_id` and `locked_at`) when updating a seat's status to `SOLD`.

### Agent: coder
### Parallel: No

### Files to Modify

- `internal/repository/order_repository.go` — In the `CompleteOrder` method, convert the `.Update("status", models.SeatSold)` call for seat status to `.Updates(map[string]interface{}{...})` to also set the lock fields to `nil`.

### Implementation Details

- Locate `CompleteOrder` in `internal/repository/order_repository.go` around line 150.
- Replace:
  ```go
		if err := tx.Model(&models.Seat{}).
			Where("id IN ?", seatIDs).
			Update("status", models.SeatSold).Error; err != nil {
			return err
		}
  ```
  with:
  ```go
		if err := tx.Model(&models.Seat{}).
			Where("id IN ?", seatIDs).
			Updates(map[string]interface{}{
				"status":             models.SeatSold,
				"locked_by_user_id": nil,
				"locked_at":          nil,
			}).Error; err != nil {
			return err
		}
  ```

### Validation

- `cd backend && go build ./...`
- `cd backend && go test ./internal/tests/... -v`

### Dependencies

- Blocked by: None
- Blocks: 2

---

## Phase 2: Frontend State Cleanup

### Objective
Ensure the frontend `BookingContext` clears the `selectedSeats` array from `sessionStorage` upon successful checkout to prevent stale statuses upon re-entry to the seat map.

### Agent: coder
### Parallel: No

### Files to Modify

- `frontend/src/pages/Booking/Checkout.jsx` — Inject a `clearSelection()` call within `handlePay` immediately after the API confirms a successful order.

### Implementation Details

- In `Checkout.jsx`, destructure `clearSelection` from `useContext(BookingContext)`.
- Locate the `handlePay` function.
- Inside the try block, right after `await orderService.checkout({ order_id: order.order_id });` completes (and notification is shown), call `clearSelection()`.
- Add `clearSelection()` right before `setPaid(true)` in both the `USE_MOCK` and non-mock branches.

### Validation

- `cd frontend && npm run lint`
- `cd frontend && npm run build`

### Dependencies

- Blocked by: 1
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/repository/order_repository.go` | 1 | Backend DB lock field cleanup |
| 2 | `frontend/src/pages/Booking/Checkout.jsx` | 2 | Frontend local session cleanup |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW  | Routine GORM map update; perfectly isolated. |
| 2     | LOW  | Safe contextual clearance. Already correctly separated from page transitions. |

## Execution Profile

```
Execution Profile:
- Total phases: 2
- Parallelizable phases: 0
- Sequential-only phases: 2
- Estimated parallel wall time: 0
- Estimated sequential wall time: 2 mins

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```