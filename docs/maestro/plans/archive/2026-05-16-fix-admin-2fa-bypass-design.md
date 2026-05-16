---
title: "fix-admin-2fa-bypass"
created: "2026-05-16T19:45:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Fix Admin 2FA Bypass Design Document

## Problem Statement

The TicketRush platform suffers from a Critical security vulnerability: an authorization bypass on the Admin routes. While the `admin` route group in `cmd/server/main.go` correctly enforces authentication (`AuthMiddleware`) and role-based access (`RoleMiddleware(models.RoleAdmin)`), it completely omits the `TwoFactorMiddleware`.

This means that even if an administrator has Two-Factor Authentication (2FA) enabled, an attacker who compromises their password can access all sensitive administrative endpoints without providing the required 6-digit TOTP code. The `TwoFactorMiddleware` is correctly implemented and used elsewhere in the application but was forgotten on this critical subsystem.

## Requirements

### Functional Requirements

1. **REQ-1**: All endpoints under the `/admin` route group must enforce the `TwoFactorMiddleware`.
2. **REQ-2**: Administrators with 2FA enabled must be denied access to `/admin` endpoints (HTTP 403 Forbidden) if their session does not contain the `2fa_verified` claim.

### Non-Functional Requirements

1. **REQ-N1**: The fix must be "fail-closed," ensuring that any future routes added to the `/admin` group automatically inherit the 2FA protection without explicit developer action.

## Approach

### Selected Approach

**Global Middleware Application for Admin Routes**

We will update `cmd/server/main.go` to explicitly include `middleware.TwoFactorMiddleware()` in the middleware chain for the entire `/admin` route group.

Currently, the admin routes are defined as:
```go
admin := protected.Group("/admin", middleware.RoleMiddleware(models.RoleAdmin))
```
We will change this to:
```go
admin := protected.Group("/admin", middleware.RoleMiddleware(models.RoleAdmin), middleware.TwoFactorMiddleware())
```
This ensures that any user hitting an admin endpoint must have passed the 2FA challenge if 2FA is enabled on their account.

### Alternatives Considered

#### Endpoint-Specific 2FA Enforcement
- **Description**: Add `middleware.TwoFactorMiddleware()` individually to specific handlers.
- **Pros**: Allows granular control.
- **Cons**: High risk of future regressions.
- **Rejected Because**: Admin routes represent the highest privilege tier. "Fail-closed" design dictates that all access should require maximum authentication.

#### Role-Based 2FA Check inside RoleMiddleware
- **Description**: Modify `RoleMiddleware` to automatically check for 2FA completion if the role is `RoleAdmin`.
- **Pros**: Centralizes the logic.
- **Cons**: Violates the Single Responsibility Principle.
- **Rejected Because**: Unnecessary mixing of concerns between authorization and authentication.

### Decision Matrix

| Criterion | Weight | Global Middleware | Endpoint-Specific | Role-Based 2FA |
| :--- | :--- | :--- | :--- | :--- |
| **Security (Fail-Closed)** | 50% | 5: Protects all routes | 2: Prone to dev error | 4: Secure but hidden |
| **Maintainability (SRP)** | 30% | 5: Clear separation | 3: Messy routes | 1: Violates SRP |
| **Simplicity** | 20% | 5: One-line change | 3: Many small changes | 2: Complex refactoring |
| **Weighted Total** | | **5.0** | 2.5 | 3.3 |

## Architecture

### Component Diagram

```
[Incoming Request to /admin/*]
      |
      v
[AuthMiddleware] -> Checks JWT, sets user context
      |
      v
[RoleMiddleware(Admin)] -> Verifies user.Role == RoleAdmin
      |
      v
[TwoFactorMiddleware] -> (NEW) Verifies user has passed 2FA challenge if enabled
      |
      v
[Admin Handlers]
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Implement fix in `cmd/server/main.go` |
| 2     | `tester` | No       | Verify 2FA enforcement on Admin routes |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Admin Lockout** | HIGH | LOW | If an admin enabled 2FA but lost their authenticator app *and* recovery codes, they will be locked out. This is the intended behavior. |
| **Integration Test Failures** | LOW | HIGH | Existing E2E/integration tests calling `/admin` might fail if they don't mock the `2fa_verified` claim. The `tester` agent will update relevant tests. |

## Success Criteria

1. Making a request to an `/admin` route with an Admin account that has 2FA enabled, but using a JWT without the `2fa_verified` claim, results in an HTTP 403 Forbidden error.
2. The same request with the `2fa_verified` claim succeeds.
