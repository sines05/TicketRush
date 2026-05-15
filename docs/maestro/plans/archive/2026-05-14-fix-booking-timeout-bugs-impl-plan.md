---
title: "Fix Booking Timeout and Queue Slot Leaks Implementation Plan"
design_ref: "docs/maestro/plans/2026-05-14-fix-booking-timeout-bugs-design.md"
created: "2026-05-14T10:05:00Z"
status: "draft"
total_phases: 4
estimated_files: 5
task_complexity: "medium"
---

# Fix Booking Timeout and Queue Slot Leaks Implementation Plan

## Plan Overview

This plan addresses logic bugs in queue management and session handling by implementing proactive cleanup in the service layer and refining the background worker logic.

- **Total phases**: 4
- **Agents involved**: coder, tester
- **Estimated effort**: Medium complexity, targeted changes across 4-5 files.

## Dependency Graph

```
Phase 1: Repo Updates
       |
Phase 2: Service Updates
       |
Phase 3: Worker Updates
       |
Phase 4: Verification
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1-3 | Sequential | 1 | Implementation |
| 2     | Phase 4 | Sequential | 1 | Verification |

## Phase 1: Repository Updates

### Objective
Enhance `OrderRepository` to support finding existing pending orders for a user and event.

### Agent: coder
### Parallel: No

### Files to Modify

- `internal/repository/order_repository.go` — Add `FindPendingOrderByUserAndEvent(ctx context.Context, userID uuid.UUID, eventID uuid.UUID) (*models.Order, error)` to interface and implementation.

### Validation

- Compile check.

### Dependencies

- Blocked by: None
- Blocks: Phase 2

## Phase 2: Service Updates

### Objective
Implement proactive cleanup logic in `OrderService` to prevent slot leaks and stale sessions.

### Agent: coder
### Parallel: No

### Files to Modify

- `internal/service/order_service.go`
  - `LockSeats`: Check for existing pending orders and cancel them before locking new seats.
  - `CancelOrder`: Call `queueRepo.RemoveFromActive` and `queueRepo.DeleteSession` after successful cancellation.
  - `Checkout`: Call `queueRepo.DeleteSession` after successful completion.

### Validation

- Compile check.

### Dependencies

- Blocked by: Phase 1
- Blocks: Phase 3

## Phase 3: Worker Updates

### Objective
Refine the session timeout worker to properly clean up "zombie" sessions.

### Agent: coder
### Parallel: No

### Files to Modify

- `internal/worker/worker.go`
  - `releaseExpiredSessions`: Modify filter logic to include sessions with non-pending orders or stale orders.

### Validation

- Compile check.

### Dependencies

- Blocked by: Phase 2
- Blocks: Phase 4

## Phase 4: Verification

### Objective
Verify the fixes with unit and integration tests.

### Agent: tester
### Parallel: No

### Files to Create

- `internal/tests/queue_logic_test.go` — Integration test covering the full lifecycle: Join -> Lock -> Cancel -> Join (should work immediately).

### Files to Modify

- `internal/tests/order_service_test.go` — Update existing tests to reflect new cleanup logic.

### Validation

- Run all project tests: `go test ./internal/...`

### Dependencies

- Blocked by: Phase 3
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/repository/order_repository.go` | 1 | Add lookup method for pending orders |
| 2 | `internal/service/order_service.go` | 2 | Implement proactive cleanup logic |
| 3 | `internal/worker/worker.go` | 3 | Refine timeout worker logic |
| 4 | `internal/tests/queue_logic_test.go` | 4 | New integration tests |
| 5 | `internal/tests/order_service_test.go` | 4 | Update existing tests |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | LOW | Simple interface extension. |
| 2 | MEDIUM | Changes core order flow; potential for race conditions. |
| 3 | MEDIUM | Modifies background worker; incorrect logic could kick active users. |
| 4 | LOW | Test-only phase. |

## Execution Profile

```
Execution Profile:
- Total phases: 4
- Parallelizable phases: 0
- Sequential-only phases: 4
- Estimated sequential wall time: 30-45 minutes

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
