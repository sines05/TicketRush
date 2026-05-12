---
title: "Audit Seat Status Sync"
created: "2026-05-13T00:00:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "medium"
---

# Audit Seat Status Sync Design Document

## Problem Statement

When a user successfully pays for their selected seats, two synchronization issues occur:
1. **Frontend Persistence**: The `BookingContext` retains the `selectedSeats` array in `sessionStorage` after checkout. When the user navigates back to the event page, the UI reads this stale selection and renders the seats as "ĐANG CHỌN" (orange).
2. **Backend State Inconsistency**: In the database, the `CompleteOrder` function updates the seat status to `SOLD` but forgets to clear the temporary `locked_by_user_id` and `locked_at` fields. While the UI checks `status === 'LOCKED'`, this messy database state creates a brittle foundation.

When the user attempts to click "TIẾP TỤC THANH TOÁN" with these stale orange seats, the backend correctly identifies they are no longer available (they are `SOLD`), resulting in the "some seats are already taken" error.

## Requirements

### Functional Requirements

1. **REQ-1 (Frontend State Clearing)**: Upon successful checkout, the frontend's `BookingContext` must clear the `selectedSeats` array from state and `sessionStorage` to prevent stale "selected" statuses upon re-entry.
2. **REQ-2 (Database Consistency)**: The backend `CompleteOrder` function must atomically clear the temporary lock fields (`locked_by_user_id` and `locked_at`) when updating a seat's status to `SOLD`.

### Constraints

- The fix must perfectly align with the existing `sessionStorage` hydration mechanisms in `BookingContext` without breaking edge cases like user-initiated reloads mid-checkout.

## Approach

### Selected Approach

**Comprehensive State Cleanup**

- **Frontend**: Inject a `clearSelection()` call within `handlePay` in `Checkout.jsx` immediately after the API confirms a successful order.
  - *Rationale: This is the most deterministic point in the user journey. Once the server confirms the ticket generation, the intent to select those seats is finalized. Clearing it prevents stale visual UI states on re-entry. (Traces To: REQ-1)*
- **Backend**: Modify `CompleteOrder` in `internal/repository/order_repository.go` to use `.Updates(map[string]interface{}{...})` passing `nil` to the lock fields.
  - *Rationale: Ensures strict database invariants. A `SOLD` seat can never logically belong to a temporary queue lock. This prevents subtle bugs downstream. (Traces To: REQ-2)*

### Alternatives Considered

#### Backend-only Status Override

*(considered: Relying strictly on the DB `SOLD` status and sending that to the frontend to override local `selected` state — rejected because the frontend prioritizes user intent (`selected`) visually over the backend status to ensure snappy UX. Attempting to override it creates a race condition where the UI flickers between sold and selected.)*

### Decision Matrix

| Criterion | Weight | Comprehensive Cleanup | Backend-only Override |
|-----------|--------|-----------------------|-----------------------|
| UX Consistency | 50% | 5: Absolutely prevents the "orange seat" glitch. | 2: Fails to address the root cause in `sessionStorage`. |
| DB Integrity | 50% | 5: Enforces strict data models. | 3: Allows orphaned lock IDs to persist. |
| **Weighted Total** | | **5.0** | **2.5** |

## Architecture

### Key Changes
1. `frontend/src/pages/Booking/Checkout.jsx`: Call `clearSelection()` after `orderService.checkout` succeeds.
2. `internal/repository/order_repository.go`: Convert `.Update("status", models.SeatSold)` to `.Updates()` to nullify `locked_by_user_id` and `locked_at`.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Complete backend and frontend state fixes |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Side-effect on pending checkouts | LOW | LOW | The `sessionStorage` clearance happens strictly *after* the `Checkout` API returns success. If the API fails, the selection remains intact for the user to try again. |

## Success Criteria

1. When a user completes checkout, their `sessionStorage` booking context is cleared.
2. If the user navigates back to the event `SeatMap.jsx`, the purchased seats appear as gray (SOLD), not orange (SELECTING).
3. The database accurately reflects `locked_by_user_id` as `NULL` for `SOLD` seats.