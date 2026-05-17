---
title: "refresh-token-implementation-impl-plan"
design_ref: "docs/maestro/plans/2026-05-16-refresh-token-implementation-design.md"
created: "2026-05-16T21:05:00Z"
status: "approved"
total_phases: 4
estimated_files: 10
task_complexity: "complex"
---

# Refresh Token Implementation Implementation Plan

## Plan Overview

This plan coordinates the implementation of a comprehensive Refresh Token mechanism. It begins with finalizing current git changes, followed by backend changes to support opaque, Redis-backed refresh tokens, and finishes with frontend Axios interceptors for seamless token rotation.

- **Total phases**: 4
- **Agents involved**: `devops_engineer`, `coder`, `tester`
- **Estimated effort**: High reasoning depth, multi-agent coordination across frontend and backend.

## Dependency Graph

```
Phase 1: Git Ops (Commit & Push)
      |
      v
Phase 2: Backend Refresh Token Core (Go + Redis)
      |
      v
Phase 3: Frontend Silent Refresh (React + Axios)
      |
      v
Phase 4: Integration & Simulation Testing
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Preparation |
| 2     | Phase 2 | Sequential | 1 | Backend Core |
| 3     | Phase 3 | Sequential | 1 | Frontend Integration |
| 4     | Phase 4 | Sequential | 1 | Validation |

## Phase 1: Git Ops (Commit & Push)

### Objective
Commit all current local changes (concurrency fixes, security patches) and push to the remote repository.

### Agent: `devops_engineer`
### Parallel: No

### Implementation Details
- Check `git status` for modified files.
- Stage all changes related to the previous concurrency and security fixes.
- Commit with a descriptive message: `feat(auth): fix concurrency flaws and admin 2fa bypass`.
- Push to the current branch.

### Validation
- `git status` shows a clean worktree.
- `git log` shows the new commit.

### Dependencies
- Blocked by: None
- Blocks: Phase 2

## Phase 2: Backend Refresh Token Core (Go + Redis)

### Objective
Implement the stateful Refresh Token logic in the Go backend using Redis for storage.

### Agent: `coder`
### Parallel: No

### Files to Modify
- `internal/service/auth_service.go`: Inject Redis client, update `Login`/OAuth callbacks to issue refresh tokens, add `RefreshToken` and `Logout` logic.
- `internal/handler/auth_handler.go`: Add `POST /refresh` and `POST /logout` handlers, update cookie setting logic to include `tr_refresh_token`.
- `cmd/server/main.go`: Register new auth routes and wire Redis into `AuthService`.
- `internal/middleware/auth_middleware.go`: (Optional) Update to ensure 401s are returned consistently for expired tokens.

### Implementation Details
- **AuthService**:
  - Add `*redis.Client` to `authService` struct.
  - Update `Login` to return `(accessToken string, refreshToken string, user *models.User, needs2FA bool, err error)`.
  - Store Refresh Token in Redis: `RT:<token> -> <user_id>` with a 7-day TTL.
  - Implement `RefreshToken(oldToken string) (newAccessToken, newRefreshToken, error)`.
- **AuthHandler**:
  - Set `tr_refresh_token` as an `HttpOnly`, `Secure`, `SameSite=Strict` cookie.
  - Set `tr_access_token` expiration to 1 hour.

### Validation
- `go test ./internal/service/...`
- Manual check using `curl` to verify `/refresh` returns new tokens.

### Dependencies
- Blocked by: Phase 1
- Blocks: Phase 3

## Phase 3: Frontend Silent Refresh (React + Axios)

### Objective
Implement Axios interceptors in the React frontend to automatically refresh the Access Token upon expiry.

### Agent: `coder`
### Parallel: No

### Files to Modify
- `frontend/src/services/api.js`: Add Axios response interceptor for 401 handling.
- `frontend/src/context/AuthContext.jsx`: Update login/logout handlers to manage the new token structure if necessary.

### Implementation Details
- **Axios Interceptor**:
  - Catch 401 errors.
  - Check if the error occurred during a `/refresh` call (to avoid infinite loops).
  - Use a `isRefreshing` flag and a `failedQueue` to handle concurrent failed requests.
  - Call `/api/v1/auth/refresh`.
  - On success, retry the original request.
  - On failure, clear local auth state and redirect to login.

### Validation
- Start the frontend and backend.
- Manually expire the access token (or set it to 5s for testing).
- Verify that subsequent API calls trigger a silent refresh and succeed without user intervention.

### Dependencies
- Blocked by: Phase 2
- Blocks: Phase 4

## Phase 4: Integration & Simulation Testing

### Objective
Verify the entire auth lifecycle and ensure no disruption to business logic (Orders, Queues, Admin Dashboard).

### Agent: `tester`
### Parallel: No

### Implementation Details
- Create a simulation script (e.g., `scratch/simulate_refresh.sh`) that logs in, waits for token expiry, and makes multiple concurrent requests.
- Verify that `Logout` correctly revokes the Refresh Token in Redis.
- Ensure WebSocket connections (which might use the token) are still working or handle reconnection gracefully.

### Validation
- All E2E tests in `tests/e2e/` pass.
- Simulation script succeeds.

### Dependencies
- Blocked by: Phase 3
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/service/auth_service.go` | 2 | Core refresh logic. |
| 2 | `internal/handler/auth_handler.go` | 2 | Auth endpoints. |
| 3 | `cmd/server/main.go` | 2 | DI and routing. |
| 4 | `frontend/src/services/api.js` | 3 | Axios interceptor. |
| 5 | `frontend/src/context/AuthContext.jsx` | 3 | Frontend auth state. |
| 6 | `scratch/simulate_refresh.sh` | 4 | Simulation script. |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Pure git operations. |
| 2     | MEDIUM | Transactional Redis operations need care (atomicity). |
| 3     | HIGH | Interceptor logic is prone to race conditions and infinite loops if not handled perfectly. |
| 4     | MEDIUM | Comprehensive testing across layers is complex. |

## Execution Profile

```
Execution Profile:
- Total phases: 4
- Parallelizable phases: 0
- Sequential-only phases: 4
- Estimated parallel wall time: N/A
- Estimated sequential wall time: ~40 minutes

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
