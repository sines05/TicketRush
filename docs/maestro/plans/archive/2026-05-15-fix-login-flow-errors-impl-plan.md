---
title: "Fix Login Flow Integration Errors Implementation Plan"
design_ref: "docs/maestro/plans/2026-05-15-fix-login-flow-errors-design.md"
created: "2026-05-15T16:46:00Z"
status: "draft"
total_phases: 2
estimated_files: 7
task_complexity: "complex"
---

# Fix Login Flow Integration Errors Implementation Plan

## Plan Overview

- **Total phases**: 2
- **Agents involved**: coder
- **Estimated effort**: Medium. Requires updating backend error serialization, handling domain errors cleanly, fixing frontend context hydration for registration/2FA, and verifying OAuth.

## Dependency Graph

```
Phase 1 (Backend Validation & Error Translation)
   |
Phase 2 (Frontend Client-Side Validation & Fixes)
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Backend API contract update |
| 2     | Phase 2 | Sequential | 1 | Frontend consumes updated API |

## Phase 1: Backend Validation & Data Completeness

### Objective
Update backend response structures to include field-level validation errors, implement an error translation utility, and ensure registration/2FA login return complete user DTOs. Ensure password complexity errors map to 400 Bad Request.

### Agent: coder
### Parallel: No

### Files to Create

- `internal/utils/validator.go` — Contains `TranslateValidatorError(err error) map[string]string` to convert Go struct validator errors into user-friendly field-error maps.

### Files to Modify

- `internal/utils/response.go` — Add `Details map[string]string \`json:"details,omitempty"\`` to the `Response` struct. Add a helper function `ValidationErrorResponse` or similar.
- `internal/handler/auth_handler.go` —
  - Update all 10 `c.ShouldBindJSON` error blocks to use the new translation utility.
  - In `Register` and `Verify2FALogin`, ensure `dto.ToUserResponse` is called on the resulting `models.User` and returned in the `Data` field, not `nil`.
  - Ensure domain errors (like weak passwords) are intercepted and returned as 400 with a descriptive message.
- `internal/service/auth_service.go` — Ensure password complexity checks return typed/wrapped errors that can be identified by the handler to return HTTP 400 instead of 500.

### Implementation Details

- `TranslateValidatorError` should check if the error is of type `validator.ValidationErrors`. If so, iterate and map tags (e.g., "required" -> "This field is required", "min" -> "Must be at least X characters").
- Ensure `Verify2FALogin` extracts the email and roles properly for the response.

### Validation

- Run unit tests: `go test ./internal/handler -v`
- Verify with curl that validation fails with HTTP 400 and `details` map.

### Dependencies

- Blocked by: None
- Blocks: 2

---

## Phase 2: Frontend Validation & OAuth Verification

### Objective
Implement client-side validation for Auth forms, gracefully handle backend validation payloads, fix `AuthContext.jsx` crashes, and verify OAuth flows still function correctly.

### Agent: coder
### Parallel: No

### Files to Modify

- `frontend/src/context/AuthContext.jsx` —
  - Fix `register` method to handle the (now populated) user data from the backend instead of throwing a null pointer on `user_id`.
  - Fix `login` method's 2FA success path to properly update the user state with email and role.
- `frontend/src/pages/Auth/Register.jsx` —
  - Implement custom state for validation errors (e.g., `const [errors, setErrors] = useState({})`).
  - Add client-side password length and complexity checks before calling `register()`.
  - Map backend 400 errors (`details` map) to the UI `AuthField` components.
- `frontend/src/pages/Auth/Login.jsx` —
  - Similar UI and state-based validation updates as `Register.jsx`.
- `frontend/src/services/authService.js` (or `api.js` if mock) —
  - Ensure password length constraints align with backend (8 chars).

### Implementation Details

- Add an `error` prop to `AuthField` to display inline text below the input.
- Verify OAuth login flow (Google/Facebook) works seamlessly with the updated `AuthContext`.

### Validation

- Run `npm run lint` in `frontend/`.
- Manually review the source files for obvious syntax/logic errors.

### Dependencies

- Blocked by: 1
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/utils/validator.go` | 1 | Error translation utility |
| 2 | `internal/utils/response.go` | 1 | Add Details field to API Response |
| 3 | `internal/handler/auth_handler.go` | 1 | Integrate translation, fix data responses |
| 4 | `internal/service/auth_service.go` | 1 | Proper domain error bubbling |
| 5 | `frontend/src/context/AuthContext.jsx` | 2 | Fix context crash and state hydration |
| 6 | `frontend/src/pages/Auth/Register.jsx` | 2 | Client-side validation & error mapping |
| 7 | `frontend/src/pages/Auth/Login.jsx` | 2 | Client-side validation & error mapping |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | MEDIUM | Modifying core API response shape could affect other consumers, but `omitempty` mitigates this. |
| 2     | MEDIUM | React context state updates require careful handling to prevent infinite loops or stale closures. |

## Execution Profile

```
Execution Profile:
- Total phases: 2
- Parallelizable phases: 0 (in 0 batches)
- Sequential-only phases: 2
- Estimated parallel wall time: N/A
- Estimated sequential wall time: 5-8 minutes

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```