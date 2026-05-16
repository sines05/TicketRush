---
title: "refresh-token-implementation"
created: "2026-05-16T21:00:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "complex"
---

# Refresh Token Implementation Design Document

## Problem Statement

The user requested to commit and push current changes, and then implement a comprehensive Refresh Token mechanism.

Currently, the TicketRush application relies solely on a long-lived Access Token (JWT) with a 24-hour expiration. This presents several challenges:
1.  **Security Risk**: A compromised JWT remains valid for up to 24 hours, giving an attacker ample time to exploit the system.
2.  **Lack of Revocation**: The system currently lacks a robust token blacklist mechanism. When a user logs out, the JWT remains technically valid.
3.  **User Experience (UX)**: If we simply shorten the JWT lifespan (e.g., to 15 minutes) without a refresh mechanism, users will be frequently logged out during normal usage.

A robust Refresh Token mechanism solves these by combining short-lived Access Tokens (e.g., 1-2 hours) for security with long-lived, revocable Refresh Tokens (e.g., 7 days) stored securely (e.g., in Redis) to maintain seamless UX.

## Requirements

### Functional Requirements

1. **REQ-1**: Access tokens must have a shortened lifespan (e.g., 1 hour).
2. **REQ-2**: The system must issue a long-lived Refresh Token upon successful login and 2FA verification.
3. **REQ-3**: A new `/api/v1/auth/refresh` endpoint must validate the refresh token and issue a new pair (token rotation).
4. **REQ-4**: A new `/api/v1/auth/logout` endpoint must revoke the refresh token in Redis.
5. **REQ-5**: The frontend React app must silently refresh the access token when encountering a 401 response and replay failed requests.

### Non-Functional Requirements

1. **REQ-N1**: Prior to implementing the refresh token, all current local git changes must be committed and pushed.
2. **REQ-N2**: The frontend interceptor must handle concurrent 401 responses gracefully (e.g., via a mutex queue) to prevent multiple simultaneous refresh calls.

## Approach

### Selected Approach

**Dual-Token Architecture with Redis Persistence & Axios Interceptors**

1.  **Git Ops First**: The implementation plan will include a Phase 1 dedicated exclusively to committing and pushing the recent concurrency and security fixes.
2.  **Backend (Go)**:
    *   **Auth Service**: Update `Login`, 2FA, and OAuth callbacks to generate both an Access Token (JWT) and an opaque Refresh Token.
    *   **Redis Storage**: Store the Refresh Token in Redis mapped to the user ID. This provides instantaneous revocation capabilities.
    *   **New Endpoints**: Implement `/api/v1/auth/refresh` and `/api/v1/auth/logout`.
3.  **Frontend (React)**:
    *   **API Client (Axios)**: Implement an Axios response interceptor that catches `401 Unauthorized` errors.
    *   **Silent Refresh Logic**: The interceptor queues pending requests, calls the `/refresh` endpoint, and upon success, updates the stored Access Token and replays the queued requests.

### Alternatives Considered

#### Stateless Refresh Tokens (JWT)
- **Description**: Use a JWT for the Refresh Token instead of an opaque string in Redis.
- **Pros**: Easier to implement, no Redis dependency.
- **Cons**: Cannot be revoked immediately.
- **Rejected Because**: The primary goal is to fix the lack of revocation. We already have Redis running in the stack.

#### Cookie-Only Architecture
- **Description**: Store both Access and Refresh tokens in `HttpOnly` cookies.
- **Pros**: Highest security against XSS.
- **Cons**: Complicates cross-domain mobile app usage if planned in the future.
- **Rejected Because**: The current system supports both cookies and Authorization headers. We will maintain this flexibility.

### Decision Matrix

| Criterion | Weight | Stateful Opaque (Redis) | Stateless (JWT) | Cookie-Only |
| :--- | :--- | :--- | :--- | :--- |
| **Security (Revocability)** | 40% | 5: Instant revocation | 1: Hard to revoke | 5: Instant (if stateful) |
| **UX (Seamlessness)** | 30% | 5: Invisible to user | 5: Invisible to user | 4: CSRF handling |
| **Maintainability** | 30% | 4: Needs Redis | 5: No DB needed | 3: Complex CORS setup |
| **Weighted Total** | | **4.7** | 3.4 | 4.1 |

## Architecture

### Component Diagram

```
[Frontend Client]
      |
      | 1. API Call (Access Token)
      v
[Backend API] --> 401 Unauthorized (Token Expired)
      |
      | 2. Interceptor catches 401
      | 3. Call POST /refresh (Refresh Token)
      v
[Backend API] --> Validates against [Redis]
      |
      | 4. Returns New Access + Refresh Token
      v
[Frontend Client] --> Updates storage, replays step 1
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `devops_engineer` | No | Git commit and push of existing changes. |
| 2     | `coder`  | No       | Backend implementation of Refresh Token logic and Redis integration. |
| 3     | `coder`  | No       | Frontend implementation of Axios interceptors and auth state. |
| 4     | `tester` | No       | Simulation scripts and testing of the refresh flow. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Race Conditions in Frontend Interceptor** | HIGH | MEDIUM | Implement a mutex/queue in the Axios interceptor to pause requests while the first refresh is in progress. |
| **Git Push Failure** | MEDIUM | LOW | The `devops_engineer` agent handling Phase 1 will ensure a clean pull/rebase if necessary before pushing. |
| **Business Logic Disruption** | HIGH | LOW | Thoroughly test WebSocket upgrades to ensure they handle the new tokens correctly. |

## Success Criteria

1. All current changes are successfully pushed to the remote repository.
2. A logged-in user can remain active indefinitely as long as their Refresh Token is valid.
3. Upon calling `/logout`, both the Access and Refresh tokens are invalidated, and subsequent API calls fail until a new login.
