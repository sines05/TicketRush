---
title: "Fix Session Expiration Implementation Plan"
created: "2026-05-09T00:00:00Z"
status: "approved"
total_phases: 1
estimated_files: 3
task_complexity: "simple"
---

# Fix Session Expiration Implementation Plan

## Plan Overview
- **Total phases**: 1
- **Agents involved**: coder
- **Estimated effort**: Fix state synchronization in the countdown hook and add a grace period to the backend worker.

## Dependency Graph
```
Phase 1 [coder]
```

## Phase 1: Fix Countdown Hook and Backend Grace Period
### Objective
Update `useCountdown` to sync with props and add a 30-second grace period to the backend eviction worker.
### Agent: coder
### Parallel: No

### Files to Modify
- `frontend/src/hooks/useCountdown.js`
  - Add a `useEffect` to call `setEndsAtMs(toEndsAtMs({ seconds, endsAt }))` when `seconds` or `endsAt` changes.
  - Update `toEndsAtMs` to return `null` or `Infinity` if `endsAt` is explicitly `null`.
- `frontend/src/pages/Booking/SeatMap.jsx`
  - Ensure the expiration dialog only triggers if `allowedAt` is loaded and valid.
- `internal/worker/worker.go`
  - In `releaseExpiredSessions`, add a 30-second grace period: `now.Sub(*session.AllowedAt) > 15*time.Minute + 30*time.Second`.

### Implementation Details
- Ensure the frontend doesn't flash the expiration dialog while `allowedAt` is being fetched.
- The 30s backend grace period accounts for clock skew and network latency.

### Validation
- `npm run build` (frontend)
- `go build ./cmd/server` (backend)

### Dependencies
- Blocked by: None
- Blocks: None
