---
title: "Fix Booking Timer Expiration Lockout Implementation Plan"
design_ref: "/home/son/TicketRush/docs/maestro/plans/2026-05-13-fix-booking-timer-expiration-design.md"
created: "2026-05-13T00:00:00Z"
status: "draft"
total_phases: 2
estimated_files: 3
task_complexity: "medium"
---

# Fix Booking Timer Expiration Lockout Implementation Plan

## Plan Overview

- **Total phases**: 2
- **Agents involved**: coder
- **Estimated effort**: Medium. Modifying session cleanup logic in the Go backend workers and queue service, and updating React frontend logic for edge-case redirect.

## Dependency Graph

```
[Phase 1: Backend Session Cleanup]
        |
        v
[Phase 2: Frontend Fallback Handling]
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Backend logic update |
| 2     | Phase 2 | Sequential | 1 | Frontend redirect logic |

## Phase 1: Backend Session Cleanup

### Objective
Update the background workers to properly delete queue sessions upon order expiration and ensure `AllowedAt` is freshly set upon admission.

### Agent: coder
### Parallel: No

### Files to Modify

- `internal/worker/worker.go` — Update `releaseExpiredOrders` to call `s.queueRepo.DeleteSession(ctx, session.Token, session.EventID, session.UserID)` instead of just nullifying `OrderID` and `ExpiresAt`. In `releaseExpiredSessions`, verify session deletion is clean.
- `internal/queue/service.go` — Update `getOrCreateSession` and `ProcessQueue` to set `AllowedAt = &now` unconditionally when a session transitions to `"allowed"`, ensuring re-admitted users get a fresh timer. Remove the `if session.AllowedAt == nil` check for the `"allowed"` status block.

### Implementation Details

- In `internal/worker/worker.go`:
  - Locate `session.OrderID = nil` and `session.ExpiresAt = nil` inside `releaseExpiredOrders`.
  - Replace them with a call to `s.queueRepo.DeleteSession(ctx, session.Token, session.EventID, session.UserID)`.
- In `internal/queue/service.go`:
  - Locate `if status == "allowed" && session.AllowedAt == nil` in `getOrCreateSession`.
  - Change it to `if status == "allowed"`.
  - Locate `if session.AllowedAt == nil` inside `ProcessQueue`.
  - Change it so `AllowedAt` is updated to `now` unconditionally when transitioning to `"allowed"`.

### Validation

- `cd backend && go build ./...`
- `cd backend && go test ./internal/tests/... -v`

### Dependencies

- Blocked by: None
- Blocks: 2

---

## Phase 2: Frontend Fallback Handling

### Objective
Ensure the frontend gracefully handles stale or already-expired timers by redirecting the user back to the waiting room/queue.

### Agent: coder
### Parallel: No

### Files to Modify

- `frontend/src/pages/Booking/SeatMap.jsx` — Update the timer initialization and expiration logic to force a fresh status check if `allowedAt` is missing or already expired upon load.

### Implementation Details

- Add an effect in `SeatMap.jsx` to check `isExpired` after `allowedAt` is set. If the session is already expired when the user lands on the page, instead of just showing the dialog (helpful if they were already on the page), it should offer a way back. 
- A key fix is in the `allowedAt` initialization: if the backend sends an old `allowedAt`, the frontend should realize it's invalid and redirect.

### Validation

- `cd frontend && npm run lint`
- `cd frontend && npm run build`

### Dependencies

- Blocked by: 1
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/worker/worker.go` | 1 | Worker session cleanup |
| 2 | `internal/queue/service.go` | 1 | Service timer reset |
| 3 | `frontend/src/pages/Booking/SeatMap.jsx` | 2 | UI fallback |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW  | Simple conditional and database calls. Well isolated. |
| 2     | LOW  | Adding redirect logic to an existing dialog. |

## Execution Profile

```
Execution Profile:
- Total phases: 2
- Parallelizable phases: 0
- Sequential-only phases: 2
- Estimated parallel wall time: 0
- Estimated sequential wall time: 2 mins

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```