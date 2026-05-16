---
title: "Fix WebSocket Not Working in Seat Booking"
created: "2026-05-16T11:45:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "complex"
---

# Fix WebSocket Not Working in Seat Booking Design Document

## Problem Statement

The WebSocket connection fails entirely with a 401 Unauthorized error in the seat booking area. This is caused by a disconnect between the recently updated authentication system (which uses HttpOnly cookies for security) and the WebSocket connection logic (which still expects the JWT token to be passed via the `Sec-WebSocket-Protocol` header). Since the frontend cannot access the HttpOnly cookie, it passes an empty or undefined token, causing the backend to reject the upgrade request.

## Requirements

### Functional Requirements

1. **REQ-1 (Cookie Auth)**: The WebSocket connection must authenticate users seamlessly using the HttpOnly `tr_access_token` cookie.
2. **REQ-2 (Fallback Auth)**: For backward compatibility or non-browser clients, the backend should still support `Sec-WebSocket-Protocol` as a fallback.
3. **REQ-3 (Frontend Cleanup)**: The frontend hooks should no longer attempt to pass undefined tokens to the WebSocket constructor.
4. **REQ-4 (Resiliency)**: The frontend WebSocket hook must implement automatic reconnection logic for brief drops.

### Non-Functional Requirements
- **NFR-1**: The connection upgrade process must not introduce significant latency.

### Constraints
- The backend relies on Go and Gorilla WebSocket.
- The frontend relies on React and standard browser WebSockets.

## Approach

### Selected Approach

**Unified Cookie & Header Authentication with Reconnection**

- **Backend (`internal/websocket/client.go`)**: Update `ServeWs` to first check the `tr_access_token` cookie from the HTTP request. If the cookie is present, use it to validate the user. If missing, fall back to checking the `Sec-WebSocket-Protocol` header.
- **Frontend (`SeatMap.jsx` & `useWebSocket.js`)**: Remove the `token` parameter from the `useWebSocket` hook and its usage in `SeatMap.jsx`. Rely on the browser's native behavior of including cookies with WebSocket upgrade requests. Implement an exponential backoff reconnection strategy.

### Alternatives Considered

#### Expose JWT to JavaScript
- **Description**: Stop using HttpOnly for the cookie so JS can read it.
- **Rejected Because**: Degrades security and exposes the application to XSS token theft.

## Architecture

### Component Diagram

```
Browser (SeatMap) -> native WebSocket (sends Cookie) -> Backend (ServeWs)
Backend -> parses Cookie -> Validates JWT -> Upgrades Connection
```

### Component Updates
- **`internal/websocket/client.go`**: Update `ServeWs` function to read `cookie, err := r.Cookie("tr_access_token")`.
- **`frontend/src/hooks/useWebSocket.js`**: Remove the `token` parameter. The constructor call will simply be `new WebSocket(socketUrl)`. Add a basic automatic reconnection mechanism.
- **`frontend/src/pages/Booking/SeatMap.jsx`**: Remove destructuring of `token` from `useAuth()` and omit it when calling `useWebSocket`.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | Backend and Frontend WebSocket connection fixes |
| 2     | tester   | No       | Backend and frontend testing (if applicable) |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| CORS/Cookie inclusion issues with Vite proxy | LOW | LOW | The Vite proxy is already configured on the same origin (`localhost:5173`) and sends cookies automatically. In production, the WebSocket endpoint is on the same domain, so cookies are included. |
| Reconnection loops | LOW | MEDIUM | Implement a maximum backoff or limit reconnection attempts in `useWebSocket.js`. |

## Success Criteria

1. The WebSocket connection successfully upgrades and stays open in the seat booking page.
2. Real-time updates (locking, selling seats) work perfectly between different browsers/users.
3. The connection automatically recovers from brief drops.
