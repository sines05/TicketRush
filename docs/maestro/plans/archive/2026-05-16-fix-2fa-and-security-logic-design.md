---
title: "Fix 2FA Generation and Security Logic"
created: "2026-05-16T15:20:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "complex"
---

# Fix 2FA Generation and Security Logic Design Document

## Problem Statement

The 2FA implementation in TicketRush is currently failing due to a missing encryption key configuration, resulting in a 'Could not generate 2FA' error. Furthermore, while the setup flow exists, the system lacks comprehensive enforcement (middleware is defined but unused), and critical fallback mechanisms like recovery codes are absent from the User model. This leaves the system vulnerable and provides a poor user experience.

## Requirements

### Functional Requirements

1. **REQ-1**: 2FA generation must succeed by correctly loading and validating a 32-byte `ENCRYPTION_MASTER_KEY`.
2. **REQ-2**: Sensitive routes (e.g., `/orders/checkout`, `/users/change-password`) must actively enforce 2FA verification using `TwoFactorMiddleware`.
3. **REQ-3**: The `User` model must support storing and validating `RecoveryCodes` (e.g., a comma-separated string or array) to allow account recovery if the authenticator app is lost.
4. **REQ-4**: `Generate2FA` must store the secret in a temporary state (e.g., Redis or a dedicated "pending" field) until `Enable2FA` is successfully called, rather than immediately overwriting the active secret.

### Non-Functional Requirements

1. **REQ-5**: Changes must not break existing authenticated sessions for users without 2FA.

### Constraints

- Must maintain compatibility with the existing AES-256-GCM encryption utility.

## Approach

### Selected Approach

**Holistic 2FA Hardening**

We will address the configuration gap directly, implement the missing middleware logic, and update the schema to support recovery codes.

### Alternatives Considered

#### Quick Fix (Config Only)
- **Description**: Only add the missing `.env` variable.
- **Pros**: Fast to implement.
- **Cons**: Leaves the system vulnerable due to missing middleware and lacks account recovery mechanisms.
- **Rejected Because**: Does not satisfy the user's request for a "comprehensive check" and "ready" state.

### Decision Matrix

| Criterion | Weight | Holistic Hardening | Quick Fix (Config Only) |
|-----------|--------|--------------------|-------------------------|
| Security (Middleware) | 40% | 5: Enforces 2FA across sensitive routes. | 1: Leaves routes vulnerable. |
| User Experience (Recovery) | 30% | 5: Provides recovery codes. | 1: Users can be permanently locked out. |
| Speed of Delivery | 30% | 3: Requires schema and logic changes. | 5: Just adding a .env variable. |
| **Weighted Total** | | **4.4** | **2.2** |

## Architecture

- **AuthService** — *[Modified to generate/verify recovery codes and handle temporary TOTP secrets via Redis]*
- **TwoFactorMiddleware** — *[Implemented to parse JWT for `2fa_verified: true` claim]*
- **Database Schema** — *[users table gains `recovery_codes` (varchar or jsonb) via migration]*

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `data_engineer` | No | Database migration for `recovery_codes`. |
| 2     | `coder` | No | Update config, AuthService, TwoFactorMiddleware, and apply to routes. |
| 3     | `tester` | No | Comprehensive simulated testing of the 2FA lifecycle. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| JWT structure changes break existing clients | MEDIUM | LOW | Ensure `2fa_verified` claim is optional for non-2FA users and handled gracefully. |
| Schema migration conflicts | HIGH | LOW | Use standard GORM migration patterns and test rollback procedures. |
| Temporary secret storage complexity | MEDIUM | MEDIUM | Use Redis (already available) for temporary secret storage with a 15-minute TTL to ensure simplicity and automatic cleanup. |

## Success Criteria

1. A user can successfully complete the 2FA setup process without receiving the "Could not generate 2FA" error.
2. Protected routes correctly reject requests from 2FA-enabled users who have not verified their 2FA code in the current session.
3. Users receive and can use recovery codes to bypass standard TOTP verification if needed.
4. All new and existing security tests pass.