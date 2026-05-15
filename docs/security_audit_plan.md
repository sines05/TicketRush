# Implementation Plan: TicketRush Security Remediation (Revised)

## Phase 1: Authentication & Secret Security
- **Task 1.1: Fix Credential Leakage**
  - **Agent:** `coder`
  - **Files:** `internal/handler/auth_handler.go`
  - **Action:** Remove `fmt.Println` or logging of password reset tokens.
- **Task 1.2: Implement 2FA Rate Limiting**
  - **Agent:** `coder`
  - **Files:** `internal/handler/auth_handler.go`, `internal/middleware/rate_limit.go` (to be created)
  - **Action:** Add rate limiting to `Verify2FALogin`.
- **Task 1.3: Harden Secret Loading**
  - **Agent:** `coder`
  - **Files:** `internal/config/config.go`
  - **Action:** Remove weak default fallbacks for `JWT_SECRET` and `X_INTERNAL_SECRET`. Raise error if missing in production.

## Phase 2: Access Control Hardening
- **Task 2.1: Secure Internal API Endpoints**
  - **Agent:** `coder`
  - **Files:** `internal/handler/ai_internal_handler.go`
  - **Action:** Add checks to ensure the `user_id` in the request matches the intended scope of the AI agent's request.

## Phase 3: Business Logic Validation
- **Task 3.1: Implement Payment Validation Stub**
  - **Agent:** `coder`
  - **Files:** `internal/service/order_service.go`, `internal/service/membership_service.go`
  - **Action:** Require a `payment_id` and "verify" it before completing orders or upgrades.

## Phase 4: Final Validation
- **Task 4.1: Security Regression Testing**
  - **Agent:** `tester`
  - **Files:** `internal/tests/security_audit_test.go` (to be created)
  - **Action:** Write tests for rate limiting, secret missing errors, and unauthorized access to internal APIs.
