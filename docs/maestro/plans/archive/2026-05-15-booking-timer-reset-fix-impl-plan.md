---
title: "Booking Timer Reset Fix Implementation Plan"
design_ref: "docs/maestro/plans/2026-05-15-booking-timer-reset-fix-design.md"
created: "2026-05-15T00:00:00Z"
status: "approved"
total_phases: 3
estimated_files: 2
task_complexity: "medium"
---

# Booking Timer Reset Fix Implementation Plan

## Plan Overview

- **Total phases**: 3
- **Agents involved**: `coder`, `tester`
- **Estimated effort**: Small. Modifying a single service method and updating a test file.

## Dependency Graph

```
Phase 1: Fix CancelOrder Logic
    |
    v
Phase 2: Update Tests
    |
    v
Phase 3: Verify Fix
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Backend logic change |
| 2     | Phase 2 | Sequential | 1 | Test alignment |
| 3     | Phase 3 | Sequential | 1 | Verification |

## Phase 1: Fix CancelOrder Logic

### Objective
Remove the queue session deletion logic from `OrderService.CancelOrder` to prevent the 15-minute timer reset exploit.

### Agent: `coder`
### Parallel: No

### Files to Modify

- `internal/service/order_service.go` — Remove calls to `queueRepo.RemoveFromActive` and `queueRepo.DeleteSession` inside the `CancelOrder` method (approx. lines 139-144).

### Implementation Details

The `CancelOrder` method currently performs aggressive cleanup:
```go
// REMOVE THIS:
_ = s.queueRepo.RemoveFromActive(ctx, order.EventID, userID)
session, err := s.queueRepo.GetSessionByEventAndUser(ctx, order.EventID, userID)
if err == nil && session != nil {
    _ = s.queueRepo.DeleteSession(ctx, session.Token, order.EventID, userID)
}
```
Removing these lines ensures the user's `allowed` status and session token persist after they release their seats to select new ones.

### Validation

- `go build ./internal/service/...`

### Dependencies

- Blocked by: None
- Blocks: Phase 2

---

## Phase 2: Update Tests

### Objective
Align existing integration tests with the new `CancelOrder` behavior (preserving sessions).

### Agent: `coder`
### Parallel: No

### Files to Modify

- `internal/tests/queue_logic_test.go` — Update `TestQueueFullLifecycle` to assert that the session and active status persist after cancellation.

### Implementation Details

Update `internal/tests/queue_logic_test.go` (approx. lines 187-193):
- Change `assert.False(t, allowed, ...)` to `assert.True(t, allowed, ...)`
- Change `assert.Nil(t, session, ...)` to `assert.NotNil(t, session, ...)`
- Update corresponding comments.

### Validation

- `go test -v internal/tests/queue_logic_test.go`

### Dependencies

- Blocked by: Phase 1
- Blocks: Phase 3

---

## Phase 3: Verify Fix

### Objective
Run all backend tests to ensure no regressions and that the fix is robust.

### Agent: `tester`
### Parallel: No

### Validation

- `go test -v ./internal/service/...`
- `go test -v ./internal/tests/...`

### Dependencies

- Blocked by: Phase 2
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/service/order_service.go` | 1 | Core logic fix |
| 2 | `internal/tests/queue_logic_test.go` | 2 | Integration test update |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Small logic change, well-understood side effects. |
| 2     | LOW | Straightforward test update. |
| 3     | LOW | Standard verification. |

## Execution Profile

```
Execution Profile:
- Total phases: 3
- Parallelizable phases: 0
- Sequential-only phases: 3
- Estimated parallel wall time: N/A
- Estimated sequential wall time: 5-10 minutes

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
