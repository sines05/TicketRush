---
title: "Fix Timer Reset and Slot Leak Vulnerabilities"
created: "2026-05-14T11:00:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Fix Timer Reset and Slot Leak Vulnerabilities Design Document

## Problem Statement

Two critical vulnerabilities remain in the ticket booking system:
1. **Timer Reset Vulnerability**: The `AllowedAt` timestamp in `QueueSession` can be reset if `getOrCreateSession` is called with a status change, allowing users to stay in the booking flow indefinitely by re-triggering session creation (e.g., by clicking "Edit Seats").
2. **Queue Slot Over-admission (Over-cleaning)**: The proactive cleanup in `LockSeats` calls the full `OrderService.CancelOrder` method, which removes the user from the Redis `active` set. This allows the system to admit an extra user beyond the `ActiveUserThreshold` even if the current user is still selecting seats.

## Requirements

### Functional Requirements

1. **REQ-1 (Immutable AllowedAt)**: The `AllowedAt` timestamp must only be set **once** when a user first becomes `allowed`. It must never be updated or reset during the lifetime of a single active queue stint.
2. **REQ-2 (Balanced Proactive Cleanup)**: When a user changes seats (`LockSeats` called with an existing `PENDING` order), the system must release the old seats in the database but **must not** remove the user from the Redis `active` set or delete their session.
3. **REQ-3 (Exhaustive Verification)**: Prove the system is resilient to "stay indefinitely" exploits and slot leakage.

### Non-Functional Requirements

1. **Robustness**: Background workers must act as a reliable fallback for any cleanup missed by the service layer.
2. **Correctness**: The `active` count in Redis must perfectly reflect the number of users currently holding selection rights.

## Approach

### Selected Approach: Strict Lifecycle Management

**1. Fix `getOrCreateSession` Logic**
Modify `internal/queue/service.go` to ensure `AllowedAt` is only set if it is currently `nil`.

**2. Refactor `LockSeats` Proactive Cleanup**
In `internal/service/order_service.go`, replace the call to `s.CancelOrder` (which clears Redis) with a call to `s.orderRepo.CancelOrder` (DB only) followed by a broadcast.

**3. Strengthen Worker Filter**
Ensure `releaseExpiredSessions` in `internal/worker/worker.go` correctly identifies sessions that have timed out and either have no order or have a non-pending order.

## Architecture

### Interaction Flow (Edit Seats)

1. User enters `SeatMap`. Session created, `AllowedAt` set.
2. User selects seats, clicks "Proceed". `OrderService.LockSeats` called. `OrderID` attached to session.
3. User clicks "Edit Seats" (back to map).
4. User selects new seats, clicks "Proceed".
5. `OrderService.LockSeats` finds existing `PENDING` order.
6. Calls `orderRepo.CancelOrder` (DB only). Seats released.
7. Calls `orderRepo.LockSeats` for new seats.
8. User session remains `active` in Redis. `AllowedAt` remains the original timestamp.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | Fix logic bugs in services and workers |
| 2     | tester   | No       | Exhaustive integration tests |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Session lookup performance | LOW | LOW | Use indexed fields in Redis. |
| Inconsistency between DB and Redis | MEDIUM | LOW | Worker fallback handles eventual consistency. |

## Success Criteria

1. `AllowedAt` never changes once set.
2. `ActiveUserThreshold` is strictly honored even during frequent seat changes.
3. No user can stay in the booking flow for more than 15.5 minutes without completing a purchase.
