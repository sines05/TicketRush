---
title: "harden-2fa-security-impl-plan"
design_ref: "docs/maestro/plans/2026-05-16-harden-2fa-security-design.md"
created: "2026-05-16T21:48:00Z"
status: "approved"
total_phases: 2
estimated_files: 4
task_complexity: "medium"
---

# Harden 2FA Security Implementation Plan

## Plan Overview

- **Total phases**: 2
- **Agents involved**: `coder`, `tester`
- **Estimated effort**: Moderate backend refactoring.

## Dependency Graph

```
Phase 1: Backend Security Hardening Logic (Coder)
    |
Phase 2: Security Logic Verification (Tester)
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Logic Refactor |
| 2     | Phase 2 | Sequential | 1 | Testing |

## Phase 1: Backend Security Hardening Logic

### Objective
Implement the strict decryption policy and the signed 2FA pending token flow.

### Agent: `coder`
### Parallel: No

### Files to Modify

- `internal/service/auth_service.go` — Update decryption logic and token generation.
- `internal/handler/auth_handler.go` — Update handler input/output for 2FA.
- `cmd/server/main.go` — Apply rate limiting middleware.

### Implementation Details

1. **`auth_service.go`**:
    - `decrypt2FASecret`: Return error if `DecryptAES` fails.
    - `Generate2FAPendingToken(userID uuid.UUID) (string, error)`: New method to issue a 5-min JWT with `intent: 2fa_login`.
    - `Validate2FAPendingToken(token string) (uuid.UUID, error)`: New method to validate the pending token.
    - `Login`: If `user.TwoFactorEnabled`, call `Generate2FAPendingToken` and return it.
2. **`auth_handler.go`**:
    - `Login`: Return `pending_token` in the response instead of raw `user_id`.
    - `Verify2FALogin`: Change request struct to accept `pending_token`. Call `Validate2FAPendingToken` to get the user context.
3. **`cmd/server/main.go`**:
    - Add `middleware.RateLimitMiddleware(rdb, 5, 15*time.Minute)` to the `/auth/verify-2fa` route.

### Validation
- Build the project.
- Unit tests for new service methods.

### Dependencies
- Blocked by: None
- Blocks: Phase 2

---

## Phase 2: Security Logic Verification

### Objective
Verify the new security controls and ensure no regressions.

### Agent: `tester`
### Parallel: No

### Files to Create

- `internal/tests/security_2fa_test.go` — New test suite.

### Implementation Details

1. **OTP Brute-force**: Call `/auth/verify-2fa` with correct token but wrong code 6 times; confirm 429 Too Many Requests on the 6th call.
2. **Pending Token Requirement**: Call `/auth/verify-2fa` with a random UUID or invalid token; confirm 401 Unauthorized.
3. **Intent Enforcement**: Try to use a standard Access Token as a Pending Token; confirm rejection.
4. **Strict Decryption**: Manually insert a plaintext secret for a user; confirm `Verify2FALogin` fails with a decryption error.

### Validation
- `go test ./internal/tests/...`

### Dependencies
- Blocked by: Phase 1
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/service/auth_service.go` | 1 | Core logic for token/decryption. |
| 2 | `internal/handler/auth_handler.go` | 1 | API endpoint updates. |
| 3 | `cmd/server/main.go` | 1 | Route configuration. |
| 4 | `internal/tests/security_2fa_test.go` | 2 | Security verification. |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | MEDIUM | Changes the handshake between Login and Verify. Requires frontend alignment (though we are focusing on backend). |
| 2     | LOW | Purely verification. |

## Execution Profile

```
Execution Profile:
- Total phases: 2
- Parallelizable phases: 0
- Sequential-only phases: 2
- Estimated parallel wall time: N/A
- Estimated sequential wall time: ~30 minutes

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
