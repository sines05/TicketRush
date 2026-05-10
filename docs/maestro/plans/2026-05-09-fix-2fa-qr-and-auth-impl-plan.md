---
title: "Fix 2FA QR and Auth Issues Implementation Plan"
created: "2026-05-09T00:00:00Z"
status: "approved"
total_phases: 3
estimated_files: 5
task_complexity: "medium"
---

# Fix 2FA QR and Auth Issues Implementation Plan

## Plan Overview
- **Total phases**: 3
- **Agents involved**: coder, tester
- **Estimated effort**: Resolve 4 issues identified in the code review (2FA QR, Hardcoded URL, 2FA Protection, Date Parsing).

## Phase 1: Backend Configuration and Security Logic
### Objective
Externalize frontend URL, protect 2FA setup state, and improve date parsing robustness.
### Agent: coder
### Parallel: No
### Files to Modify
- `internal/config/config.go`: Add `FrontendURL` field and initialize it from `FRONTEND_URL` env var (default `http://localhost:5173`).
- `internal/handler/auth_handler.go`: 
    - Use `cfg.FrontendURL` for OAuth redirects.
    - In `Setup2FA`, check if `TwoFactorEnabled` is true; if so, return error.
- `internal/service/auth_service.go`: Use a more robust date parsing in `UpdateProfile` (e.g., support RFC3339 if possible, but at least ensure format is consistent).
### Validation
- `go build ./...`
### Dependencies
- Blocks: Phase 2

## Phase 2: Frontend 2FA QR Display Fix
### Objective
Fix the broken 2FA QR code display by using `QRCodeCanvas`.
### Agent: coder
### Parallel: No
### Files to Modify
- `frontend/src/pages/Profile/Profile.jsx`: 
    - Import `QRCodeCanvas` from `qrcode.react`.
    - Replace `<img>` tag with `<QRCodeCanvas value={twoFAData.qr_url} ... />`.
    - Ensure it maps `qr_url` from backend instead of `qr_code`.
### Validation
- `npm run build`
### Dependencies
- Blocked by: Phase 1
- Blocks: Phase 3

## Phase 3: Final Verification
### Objective
Verify all fixes.
### Agent: tester
### Parallel: No
### Files to Modify: None
### Validation
- Run unit tests for `UpdateProfile` and `Setup2FA`.
- Verify frontend build success.
### Dependencies
- Blocked by: Phase 2
