---
title: "Fix 2FA Generation and Security Logic Implementation Plan"
design_ref: "/home/son/TicketRush/docs/maestro/plans/2026-05-16-fix-2fa-and-security-logic-design.md"
created: "2026-05-16T15:25:00Z"
status: "approved"
total_phases: 3
estimated_files: 9
task_complexity: "complex"
---

# Fix 2FA Generation and Security Logic Implementation Plan

## Plan Overview

- **Total phases**: 3
- **Agents involved**: `data_engineer`, `coder`, `tester`
- **Estimated effort**: Medium. Focuses on schema extension, precise security middleware logic, and comprehensive testing of the new 2FA lifecycle.

## Dependency Graph

```
Phase 1 (Data Engineer: Schema & Models)
        |
        v
Phase 2 (Coder: Logic & Middleware)
        |
        v
Phase 3 (Tester: Security Validation)
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Foundation (DB updates) |
| 2     | Phase 2 | Sequential | 1 | Core Implementation |
| 3     | Phase 3 | Sequential | 1 | Validation |

## Phase 1: Database Migration & Models

### Objective
Extend the database schema and GORM models to support `recovery_codes` and `pending_two_factor_secret`.

### Agent: `data_engineer`
### Parallel: No

### Files to Create

- `migrations/000019_add_2fa_recovery_and_pending.up.sql` — Add `recovery_codes` (varchar or jsonb) and `pending_two_factor_secret` (varchar) columns to `users` table.
- `migrations/000019_add_2fa_recovery_and_pending.down.sql` — Drop columns from `users` table.

### Files to Modify

- `internal/models/user.go` — Add `RecoveryCodes` and `PendingTwoFactorSecret` fields to the `User` struct. Update json tags.

### Implementation Details
- Ensure migrations are idempotent and reversible.
- The `pending_two_factor_secret` is necessary so that calling `/setup-2fa` does not overwrite the active secret if a user abandons setup.

### Validation
- `go run cmd/server/main.go` (to trigger auto-migration execution and verify no SQL errors)

### Dependencies
- Blocked by: None
- Blocks: [2]

---

## Phase 2: Configuration, Application Logic & Middleware

### Objective
Implement the 2FA business logic, configure the master key, and actively enforce 2FA verification on sensitive routes.

### Agent: `coder`
### Parallel: No

### Files to Modify

- `.env.example` — Add a default 32-character string for `ENCRYPTION_MASTER_KEY`.
- `internal/config/config.go` — Update `LoadConfig` to panic or clearly log/fallback if `ENCRYPTION_MASTER_KEY` is not 32 bytes (crucial for AES-256).
- `internal/repository/user_repository.go` — Add methods/logic to update the `PendingTwoFactorSecret` and `RecoveryCodes`.
- `internal/service/auth_service.go` — 
  - `Generate2FA`: Store secret as `pending_two_factor_secret`, do NOT enable. Generate and hash/store recovery codes.
  - `Enable2FA`: Validate code against `pending_two_factor_secret`. On success, move pending to active `two_factor_secret`, clear pending, set `two_factor_enabled=true`.
  - `Verify2FA`: Validate code against active secret OR validate against recovery codes. If successful, add `2fa_verified: true` to the returned JWT claims.
- `internal/handler/auth_handler.go` — Update `Setup2FA` response to return the generated recovery codes so the user can save them.
- `internal/middleware/2fa_middleware.go` — Implement `TwoFactorMiddleware` to parse the JWT and reject requests if `u.TwoFactorEnabled` is true but the `2fa_verified` claim is missing or false.
- `cmd/server/main.go` — Apply `middleware.TwoFactorMiddleware()` to the `protected` and `admin` routing groups (or specific sensitive routes) to enforce the check.

### Implementation Details
- JWT claims must be updated to include the `2fa_verified` boolean.
- Recovery codes should be hashed before storage (e.g., using bcrypt) similar to passwords, for maximum security.
- `TwoFactorMiddleware` needs access to the JWT claims. It might need to read the token again or rely on `AuthMiddleware` to pass the claims in the Gin context. Ensure the JWT parsing logic is accessible or shared.

### Validation
- `go build ./...`
- `go vet ./...`

### Dependencies
- Blocked by: [1]
- Blocks: [3]

---

## Phase 3: Security Validation

### Objective
Write and execute comprehensive tests to prove the 2FA generation, verification, recovery, and middleware enforcement work as designed.

### Agent: `tester`
### Parallel: No

### Files to Modify

- `internal/tests/user_security_test.go` — Add tests for:
  - `Generate2FA` sets pending secret.
  - `Enable2FA` requires correct code against pending secret.
  - `Verify2FA` works with TOTP.
  - `Verify2FA` works with recovery code (and consumes/invalidates it if implemented that way).
  - JWT contains `2fa_verified` claim after `Verify2FA`.
  - `TwoFactorMiddleware` correctly blocks unverified requests and allows verified ones.

### Implementation Details
- Mock the notification service and repository as needed.
- Use the `httptest` package to simulate requests going through the Gin router with both `AuthMiddleware` and `TwoFactorMiddleware` applied.

### Validation
- `go test ./internal/tests -run TestTwoFactor -v`
- `go test ./...`

### Dependencies
- Blocked by: [2]
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `migrations/000019_add_2fa_recovery_and_pending.up.sql` | 1 | DB Schema update |
| 2 | `migrations/000019_add_2fa_recovery_and_pending.down.sql` | 1 | DB Schema rollback |
| 3 | `internal/models/user.go` | 1 | Add fields to GORM model |
| 4 | `.env.example` | 2 | Add default encryption key |
| 5 | `internal/config/config.go` | 2 | Validate encryption key length |
| 6 | `internal/repository/user_repository.go` | 2 | Add DB methods for new fields |
| 7 | `internal/service/auth_service.go" | 2 | Core 2FA business logic updates |
| 8 | `internal/handler/auth_handler.go` | 2 | Return recovery codes on setup |
| 9 | `internal/middleware/2fa_middleware.go` | 2 | Implement JWT claim verification |
| 10| `cmd/server/main.go` | 2 | Apply middleware to routes |
| 11| `internal/tests/user_security_test.go` | 3 | Verify security requirements |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Standard non-destructive DB schema additions. |
| 2     | HIGH | Modifying core authentication logic and JWT structure. Errors here could lock users out or bypass security. |
| 3     | LOW | Writing tests does not impact runtime behavior. |

## Execution Profile

```
Execution Profile:
- Total phases: 3
- Parallelizable phases: 0
- Sequential-only phases: 3
- Estimated parallel wall time: N/A
- Estimated sequential wall time: 5-8 minutes

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```