---
title: "Fix WebSocket Not Working in Seat Booking Implementation Plan"
design_ref: "/home/son/TicketRush/docs/maestro/plans/2026-05-16-fix-websocket-not-working-in-seat-booking-design.md"
created: "2026-05-16T11:46:00Z"
status: "draft"
total_phases: 2
estimated_files: 4
task_complexity: "complex"
---

# Fix WebSocket Not Working in Seat Booking Implementation Plan

## Plan Overview

- **Total phases**: 2
- **Agents involved**: coder, tester
- **Estimated effort**: Low/Medium. Modifying one backend file (Auth checks in `ServeWs`) and two frontend files (`useWebSocket.js` and `SeatMap.jsx`) plus adding some tests in `order_service_test.go` or similar.

## Dependency Graph

```text
[Phase 1: Implementation]
         |
[Phase 2: Validation]
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Full Stack Fixes |
| 2     | Phase 2 | Sequential | 1 | Validation |

## Phase 1: Full Stack Implementation

### Objective
Implement the backend cookie validation for WebSockets and the frontend hook cleanup and reconnection logic.

### Agent: coder
### Parallel: No

### Files to Create
None.

### Files to Modify

- `internal/websocket/client.go` — Update `ServeWs` to read `tr_access_token` from cookies. Use it to call `authService.ValidateToken()`. If cookie is absent, fallback to `Sec-WebSocket-Protocol` header. If both absent/invalid, return 401. If valid using cookie, do not mandate `Sec-WebSocket-Protocol` in `upgrader.Upgrade()`.
- `frontend/src/hooks/useWebSocket.js` — 
  1. Remove `{ token = null }` from parameters.
  2. Instantiate `WebSocket` with only `socketUrl` (no protocols array).
  3. Implement an exponential backoff or simple reconnection loop inside `useEffect` (on `onclose` and `onerror`), capped at a reasonable limit.
- `frontend/src/pages/Booking/SeatMap.jsx` — 
  1. Remove `token` destructuring from `useAuth()`.
  2. Remove `token` parameter from `useWebSocket` call.

### Implementation Details
- Backend:
  ```go
  var tokenString string
  cookie, err := r.Cookie("tr_access_token")
  if err == nil {
      tokenString = cookie.Value
  }
  if tokenString == "" {
      tokenString = r.Header.Get("Sec-WebSocket-Protocol")
  }
  if tokenString == "" {
      http.Error(w, "Unauthorized", http.StatusUnauthorized)
      return
  }
  // Validate tokenString...
  
  // Upgrade: don't require Sec-WebSocket-Protocol if we didn't use it
  responseHeader := http.Header{}
  if r.Header.Get("Sec-WebSocket-Protocol") != "" {
      responseHeader.Add("Sec-WebSocket-Protocol", r.Header.Get("Sec-WebSocket-Protocol"))
  }
  conn, err := upgrader.Upgrade(w, r, responseHeader)
  ```
- Frontend: Implement simple `setTimeout` on `close` to re-create the `ws` object.

### Validation
- Build the backend: `go build ./...`
- Run frontend linter.

### Dependencies
- Blocked by: None
- Blocks: [2]

---

## Phase 2: Validation

### Objective
Ensure the WebSocket connections are properly tested, especially authentication logic.

### Agent: tester
### Parallel: No

### Files to Modify
- Testing files if appropriate (e.g. `internal/websocket/client_test.go` or creating one, or `internal/tests/...`).

### Validation
- `go test ./...`

### Dependencies
- Blocked by: [1]
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/websocket/client.go` | 1 | Cookie Auth |
| 2 | `frontend/src/hooks/useWebSocket.js` | 1 | Reconnection & Cleanup |
| 3 | `frontend/src/pages/Booking/SeatMap.jsx` | 1 | Cleanup token |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Straightforward auth logic fix. |
| 2     | LOW | Test updates. |

## Execution Profile

```text
Execution Profile:
- Total phases: 2
- Parallelizable phases: 0 (in 0 batches)
- Sequential-only phases: 2
- Estimated parallel wall time: N/A
- Estimated sequential wall time: 2 mins

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```