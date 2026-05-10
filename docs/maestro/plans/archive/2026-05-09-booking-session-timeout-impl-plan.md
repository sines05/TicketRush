---
title: "Booking Session Timeout Implementation Plan"
created: "2026-05-09T00:00:00Z"
status: "approved"
total_phases: 2
estimated_files: 4
task_complexity: "simple"
---

# Booking Session Timeout Implementation Plan

## Plan Overview
- **Total phases**: 2
- **Agents involved**: coder
- **Estimated effort**: Implement a 15-minute hard timeout for users on the seat selection page to optimize virtual queue throughput.

## Dependency Graph
```
Phase 1 [coder] ----> Phase 2 [coder]
```

## Execution Strategy
| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Backend logic and worker |
| 2     | Phase 2 | Sequential | 1 | Frontend UX and timer |

## Phase 1: Backend Session Timer
### Objective
Update the QueueSession model to track `AllowedAt` and implement a background worker to evict expired sessions.
### Agent: coder
### Parallel: No

### Files to Modify
- `internal/queue/session.go` — Add `AllowedAt *time.Time` to the `QueueSession` struct.
- `internal/queue/service.go` — Update `getOrCreateSession` and `ProcessQueue` to set `AllowedAt` when `status == "allowed"`. Add validation in `LockSeats` (via `OrderService`) to reject expired sessions.
- `internal/worker/worker.go` — Add a new worker routine (`releaseExpiredSessions`) that runs every minute to scan for sessions where `AllowedAt` is older than 15 minutes and has no `OrderID`. Remove them from the active set and delete the session.

### Implementation Details
- `AllowedAt` should be recorded when the user transitions from `waiting` to `allowed`.
- Eviction means: remove from `event:{id}:active` Redis set, allowing `ProcessQueue` to admit new users.

### Validation
- `go build ./cmd/server`
- `go test ./internal/tests/...`

### Dependencies
- Blocked by: None
- Blocks: Phase 2

## Phase 2: Frontend Countdown Timer
### Objective
Display a 15-minute countdown timer on the SeatMap page and redirect the user when time expires.
### Agent: coder
### Parallel: No

### Files to Modify
- `frontend/src/pages/Booking/SeatMap.jsx` — Add a countdown timer based on the `AllowedAt` timestamp from the queue status endpoint (or local 15-minute clock starting when they hit the page). Redirect to `/` when time is up with an alert.

### Implementation Details
- Add a sticky banner or header showing the remaining time (e.g., "Thời gian chọn ghế: 14:59").
- When the timer reaches 0, display a modal or toast: "Phiên chọn ghế đã hết hạn" and use `navigate('/')`.

### Validation
- `npm run build` in frontend.

### Dependencies
- Blocked by: Phase 1
- Blocks: None

## File Inventory
| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/queue/session.go` | 1 | Add AllowedAt field |
| 2 | `internal/queue/service.go` | 1 | Set AllowedAt timestamp |
| 3 | `internal/worker/worker.go` | 1 | Evict expired sessions |
| 4 | `frontend/src/pages/Booking/SeatMap.jsx` | 2 | Display countdown timer |

## Risk Classification
| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | MEDIUM | Touches core queue logic and active set management. |
| 2     | LOW    | Standard UI timer implementation. |

## Execution Profile
```
Execution Profile:
- Total phases: 2
- Parallelizable phases: 0
- Sequential-only phases: 2
```