---
title: "Fix Local Authentication Issues Implementation Plan"
design_ref: "/home/son/TicketRush/docs/maestro/plans/2026-05-14-fix-local-auth-issues-design.md"
created: "2026-05-14T07:05:00.000Z"
status: "draft"
total_phases: 1
estimated_files: 3
task_complexity: "medium"
---

# Fix Local Authentication Issues Implementation Plan

## Plan Overview

- **Total phases**: 1
- **Agents involved**: `coder`
- **Estimated effort**: Small-to-medium. Straightforward refactoring of conditional logic and adding guards to handlers.

## Dependency Graph

```
Phase 1: Implement Auth Logic Fixes & Guards
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Combined FE/BE fixes |

## Phase 1: Implement Auth Logic Fixes & Guards

### Objective
Ensure Login/Registration defaults to the API in local development and add backend guards for missing OAuth credentials.

### Agent: `coder`
### Parallel: No

### Files to Modify

- `frontend/src/services/authService.js`
  - Modify `USE_MOCK` logic (L10) to use `=== 'true'` instead of `!== 'false'`.
- `internal/handler/auth_handler.go`
  - Add guards in `GoogleLogin` (L91) and `FacebookLogin` (L158) to check if the corresponding ClientID is empty. If empty, return a 500 error using `utils.SendError` with a descriptive message.
- `internal/config/config.go`
  - Add a log warning in `LoadConfig` (around L79) if `cfg.GoogleClientID` is empty, similar to the existing Facebook warning.

### Implementation Details
- **Frontend**: By changing `!== 'false'` to `=== 'true'`, the application will only use mock logic if the environment variable is explicitly set to `true`. This aligns with the "Safe Default" principle.
- **Backend**: Adding guards prevents the application from redirecting to Google/Facebook with an empty `client_id`, which results in a confusing provider-side error. A local error provides immediate feedback to the developer.

### Validation
- **Frontend**: Run `npm run lint` in `frontend/`. (Though there are no frontend tests currently identified by `assess_task_complexity`, linting ensures no syntax errors).
- **Backend**: Run `go vet ./...` and `go test ./...` in the root directory.

### Dependencies
- Blocked by: None
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `frontend/src/services/authService.js` | 1 | Fix mock logic default |
| 2 | `internal/handler/auth_handler.go` | 1 | Add OAuth credential guards |
| 3 | `internal/config/config.go` | 1 | Add startup warnings for missing Google credentials |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Simple logic changes; guards are non-invasive and only trigger if configuration is missing. |

## Execution Profile

```
Execution Profile:
- Total phases: 1
- Parallelizable phases: 0
- Sequential-only phases: 1
- Estimated parallel wall time: N/A
- Estimated sequential wall time: 10 minutes

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
