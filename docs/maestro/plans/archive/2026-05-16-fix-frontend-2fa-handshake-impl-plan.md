---
title: "fix-frontend-2fa-handshake-impl-plan"
design_ref: "docs/maestro/plans/2026-05-16-fix-frontend-2fa-handshake-design.md"
created: "2026-05-16T22:06:00Z"
status: "approved"
total_phases: 1
estimated_files: 3
task_complexity: "simple"
---

# Fix Frontend 2FA Handshake Implementation Plan

## Plan Overview

- **Total phases**: 1
- **Agents involved**: `coder`
- **Estimated effort**: Quick frontend alignment.

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Frontend fix |

## Phase 1: Frontend Alignment

### Objective
Update frontend components and services to handle the `pending_token` during 2FA verification.

### Agent: `coder`
### Parallel: No

### Files to Modify

- `frontend/src/services/authService.js`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/pages/Auth/Login.jsx`

### Implementation Details

1. **`authService.js`**:
    - Change `verify2FALogin(user_id, code)` to `verify2FALogin(pending_token, code)`.
    - Payload: `{ pending_token, code }`.
2. **`AuthContext.jsx`**:
    - Change `verify2FA = useCallback(async (userId, code) => { ... })` to `verify2FA = useCallback(async (pendingToken, code) => { ... })`.
    - Call `authService.verify2FALogin(pendingToken, code)`.
3. **`Login.jsx`**:
    - Find/Replace `2fa_user_id` with `2fa_pending_token`.
    - Change `userId` state to `pendingToken`.
    - In `useEffect`, check `searchParams.get('pending_token')` instead of `user_id`.
    - In `handleSubmit` catch block, extract `uid` from `err.data?.pending_token` or `err?.pending_token` (since the backend now returns `pending_token` instead of `user_id`).
    - In `handle2FASubmit`, call `verify2FA(pendingToken, twoFACode)`.

### Validation
- Ensure no lingering references to `userId` exist in the 2FA flow of `Login.jsx`.
- Run frontend linter if available.

### Dependencies
- Blocked by: None
- Blocks: None
