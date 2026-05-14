---
title: "Fix Booking Timer Expiration Lockout"
created: "2026-05-13T00:00:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Fix Booking Timer Expiration Lockout Design Document

## Problem Statement

When the 15-minute booking timer or an order expires, the backend workers remove the user from the `active` booking room but fail to properly clean up the queue session state (`AllowedAt` timestamp) in Redis. As a result, when the user (especially high-priority users who bypass the queue) is re-admitted to the booking page, the backend reuses the existing session with the old, expired `AllowedAt` timestamp. The frontend receives this stale timestamp, calculates that the time is already up, and permanently locks the user out of the seat selection page.

## Requirements

### Functional Requirements

1. **REQ-1**: When a user's booking session or order expires, their queue session state must be completely cleared from Redis.
2. **REQ-2**: When a user is re-admitted, the system must issue a new session with a fresh 15-minute `AllowedAt` timer.
3. **REQ-3**: The frontend must gracefully handle edge cases where it receives an already-expired timer by directing the user back to the queue or home page.

## Approach

### Selected Approach

**Delete Expired Sessions**

Instead of manually nullifying fields (`session.OrderID = nil`, `session.ExpiresAt = nil`) and leaving a stale session in Redis, the backend workers will aggressively delete the session when it expires. 
- *Rationale: This forces a clean state. When the user attempts to book again, they receive a brand new session and token, eliminating the risk of stale timestamps.*

### Alternatives Considered

**Reset Fields**: Keep the session but update `AllowedAt` to `now`.
- *Rejected Because: It requires more complex field management and could still fail if the session expires while the user is mid-request.*

### Decision Matrix

| Criterion | Weight | Delete Session | Reset Fields |
|-----------|--------|----------------|--------------|
| State Cleanliness | 60% | 5: Eradicates stale data risk | 2: Leaves session alive, risks field drift |
| Flow Integrity | 40% | 5: Forces standard queue re-entry | 4: Bypasses new token generation |

## Architecture

### Key Changes
- `internal/worker/worker.go`: Update `releaseExpiredOrders` and `releaseExpiredSessions` to call `s.queueRepo.DeleteSession(ctx, session.Token, session.EventID, session.UserID)`.
- `internal/queue/service.go`: Update `getOrCreateSession` to ensure `AllowedAt` is always initialized cleanly if a session is created or re-granted access.
- `frontend/src/pages/Booking/SeatMap.jsx`: Enhance timeout fallback logic.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Backend session cleanup logic |
| 2     | `coder`  | No       | Frontend fallback handling |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Queue Token mismatch | LOW | LOW | The frontend relies on the `queueToken` in the URL. If the session is deleted, the API will reject the old token, forcing the frontend to request a new queue status and token. |
| Race condition during deletion | LOW | MEDIUM | If a user refreshes exactly when the worker deletes the session, they will simply be placed back in the queue as a new participant, which is the intended behavior. |

## Success Criteria

1. Users whose 15-minute booking timer expires can return to the event page, re-enter the queue, and successfully access the Seat Map with a fresh 15-minute timer.
2. Order expiration accurately kicks the user out of the active room and fully revokes their previous session.