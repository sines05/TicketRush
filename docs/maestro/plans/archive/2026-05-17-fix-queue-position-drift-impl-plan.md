---
title: "fix-queue-position-drift-impl-plan"
design_ref: "docs/maestro/plans/2026-05-17-fix-queue-position-drift-design.md"
created: "2026-05-17T23:05:00Z"
status: "approved"
total_phases: 2
estimated_files: 5
task_complexity: "medium"
---

# Fix Queue Position Drift Implementation Plan

## Plan Overview

- **Total phases**: 2
- **Agents involved**: `coder`, `tester`
- **Estimated effort**: Medium. Synchronization between backend API and frontend state.

## Dependency Graph

```
Phase 1: Backend & Frontend Handshake Sync (Coder)
    |
Phase 2: Integration Test Verification (Tester)
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | API & Frontend fix |
| 2     | Phase 2 | Sequential | 1 | Verification |

## Phase 1: Backend & Frontend Handshake Sync

### Objective
Update the API contract to return the processed index and update the frontend to use it for relative position calculation.

### Agent: `coder`
### Parallel: No

### Files to Modify
- `internal/queue/service.go`
- `internal/handler/queue_handler.go`
- `frontend/src/pages/Booking/VirtualQueue.jsx`
- `internal/tests/order_service_test.go` (mock updates)

### Implementation Details
1. **`internal/queue/service.go`**:
    - Update `JoinQueue` and `GetStatus` in `Service` interface to return `(status, token, joinIndex, processedIndex, allowedAt, error)`.
    - In the implementation, fetch `processedIndex` using `s.repo.GetProcessedIndex(ctx, eventID)`.
2. **`internal/handler/queue_handler.go`**:
    - Update `JoinQueue` and `GetStatus` handlers to extract `processedIndex` and add it to the JSON response as `current_processed_index`.
3. **`frontend/src/pages/Booking/VirtualQueue.jsx`**:
    - In `initQueue`, after calling `joinQueue` or `getStatus`, call `setCurrentIndex(res.current_processed_index)`.
4. **Mock Updates**: Fix compiler errors in tests that implement or call the updated interface.

### Validation
- `go build ./...`
- `npm run lint` in frontend.

## Phase 2: Integration Test Verification

### Objective
Create a new integration test to ensure the relative position calculation works across session re-entries.

### Agent: `tester`
### Parallel: No

### Files to Create
- `internal/tests/queue_status_test.go`

### Implementation Details
1. Create a test that:
    - Sets up a Redis client.
    - Joins a user to the queue (e.g., `joinIndex = 1`).
    - Admits some mock users (e.g., `processedIndex` increments to 1).
    - Calls `GetStatus` for the original user.
    - Asserts that `res.join_index == 1` and `res.current_processed_index == 1`.

### Validation
- `go test -v internal/tests/queue_status_test.go`

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/queue/service.go` | 1 | Update service contract |
| 2 | `internal/handler/queue_handler.go` | 1 | Update API response |
| 3 | `frontend/src/pages/Booking/VirtualQueue.jsx` | 1 | Update UI state hydration |
| 4 | `internal/tests/order_service_test.go` | 1 | Fix mock errors |
| 5 | `internal/tests/queue_status_test.go` | 2 | Verify fix |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Additive API change. |
| 2     | LOW | New test file only. |

## Execution Profile

```
Execution Profile:
- Total phases: 2
- Parallelizable phases: 0
- Sequential-only phases: 2
- Estimated parallel wall time: N/A
- Estimated sequential wall time: ~15 minutes

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
