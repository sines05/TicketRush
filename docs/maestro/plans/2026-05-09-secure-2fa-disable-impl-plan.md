---
title: "Secure 2FA Disable Mechanism Implementation Plan"
created: "2026-05-09T00:00:00Z"
status: "approved"
total_phases: 3
estimated_files: 5
task_complexity: "medium"
---

# Secure 2FA Disable Mechanism Implementation Plan

## Plan Overview
- **Total phases**: 3
- **Agents involved**: coder, tester
- **Estimated effort**: Implement secure 2FA disabling requiring code verification across all layers.

## Phase 1: Backend Secure Disable Logic
### Objective
Enforce TOTP verification for disabling 2FA and add notification.
### Agent: coder
### Parallel: No
### Files to Modify
- `internal/service/auth_service.go`: Update `Disable2FA(userID uuid.UUID, code string)` to validate the code before disabling.
- `internal/handler/auth_handler.go`: Update `Disable2FA` to bind code from JSON request.
- `internal/service/notification_service.go`: Add `Notify2FADisabled(user *models.User)` and call it in `authService.Disable2FA`. (Verify existence of notification service first).
### Validation
- `go build ./...`
### Dependencies
- Blocks: Phase 2

## Phase 2: Frontend Secure Disable UI
### Objective
Implement code collection UI for disabling 2FA.
### Agent: coder
### Parallel: No
### Files to Modify
- `frontend/src/services/authService.js`: Update `disable2FA(code)` to pass the verification code.
- `frontend/src/pages/Profile/Profile.jsx`: 
    - Implement a new UI state/dialog for "Confirm Disable" that includes a "Mã xác thực" input field.
    - Update `handleDisable2FA` to use this code.
### Validation
- `npm run build`
### Dependencies
- Blocked by: Phase 1
- Blocks: Phase 3

## Phase 3: Final Verification
### Objective
Verify the secure disabling flow with tests.
### Agent: tester
### Parallel: No
### Files to Modify
- `internal/tests/user_security_test.go`: Update `TestDisable2FA` to cover valid/invalid code scenarios.
### Validation
- `go test ./internal/tests/user_security_test.go`
### Dependencies
- Blocked by: Phase 2
