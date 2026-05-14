---
title: "Fix State Leakage on Logout Implementation Plan"
design_ref: "docs/maestro/plans/2026-05-11-thuc-hien-sua-loi-design.md"
created: "2026-05-11T00:00:00Z"
status: "approved"
total_phases: 1
estimated_files: 1
task_complexity: "medium"
---

# Fix State Leakage on Logout Implementation Plan

## Plan Overview
- **Total phases**: 1
- **Agents involved**: coder
- **Estimated effort**: Simple fix to `logout` function in `AuthContext.jsx`.

## Execution Strategy
| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Fix Logout |

## Phase 1: Fix State Leakage on Logout
### Objective
Ensure all session and module-level states are completely cleared upon logout to prevent data leakage between sessions on the same browser tab.
### Agent: coder
### Parallel: No

### Files to Modify
- `frontend/src/context/AuthContext.jsx` — Update the `logout` function to clear all local storage and force a page reload (`window.location.href = '/'`) to clear `sessionStorage` and SPA memory states.

### Implementation Details
- Update `logout` to retain the existing `localStorage.removeItem(STORAGE_TOKEN)` and `localStorage.removeItem(STORAGE_USER)` or use `localStorage.clear()` if preferred, then add `window.location.href = '/';`.
- This ensures any subsequent code execution is halted and the entire app re-initializes cleanly.

### Validation
- `npm run lint`
- Manual verification: Login user 1, buy ticket, logout, login user 2, verify queue session and seats are reset.

### Dependencies
- Blocked by: None
- Blocks: None

---

## File Inventory
| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `frontend/src/context/AuthContext.jsx` | 1 | Clear state and trigger reload on logout |

## Risk Classification
| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Fix is isolated to the logout action and explicitly clears transient state. |

## Execution Profile
```
Execution Profile:
- Total phases: 1
- Parallelizable phases: 0 (in 0 batches)
- Sequential-only phases: 1
- Estimated parallel wall time: N/A
- Estimated sequential wall time: 2 mins

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```