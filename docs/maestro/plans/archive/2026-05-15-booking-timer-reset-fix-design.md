---
title: "Booking Timer Reset Fix"
created: "2026-05-15T00:00:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Booking Timer Reset Fix Design Document

## Problem Statement

When a user clicks "Sửa ghế" (Edit seats) on the Checkout page, the frontend calls the `/orders/cancel` endpoint. The backend `CancelOrder` service not only releases the reserved seats but also aggressively purges the user's queue session and removes them from the active set. When the user is redirected back to the Seat Map, the application detects a missing session and generates a new one with a fresh 15-minute `allowed_at` timestamp. This logic error allows users to artificially extend their booking window indefinitely, bypassing the 15-minute limit.

## Requirements

### Functional Requirements

1. **REQ-1**: Clicking "Sửa ghế" must release the previously locked seats immediately.
2. **REQ-2**: The 15-minute booking timer must not reset when transitioning back to the seat map.

### Non-Functional Requirements

1. **REQ-N1**: Must be the smallest possible fix.
2. **REQ-N2**: Must not introduce new APIs or endpoints.

### Constraints

- Only backend changes are permitted to satisfy the minimal footprint constraint.

## Approach

### Selected Approach

**Modify CancelOrder to Keep Queue Session**

We will remove the session deletion logic from the existing `CancelOrder` method in `internal/service/order_service.go`. The frontend `Checkout.jsx` will continue to call `/orders/cancel` as before.
- **Pros**: Zero API changes. Extremely small code footprint (removing ~5 lines of code). Fixes the root cause without side effects, as `CancelOrder` is exclusively used by the "Sửa ghế" frontend action.
- **Cons**: Users who click "Sửa ghế" but then close the tab will hold their queue slot until the 15-minute TTL expires natively (which is standard behavior for active sessions).

### Alternatives Considered

#### Dedicated `ReleaseSeats` Endpoint
- **Description**: Create a new API endpoint specifically for releasing seats without canceling sessions.
- **Pros**: Clean separation of intent.
- **Cons**: Rejected because it introduces new APIs and requires frontend changes, violating the minimal footprint constraint.

#### Frontend-Only Fix
- **Description**: Remove the API call from the frontend and rely on `LockSeats` to overwrite old orders.
- **Pros**: Zero backend changes.
- **Cons**: Rejected because previously selected seats would remain locked until new seats are selected, preventing other users from buying them immediately.

## Architecture

### Component Diagram

```
[Checkout.jsx] --(1. Sửa ghế)--> [orderService.js] (Frontend)
                                      |
                                      v
[OrderHandler] <--(2. POST /orders/cancel)
      |
      v
[OrderService.CancelOrder] --(3. Broadcast SEATS_RELEASED)--> [Websocket Hub]
      |
      v
[OrderRepo.CancelOrder] --(4. Release DB locks)--> [PostgreSQL]
```

### Data Flow

1. User clicks "Sửa ghế" in `Checkout.jsx`.
2. Frontend calls the existing API `POST /orders/cancel`.
3. Backend `OrderHandler` routes the request to `OrderService.CancelOrder`.
4. `OrderService.CancelOrder` calls `OrderRepo.CancelOrder` to free the seats in the database.
5. `OrderService.CancelOrder` broadcasts the `SEATS_RELEASED` event via websockets.
6. Backend returns success (without deleting the queue session).
7. Frontend `Checkout.jsx` navigates to `/booking/seats`.
8. `SeatMap.jsx` loads and uses the existing active queue session, keeping the original 15-minute timer intact.

### Key Interfaces

```go
// internal/service/order_service.go
// Modified to remove session deletion
CancelOrder(ctx context.Context, userID uuid.UUID, orderID uuid.UUID) error
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Remove session deletion from `CancelOrder` and update tests |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Queue Slots Held Longer | LOW | HIGH | Rely on the existing 15-minute Redis TTL to clean up slots for users who abandon the tab after clicking "Sửa ghế". |
| Test Failures | LOW | HIGH | Existing unit tests for `CancelOrder` might expect the queue deletion mocks to be called. Ensure `coder` agent updates `order_service_test.go` to remove these mock expectations. |

## Success Criteria

1. Clicking "Sửa ghế" releases the previously locked seats immediately.
2. The user is redirected to the seat map without the 15-minute timer resetting.
3. No new APIs or frontend changes are introduced.
