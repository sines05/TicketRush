---
title: "Security and Logic Fixes Implementation Plan"
design_ref: "/home/son/TicketRush/docs/maestro/plans/2026-05-19-fix-security-and-logic-flaws-design.md"
created: "2026-05-19"
status: "draft"
total_phases: 4
estimated_files: 8
task_complexity: "complex"
---

# Security and Logic Fixes Implementation Plan

## Plan Overview

- **Total phases**: 4
- **Agents involved**: coder, security_engineer
- **Estimated effort**: Complex task involving surgical patches across multiple Go services, middleware, and a Python AI agent.

## Dependency Graph

```
Phase 1: Foundation & Config
    |
Phase 2: Authentication & Session Management
    |
Phase 3: Authorization (BOLA) & Logic Fixes
    |
Phase 4: AI & Infrastructure Security
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1, 2 | Parallel | 1 | Foundation fixes |
| 2     | Phase 3, 4 | Sequential | 1 | Logic and AI fixes |

## Phase 1: Foundation & Config Fixes

### Objective
Remove insecure hardcoded secrets and secure the proxy trust configuration to prevent IP spoofing.

### Agent: coder
### Parallel: Yes

### Files to Modify

- `internal/config/config.go` — Remove `"super-secret"` and `"password"` fallbacks. Use a helper to fetch environment variables or panic if missing.
- `cmd/server/main.go` — Change `SetTrustedProxies(nil)` to `SetTrustedProxies([]string{"127.0.0.1"})`.

### Implementation Details
- In `config.go`, implement `getEnvOrPanic(key string)` to enforce mandatory configuration.
- In `main.go`, restrict trusted proxies to local loopback as a safe default for Docker/Local development.

### Validation
- `go build ./cmd/server/...`
- Verify server panics if `JWT_SECRET` is unset.

### Dependencies
- Blocked by: None
- Blocks: Phase 3, 4

---

## Phase 2: Authentication & Session Security

### Objective
Fix the 2FA bypass in token refresh, secure password reset tokens with hashing, and unify auth middleware behavior.

### Agent: coder
### Parallel: Yes

### Files to Modify

- `internal/service/auth_service.go` — Update `RefreshToken` to derive `2fa_verified` status from the user's current settings or the old token. Hash reset tokens before storage.
- `internal/middleware/optional_auth_middleware.go` — Update to check the `tr_access_token` cookie for parity with `AuthMiddleware`.
- `internal/models/user.go` — (Documentation/Context) Ensure `PasswordReset.Token` is treated as a hashed value.

### Implementation Details
- `RefreshToken`: Check if `user.TwoFactorEnabled`. If so, ensure the new token only gets `2fa_verified: true` if the refresh token context confirms a prior 2FA check (or require re-verification).
- `ForgotPassword`: Generate a random token, store `SHA256(token)` in the DB.
- `ResetPassword`: Hash the incoming token and compare with the DB.

### Validation
- `go test ./internal/service/...`
- `go test ./internal/middleware/...`

### Dependencies
- Blocked by: None
- Blocks: Phase 3

---

## Phase 3: Authorization (BOLA) Patches

### Objective
Enforce strict ownership checks in order checkout and internal AI API handlers to prevent cross-user data access.

### Agent: coder
### Parallel: No

### Files to Modify

- `internal/service/order_service.go` — In `Checkout`, add `if order.UserID != userID { return utils.ErrOrderNotFound }`.
- `internal/handler/ai_internal_handler.go` — Make `X-User-ID` mandatory and enforce that it matches the `user_id` query parameter for all endpoints.

### Implementation Details
- Ensure `utils.ErrOrderNotFound` (or a similar constant) is returned for BOLA violations to avoid information disclosure.
- Standardize internal API headers to use the verified user context.

### Validation
- `go test ./internal/service/...`
- Manual check with two different user IDs via `curl`.

### Dependencies
- Blocked by: Phase 1, 2
- Blocks: None

---

## Phase 4: AI & Infrastructure Security

### Objective
Secure the AI agent's internal authentication and implement CSRF mitigations for cookie-based auth.

### Agent: coder
### Parallel: No

### Files to Modify

- `ai-agent/main.py` — Remove `None` default for `X_INTERNAL_SECRET`. Raise 500 error on startup if unset. Enforce strict string comparison.
- `cmd/server/main.go` — Add a simple CSRF middleware that checks `Origin` and `Referer` headers against `cfg.FrontendURL` for all state-changing methods (POST, PUT, DELETE).

### Implementation Details
- CSRF: Leverage the existing `config.FrontendURL` for the allowed origin.
- AI Agent: Use `os.environ["X_INTERNAL_SECRET"]` directly (which raises KeyError if missing) instead of `.get()`.

### Validation
- `pytest ai-agent/` (if available) or manual `curl` to AI agent endpoint.
- Verify CSRF middleware rejects requests from unknown origins.

### Dependencies
- Blocked by: Phase 1
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/config/config.go` | 1 | Secret enforcement |
| 2 | `cmd/server/main.go` | 1, 4 | Proxy trust & CSRF middleware |
| 3 | `internal/service/auth_service.go` | 2 | 2FA refresh & token hashing |
| 4 | `internal/middleware/optional_auth_middleware.go` | 2 | Middleware consistency |
| 5 | `internal/service/order_service.go` | 3 | BOLA fix in Checkout |
| 6 | `internal/handler/ai_internal_handler.go` | 3 | BOLA fix in internal API |
| 7 | `ai-agent/main.py` | 4 | AI Agent auth enforcement |
| 8 | `internal/models/user.go` | 2 | Model context for hashing |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | MEDIUM | Changing configuration might break existing dev environments. |
| 2 | HIGH | Changes to token refresh logic could logout active users. |
| 3 | MEDIUM | BOLA fixes are critical but low-risk for regression if implemented surgically. |
| 4 | MEDIUM | CSRF middleware might block legitimate traffic if headers are stripped by proxies. |

## Execution Profile

```
Execution Profile:
- Total phases: 4
- Parallelizable phases: 2 (Phase 1 and 2 can start together)
- Sequential-only phases: 2
- Estimated parallel wall time: 4-6 turns
- Estimated sequential wall time: 8-10 turns

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
