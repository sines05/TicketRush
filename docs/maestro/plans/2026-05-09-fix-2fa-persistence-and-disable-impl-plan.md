---
title: "2FA Persistence and Disable Mechanism Implementation Plan"
created: "2026-05-09T00:00:00Z"
status: "approved"
total_phases: 3
estimated_files: 5
task_complexity: "medium"
---

# 2FA Persistence and Disable Mechanism Implementation Plan

## Plan Overview
- **Total phases**: 3
- **Agents involved**: coder, tester
- **Estimated effort**: Fix 2FA state persistence and implement a secure "Disable 2FA" flow.

## Phase 1: Backend Fixes and Disable Logic
### Objective
Include 2FA status in API responses and implement the disable mechanism.
### Agent: coder
### Parallel: No
### Files to Modify
- `internal/handler/auth_handler.go`: 
    - Add `"is_2fa_enabled": u.TwoFactorEnabled` to `GetMe` and `UpdateMe` responses.
    - Implement `Disable2FA` handler: requires valid user context and potentially a confirmation code (optional, but let's keep it simple for now as per user request).
- `internal/service/auth_service.go`:
    - Add `Disable2FA(userID uuid.UUID) error` to `AuthService`.
    - Implement it by calling `userRepo.Update2FA(userID, false, "")`.
- `cmd/server/main.go`: Register `POST /auth/disable-2fa` under protected routes.
### Validation
- `go build ./...`
### Dependencies
- Blocks: Phase 2

## Phase 2: Frontend Persistence and UI Updates
### Objective
Sync 2FA state with local storage and add the "Disable" button.
### Agent: coder
### Parallel: No
### Files to Modify
- `frontend/src/services/authService.js`: Add `disable2FA()` method calling `POST /auth/disable-2fa`.
- `frontend/src/pages/Profile/Profile.jsx`: 
    - Update `handleEnable2FA` to ensure it updates both local state and `AuthContext`.
    - Add `handleDisable2FA` function.
    - Update the UI to show a "Tắt 2FA" button when `is2FAEnabled` is true.
- `frontend/src/context/AuthContext.jsx`: Ensure `updateUser` correctly handles `is_2fa_enabled` and persists to `localStorage`.
### Validation
- `npm run build`
### Dependencies
- Blocked by: Phase 1
- Blocks: Phase 3

## Phase 3: Final Verification
### Objective
Verify state persistence across reloads and the disabling flow.
### Agent: tester
### Parallel: No
### Files to Modify: None
### Validation
- Run backend tests for `Setup2FA` and `Disable2FA`.
- Verify frontend build success.
### Dependencies
- Blocked by: Phase 2
