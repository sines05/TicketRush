---
title: "Fix Login Flow Security Implementation Plan"
design_ref: "docs/maestro/plans/2026-05-15-fix-login-flow-security-design.md"
created: "2026-05-15T16:20:00Z"
status: "approved"
total_phases: 4
estimated_files: 12
task_complexity: "complex"
---

# Fix Login Flow Security Implementation Plan

## Plan Overview

- **Total phases**: 4
- **Agents involved**: coder, tester
- **Estimated effort**: Moderate-to-High. Involves cross-cutting changes in backend auth logic, middleware, and frontend state management.

## Dependency Graph

```
Phase 1 (Foundation)
      |
Phase 2 (Logic & Validation)
      |
Phase 3 (Cookie Delivery & Middleware)
      |
Phase 4 (Frontend Integration)
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Encryption & Rate Limit Utils |
| 2     | Phase 2 | Sequential | 1 | 2FA Encryption & PW Policy |
| 3     | Phase 3 | Sequential | 1 | Cookies & Rate Limit App |
| 4     | Phase 4 | Sequential | 1 | FE Context & Service Updates |

---

## Phase 1: Foundation: Encryption & Rate Limiting Utils

### Objective
Create the core utility functions for encrypting sensitive data and the skeleton for rate limiting.

### Agent: coder
### Parallel: No

### Files to Create

- `internal/utils/encryption/encryption.go` — `EncryptAES` and `DecryptAES` using AES-256-GCM.
- `internal/middleware/rate_limit.go` — `RateLimitMiddleware` using Redis.

### Implementation Details
- `encryption.go`: Use a 32-byte key derived from `ENCRYPTION_MASTER_KEY` environment variable. Ensure it handles nonce generation and prepending.
- `rate_limit.go`: Define a fixed window rate limiter (e.g., 5 attempts / 15 mins) using Redis `INCR` and `EXPIRE`.

### Validation
- Create unit tests for encryption/decryption.
- Verify Redis connection in middleware test.

### Dependencies
- Blocked by: None
- Blocks: Phase 2, Phase 3

---

## Phase 2: Secure 2FA & Password Policy

### Objective
Implement encryption for 2FA secrets and harden password validation.

### Agent: coder
### Parallel: No

### Files to Modify

- `internal/service/auth_service.go`: Update `Generate2FA` to encrypt, `Enable2FA/Verify2FA` to decrypt. Update `Register` to enforce 8+ chars alphanumeric.
- `internal/handler/auth_handler.go`: Update validation tags in `loginRequest`, `resetPasswordRequest`, `changePasswordRequest`.
- `internal/repository/user_repository.go`: Ensure `Update2FA` stores the secret correctly.

### Implementation Details
- Handle dual-read: `DecryptAES` fails? Fallback to plaintext (for existing users).
- Use `regexp` in `auth_service.go` for password complexity check.

### Validation
- `go test ./internal/service/...`
- Manual verification of registration with weak passwords (should fail).

### Dependencies
- Blocked by: Phase 1
- Blocks: Phase 3

---

## Phase 3: Cookie-based JWT & Rate Limit Application

### Objective
Transition JWT delivery to HttpOnly cookies and apply rate limiting to routes.

### Agent: coder
### Parallel: No

### Files to Modify

- `internal/handler/auth_handler.go`: Update `Login`, `Verify2FALogin`, `GoogleCallback`, `FacebookCallback` to set `Set-Cookie` header instead of (or in addition to, for transition) returning token in JSON. Standardize "User not found" errors to generic messages.
- `internal/middleware/auth_middleware.go`: Update to read token from `tr_access_token` cookie.
- `cmd/server/main.go`: Register `RateLimitMiddleware` for sensitive auth routes.

### Implementation Details
- Cookie settings: `HttpOnly=true`, `Secure=true`, `SameSite=Lax`, `Path=/`, `MaxAge=86400`.
- Add `/api/v1/auth/logout` to clear the cookie.

### Validation
- `go test ./internal/handler/...`
- Use `curl -v` to verify `Set-Cookie` headers.

### Dependencies
- Blocked by: Phase 2
- Blocks: Phase 4

---

## Phase 4: Frontend Integration & Hydration

### Objective
Update the frontend to rely on HttpOnly cookies and hydrate state via `/me`.

### Agent: coder
### Parallel: No

### Files to Modify

- `frontend/src/services/api.js`: Configure `axios` with `withCredentials: true`.
- `frontend/src/services/authService.js`: Remove token handling from return values.
- `frontend/src/context/AuthContext.jsx`: Remove `localStorage` logic. Rely on `userService.getMe()` during app boot to check auth status. Update logout to call the backend logout.
- `frontend/src/pages/Auth/Login.jsx`: Update to handle successful login without explicit token storage.

### Implementation Details
- Ensure `useEffect` in `AuthProvider` handles the case where the cookie is present but no user data is in memory.

### Validation
- Manual end-to-end test of Login -> 2FA -> Dashboard.
- Verify `localStorage` is empty after login.

### Dependencies
- Blocked by: Phase 3
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/utils/encryption/encryption.go` | 1 | Encryption utilities |
| 2 | `internal/middleware/rate_limit.go` | 1 | Rate limit middleware |
| 3 | `internal/service/auth_service.go` | 2 | 2FA encryption & PW policy |
| 4 | `internal/handler/auth_handler.go` | 2, 3 | Validation & Cookie response |
| 5 | `internal/repository/user_repository.go` | 2 | 2FA persistence |
| 6 | `internal/middleware/auth_middleware.go` | 3 | JWT cookie reading |
| 7 | `cmd/server/main.go` | 3 | Middleware registration |
| 8 | `frontend/src/services/api.js` | 4 | Axios config |
| 9 | `frontend/src/services/authService.js` | 4 | Remove token return |
| 10 | `frontend/src/context/AuthContext.jsx` | 4 | Cookie-based state mgmt |
| 11 | `frontend/src/pages/Auth/Login.jsx` | 4 | Update login handling |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | LOW | Utility additions, low impact until used. |
| 2 | HIGH | Critical logic changes, risk of breaking 2FA for existing users. |
| 3 | MEDIUM | Middleware changes can block legitimate traffic; cookie issues. |
| 4 | MEDIUM | Complex state management changes in React. |

## Execution Profile

```
Execution Profile:
- Total phases: 4
- Parallelizable phases: 0
- Sequential-only phases: 4
- Estimated parallel wall time: N/A
- Estimated sequential wall time: 4 x Agent Execution Time

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
