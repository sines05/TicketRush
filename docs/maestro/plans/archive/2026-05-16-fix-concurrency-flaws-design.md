---
title: "fix-concurrency-flaws"
created: "2026-05-16T19:20:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Fix Database Concurrency Flaws Design Document

## Problem Statement

The TicketRush platform suffers from three critical database concurrency and performance issues that must be addressed to ensure system integrity and performance under load:
1.  **Race Condition in `ReleaseOrder`**: The background worker process releases expired orders without acquiring a row-level lock (`SELECT ... FOR UPDATE`). This allows a user to complete a payment simultaneously while the worker cancels the order, leading to state corruption (double selling of seats).
2.  **Deadlock Risk in `LockSeats`**: When multiple users attempt to lock the same overlapping sets of seats simultaneously, the lack of consistent lock acquisition order (sorting `seatIDs`) can result in database deadlocks, causing transaction failures.
3.  **N+1 Queries in `LockSeats`**: The application fetches the price of each requested seat individually within a loop by querying the associated `Zone`, resulting in $O(N)$ database round-trips for $N$ seats. This degrades performance significantly during high-demand events.

## Requirements

### Functional Requirements

1. **REQ-1**: Concurrent calls to `CompleteOrder` and `ReleaseOrder` for the same order ID must be mutually exclusive.
2. **REQ-2**: Concurrent calls to `LockSeats` with overlapping but differently ordered seat IDs must not produce deadlocks.
3. **REQ-3**: `LockSeats` must query the database a constant number of times (O(1)) relative to the number of seats requested.

### Non-Functional Requirements

1. **REQ-N1**: The locking mechanisms must be database-agnostic (using GORM's built-in locking clauses) and not rely on specific extensions (e.g., pg_advisory_lock).

## Approach

### Selected Approach

**Targeted Transaction & Query Refactoring**

We will address the three issues with targeted changes within the existing GORM-based repository layer (`internal/repository/order_repository.go`):
1.  **ReleaseOrder Race Condition**: Introduce `Clauses(clause.Locking{Strength: "UPDATE"})` to the `First(&order, orderID)` query inside the transaction in `ReleaseOrder`. This ensures exclusive access to the order row until the cancellation is committed, preventing simultaneous completion.
2.  **Deadlock in LockSeats**: Sort the `seatIDs` slice in ascending order (using UUID's string representation) *before* executing the `SELECT ... FOR UPDATE` query. This guarantees a consistent lock acquisition order across all concurrent requests, eliminating circular wait deadlocks.
3.  **N+1 Query in LockSeats**: Replace the `for` loop that queries individual seat zones with a single `IN` query: `Joins("JOIN event_zones ON event_zones.id = seats.zone_id").Where("seats.id IN ?", seatIDs).Preload("Zone").Find(&seats)`. We will then iterate over the loaded `seats` in memory to sum the `totalAmount` and build the `OrderItems`.

### Alternatives Considered

#### Advisory Locks (pg_advisory_xact_lock) for Deadlocks

- **Description**: Instead of sorting `seatIDs`, use Postgres advisory locks on a hash of the event ID or seat IDs.
- **Pros**: Doesn't require sorting strings in memory.
- **Cons**: Tying business logic to specific Postgres extensions reduces database portability. Sorting UUIDs in Go is fast and database-agnostic.
- **Rejected Because**: Violates the requirement for DB independence and adds unnecessary complexity.

#### Optimistic Locking (Version Column)

- **Description**: Add a `version` integer to the `orders` and `seats` tables. Check `version` on update.
- **Pros**: High read throughput, no database-level blocking locks.
- **Cons**: Requires schema changes, complex retry logic in the application.
- **Rejected Because**: The requirements explicitly mandate Database Transaction / Row Locking.

### Decision Matrix

| Criterion | Weight | Targeted Refactoring | Advisory Locks | Optimistic Locking |
| :--- | :--- | :--- | :--- | :--- |
| **Requirement Compliance** | 40% | 5: Direct compliance | 2: Fails DB agnostic | 1: Fails row locking |
| **Simplicity & Maintainability** | 30% | 5: Localized changes | 3: Complex management | 2: Complex retries |
| **Performance Improvement** | 30% | 4: Fixes N+1 | 4: Avoids deadlocks | 5: Best read perf |
| **Weighted Total** | | **4.7** | 2.9 | 2.5 |

## Architecture

### Component Diagram

```
[WorkerService] -> (calls) -> [ReleaseOrder]
                                    |
                                    v
                              [order_repository.go] 
                              - Adds FOR UPDATE lock on Order
                              - Sorts seatIDs in LockSeats
                              - Preloads Zones in LockSeats
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Implement fixes in `order_repository.go` |
| 2     | `tester` | No       | Verify concurrency fixes with tests |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Logic change in LockSeats breaks existing flow** | HIGH | LOW | We will write comprehensive tests specifically validating the final `TotalAmount` and `OrderItem` mapping. |
| **Performance overhead of string sorting** | LOW | MEDIUM | Sorting an array of UUIDs adds minor CPU overhead. Negligible for typical order sizes. |
| **Missed instances of ReleaseOrder usage** | MEDIUM | LOW | We will verify the transaction scope is tight to avoid blocking other reads. |

## Success Criteria

1. Concurrent execution of `ReleaseOrder` and `CompleteOrder` on the same order ID handles the lock correctly.
2. Concurrent execution of `LockSeats` with inverted seat ID lists does not deadlock.
3. `LockSeats` performs a constant number of database queries regardless of the number of seats.
