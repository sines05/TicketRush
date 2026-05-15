---
title: "Fix Booking Timeout and Queue Slot Leaks"
created: "2026-05-14T10:00:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Fix Booking Timeout and Queue Slot Leaks Design Document

## Problem Statement

The current ticket booking system suffers from multiple logic bugs related to queue management and session timeouts:
1. **Queue Slot Leaks**: Manual cancellation or successful checkout does not explicitly remove users from the Redis `active` set or delete their queue sessions.
2. **Permanent User Lockout**: After a 15-minute selection timeout, users are often stuck in a loop where they are immediately greeted with an "Expired Session" message upon re-entry. This is caused by stale session data (specifically old `OrderID`s) preventing the cleanup workers from ejecting the user.
3. **Premature Session Eviction**: Creating a new order overwrites the `OrderID` in the session. If an older order expires, the worker might delete the session even if the user has a newer valid order.

## Requirements

### Functional Requirements

1. **REQ-1 (Explicit Cleanup on Cancel)**: When a user cancels an order via `POST /orders/cancel`, the system must immediately call `RemoveFromActive` and `DeleteSession`.
2. **REQ-2 (Session Refresh on Checkout)**: Successful checkout must delete the queue session so subsequent bookings start fresh.
3. **REQ-3 (Single Pending Order Enforcement)**: `LockSeats` must automatically cancel any existing `PENDING` order for the same user and event before creating a new one.
4. **REQ-4 (Robust Timeout Worker)**: The session timeout worker must correctly identify and clean up stale sessions even if they have an associated `OrderID`, provided that order is no longer `PENDING`.

### Non-Functional Requirements

1. **Reliability**: Queue slots must be returned to the pool as soon as possible to maximize throughput.
2. **Consistency**: Redis state (queue/session) must stay synchronized with the database state (orders).

## Approach

### Selected Approach: Active Lifecycle Management

Instead of relying solely on background workers, the system will adopt a proactive cleanup strategy in the service layer.

**Key Changes:**
- **OrderService.CancelOrder**: Add calls to `queueRepo.RemoveFromActive` and `queueRepo.DeleteSession`.
- **OrderService.Checkout**: Add call to `queueRepo.DeleteSession`.
- **OrderService.LockSeats**: Check for existing `PENDING` orders for the user/event. If found, call `CancelOrder` internally before proceeding.
- **WorkerService.releaseExpiredSessions**: Refine the filter logic. Instead of skipping sessions with *any* `OrderID`, it should only skip if the `OrderID` refers to a `PENDING` order that hasn't expired yet.

### Alternatives Considered

#### Alternative 1: Purely Worker-Based Cleanup
- **Description**: Fix the worker logic to be more comprehensive without changing the services.
- **Pros**: Less change to business logic.
- **Cons**: Slower slot reclamation (up to 1 minute delay). Doesn't solve the "Checkout Re-entry" issue immediately.
- **Rejected Because**: Does not provide the immediate responsiveness required for high-demand ticket sales.

### Decision Matrix

| Criterion | Weight | Worker-Based | Active Management |
|-----------|--------|--------------|-------------------|
| Reliability (Slot Release) | 40% | 2: Laggy, prone to edge cases | 5: Immediate and explicit |
| User Experience | 30% | 2: "Lockout" loops possible | 5: Clean re-entry guaranteed |
| Implementation Simplicity | 20% | 4: Centralized in worker | 3: Distributed across services |
| Performance | 10% | 5: Fewer DB/Redis calls | 4: Slightly more overhead per action |
| **Weighted Total** | | **2.9** | **4.5** |

## Architecture

### Interaction Flow

1. **LockSeats**: `OrderService` -> `OrderRepo.GetPendingOrder` -> `OrderService.CancelOrder` (if exists) -> `OrderRepo.LockSeats` -> `QueueRepo.UpdateSessionOrder`.
2. **Cancel/Checkout**: `OrderService` -> `OrderRepo` -> `QueueRepo.RemoveFromActive` & `DeleteSession`.
3. **Worker**: `WorkerService` -> `QueueRepo.ListSessions` -> Filter by `Status == "allowed"` AND (`OrderID == nil` OR `Order.Status != "PENDING"`).

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | Bug fixes in services and workers |
| 2     | tester   | No       | Unit tests and integration validation |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Race condition between Worker and Service | LOW | MEDIUM | Use Redis Pipelines for atomic operations. |
| DB load from frequent order lookups | LOW | LOW | Indexed queries on `user_id` and `event_id` in orders table. |

## Success Criteria

1. Users can always re-enter the booking flow after a 15-minute timeout.
2. The Redis `active` set count correctly reflects current users with valid pending orders or active selection sessions.
3. No "zombie" users remain in the `active` set after 16 minutes of inactivity.
