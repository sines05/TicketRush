---
title: "Fix Timer Reset and Slot Leak Implementation Plan"
design_ref: "docs/maestro/plans/2026-05-14-fix-timer-reset-bugs-design.md"
created: "2026-05-14T11:10:00Z"
status: "draft"
total_phases: 3
estimated_files: 5
task_complexity: "medium"
---

# Fix Timer Reset and Slot Leak Implementation Plan

## Plan Overview

This plan addresses the timer reset vulnerability and queue slot over-admission bug by refining the service and worker logic and adding comprehensive integration tests.

- **Total phases**: 3
- **Agents involved**: coder, tester, code_reviewer
- **Estimated effort**: Medium complexity.

## Dependency Graph

```
Phase 1: Logic Fixes (Service & Worker)
       |
Phase 2: Verification (Tester)
       |
Phase 3: Final Audit (Reviewer)
```

## Phase 1: Logic Fixes (Service & Worker)

### Objective
Correct the timer reset and over-cleaning bugs.

### Agent: coder
### Parallel: No

### Files to Modify

- `internal/queue/service.go`
  - `getOrCreateSession`: Ensure `AllowedAt` is only set if it's currently `nil`.
- `internal/service/order_service.go`
  - `LockSeats`: Replace `s.CancelOrder` with `s.orderRepo.CancelOrder` and broadcast release.
- `internal/worker/worker.go`
  - `releaseExpiredSessions`: Verify filter logic handles all zombie states.

### Validation
- Compile check.

## Phase 2: Verification

### Objective
Exhaustively test the new logic against vulnerabilities.

### Agent: tester
### Parallel: No

### Files to Modify
- `internal/tests/queue_logic_test.go`
  - Add test for `AllowedAt` immutability during "Edit Seats" flow.
  - Add test for `ActiveUserThreshold` enforcement during seat changes.
  - Add test for zombie session cleanup by the worker.

### Validation
- Run all project tests: `go test ./internal/...`

## Phase 3: Final Audit

### Objective
Ensure no side effects on other components.

### Agent: code_reviewer
### Parallel: No

### Validation
- Full review of changes in `order_service.go`, `queue_service.go`, and `worker.go`.
- Note: This is a read-only phase for quality assurance.
