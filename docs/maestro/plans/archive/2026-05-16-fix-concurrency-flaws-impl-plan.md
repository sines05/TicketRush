---
title: "fix-concurrency-flaws-impl-plan"
design_ref: "docs/maestro/plans/2026-05-16-fix-concurrency-flaws-design.md"
created: "2026-05-16T19:25:00Z"
status: "approved"
total_phases: 3
estimated_files: 2
task_complexity: "medium"
---

# Fix Database Concurrency Flaws Implementation Plan

## Plan Overview

This plan addresses three critical database concurrency and performance issues in the TicketRush platform. We will refactor the `OrderRepository` to introduce proper row-level locking, prevent deadlocks through deterministic lock acquisition order, and eliminate N+1 queries during the seat locking process. The plan also includes a dedicated phase for comprehensive concurrency testing.

- **Total phases**: 3
- **Agents involved**: `coder`, `tester`
- **Estimated effort**: Moderate, focused on transactional integrity and performance.

## Dependency Graph

```
Phase 1: Implement Repository Fixes (Coder)
      |
      v
Phase 2: Comprehensive Concurrency Testing (Tester)
      |
      v
Phase 3: Final Verification & Code Review (Reviewer)
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Core repository fixes. |
| 2     | Phase 2 | Sequential | 1 | Concurrency and regression testing. |
| 3     | Phase 3 | Sequential | 1 | Final review. |

## Phase 1: Implement Repository Fixes

### Objective
Apply the targeted refactoring to `order_repository.go` to fix the race condition, deadlock risk, and N+1 query performance.

### Agent: `coder`
### Parallel: No

### Files to Modify
- `internal/repository/order_repository.go`

### Implementation Details

#### 1. Fix Race Condition in `ReleaseOrder`
- In `ReleaseOrder(ctx context.Context, orderID uuid.UUID)`, update the initial order fetch to include a row lock:
  ```go
  if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("OrderItems").First(&order, orderID).Error; err != nil {
      return err
  }
  ```

#### 2. Fix Deadlock Risk in `LockSeats`
- At the beginning of `LockSeats(...)`, sort the `seatIDs` slice:
  ```go
  import "sort"
  // ...
  sort.Slice(seatIDs, func(i, j int) bool {
      return seatIDs[i].String() < seatIDs[j].String()
  })
  ```

#### 3. Fix N+1 Query in `LockSeats`
- Replace the zone price loop (lines 67-76) with a single join query to fetch seats with their zones preloaded:
  ```go
  var lockedSeats []models.Seat
  if err := tx.Preload("Zone").Where("id IN ?", seatIDs).Find(&lockedSeats).Error; err != nil {
      return err
  }
  // Then calculate totalAmount and build orderItems from lockedSeats
  ```

### Validation
- `go build ./...`
- `go vet ./internal/repository/...`

### Dependencies
- Blocked by: None
- Blocks: Phase 2

## Phase 2: Comprehensive Concurrency Testing

### Objective
Verify the fixes for race conditions, deadlocks, and performance using automated tests.

### Agent: `tester`
### Parallel: No

### Files to Modify
- `internal/tests/concurrency_test.go` (create or update)

### Implementation Details
1. **Race Condition Test**: Simulate simultaneous calls to `CompleteOrder` and `ReleaseOrder` for the same order. Verify that only one succeeds or they complete in a consistent state (never both completing/cancelling).
2. **Deadlock Test**: Simulate multiple users locking overlapping sets of seats with inverted ID lists (e.g., `[A, B]` and `[B, A]`). Verify that transactions complete without deadlock errors.
3. **N+1 Verification**: Use a mock SQL driver or GORM's logger to verify that `LockSeats` performs a single query for seat zones.

### Validation
- `go test -v internal/tests/concurrency_test.go`
- `go test -race ./...`

### Dependencies
- Blocked by: Phase 1
- Blocks: Phase 3

## Phase 3: Final Verification & Code Review

### Objective
Final review of the implementation and test results to ensure adherence to requirements and clean code standards.

### Agent: `code_reviewer`
### Parallel: No

### Implementation Details
- Review `internal/repository/order_repository.go` for correct GORM usage and sorting logic.
- Review `internal/tests/concurrency_test.go` for test thoroughness.

### Validation
- Manual review of the final audit report and code changes.

### Dependencies
- Blocked by: Phase 2
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/repository/order_repository.go` | 1 | Core database logic fixes. |
| 2 | `internal/tests/concurrency_test.go` | 2 | Concurrency and performance verification. |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | MEDIUM | Transactional logic is critical; subtle errors can cause data corruption. |
| 2 | MEDIUM | Designing robust concurrency tests that reliably reproduce race conditions is challenging. |

## Execution Profile

```
Execution Profile:
- Total phases: 3
- Parallelizable phases: 0
- Sequential-only phases: 3
- Estimated parallel wall time: N/A
- Estimated sequential wall time: ~30 minutes

Note: Native parallel execution currently runs agents in autonomous mode.
All tool calls are auto-approved without user confirmation.
```
