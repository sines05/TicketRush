---
title: "Fix Seat Booking Stuck State"
created: "2026-05-16T17:35:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "medium"
---

# Fix Seat Booking Stuck State Design Document

## Problem Statement

The seat booking flow suffers from a state deadlock on the client side. When a user has a seat in their cart and another user locks or buys that seat, the first user's UI reflects the seat as unavailable on the map, but a guard clause prevents them from removing it from their cart. This blocks them from continuing.

## Requirements

### Functional Requirements

1. **REQ-1 (State Unlock)**: Users must always be able to unselect a seat from their cart, regardless of its current global status.
2. **REQ-2 (Real-time Sync)**: When User A locks or buys a seat, the WebSocket event must immediately remove that seat from User B's cart and notify User B.
3. **REQ-3 (Identity Awareness)**: The system must distinguish between seats locked by the current user versus other users to avoid clearing the active user's cart upon their own checkout action.

### Non-Functional Requirements
- **NFR-1**: Performance overhead of WS broadcast must remain low.

### Constraints
- The backend relies on Go and GORM.
- The frontend relies on React Context and WebSockets.

## Approach

### Selected Approach

**Unified Real-Time Conflict Resolution**

- **Backend**: Inject `user_id` into the `SEATS_LOCKED` and `SEATS_SOLD` WebSocket payloads. This provides identity context for the events.
- **Frontend Context (`BookingContext.jsx`)**: Remove the status guard when toggling a seat *off* (removing from cart). Add a `REMOVE_SEATS` action for bulk conflict clearing.
- **Frontend Map (`SeatMap.jsx`)**: 
  - Allow `onClick` for seats currently in the user's cart, bypassing the lock/sold disable guard.
  - In the WebSocket handler, intersect incoming `seat_ids` with `selectedSeats`. If a match occurs and `msg.user_id !== current_user_id`, remove the seats from the cart and dispatch a UI notification.

### Alternatives Considered

#### Validate on Checkout Only
- **Description**: Rely entirely on the backend to reject the order at checkout.
- **Pros**: Simplest to implement.
- **Cons**: Leaves the user in the dark until they try to pay, causing frustration.
- **Rejected Because**: Degrades the user experience and violates REQ-2.

#### Backend Strict Conflict Error
- **Description**: Returning a complex error type from `LockSeats`.
- **Pros**: Clear API contract.
- **Cons**: Still reactive rather than proactive.
- **Rejected Because**: We want WS sync to prevent conflicts proactively.

### Decision Matrix

| Criterion | Weight | Unified Real-Time Sync | Checkout Validation Only |
|-----------|--------|------------------------|--------------------------|
| User Experience | 50% | 5: Proactive removal and notification | 2: Frustrating reactive error |
| Implementation Effort | 30% | 3: Requires touching frontend/backend | 5: Very easy |
| Identity Awareness | 20% | 5: Clear distinction in WS payload | 1: None |
| **Weighted Total** | | **4.4** | **2.7** |

## Architecture

### Data Flow

```
User A clicks "Continue" -> POST /api/lock_seats
Backend locks seats -> Broadcasts WS `SEATS_LOCKED` with `user_id`
User B receives WS event -> Checks if `msg.user_id !== User B.user_id`
User B UI removes matched seats from cart -> Shows Toast notification
```

### Key Interfaces

```go
// WebSocket Payload Structure for SEATS_LOCKED/SEATS_SOLD
type WSEvent struct {
    Type    string      `json:"type"`
    SeatIDs []uuid.UUID `json:"seat_ids"`
    UserID  uuid.UUID   `json:"user_id"`
}
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | Backend and Frontend updates |
| 2     | tester   | No       | E2E or Unit test validation |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| User clears their own cart during fast checkout | MEDIUM | LOW | Ensure `user_id` comparison in WS handler is strict and handles type mismatches (string vs UUID). |
| Race condition between API response and WS event | LOW | LOW | The WS event logic relies on `user_id`, so even if the WS event arrives before the API returns, the user's own cart won't be cleared. |

## Success Criteria

1. User can always unselect a seat from their cart.
2. When User A locks a seat, it is automatically removed from User B's cart.
3. User B sees a notification indicating their seat was reserved by someone else.
