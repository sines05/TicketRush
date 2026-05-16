---
title: "fix-auth-redirect-loop-impl-plan"
design_ref: "docs/maestro/plans/2026-05-16-fix-auth-redirect-loop-design.md"
created: "2026-05-16T21:28:00Z"
status: "approved"
total_phases: 1
estimated_files: 3
task_complexity: "medium"
---

# Fix Auth Redirect Loop Implementation Plan

## Plan Overview

- **Total phases**: 1
- **Agents involved**: `coder`
- **Estimated effort**: Moderate architectural alignment.

## Dependency Graph

```
Phase 1: Fix Redirect Loop and Logic Alignment (Coder)
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Coordinated Frontend Fix |

## Phase 1: Fix Redirect Loop and Logic Alignment

### Objective
Implement the event-driven decoupling and conditional hydration logic.

### Agent: `coder`
### Parallel: No

### Files to Modify

- `frontend/src/services/api.js` — Remove window side-effects, dispatch event.
- `frontend/src/context/AuthContext.jsx` — Implement listener and conditional hydration.
- `frontend/src/routes/AppRoutes.jsx` — Align legacy paths.

### Implementation Details

1. **`api.js`**:
    - Update `baseURL` to strictly use `import.meta.env.VITE_API_BASE_URL`.
    - In the 401 error handler, replace `window.location.href = '/login'` with `window.dispatchEvent(new CustomEvent('auth:unauthorized'))`.
2. **`AuthContext.jsx`**:
    - Inside `AuthProvider`, add a `useEffect` that listens for `auth:unauthorized`.
    - On event: `setUser(null)`, `localStorage.removeItem('tr_user')`, and `window.location.href = '/auth/login'` (since `useNavigate` is likely not available here). *Note*: Even using `window.location` here is safer because it's at the UI root and the path is correct.
    - Update `hydrate`: Add `if (!localStorage.getItem('tr_user')) return setLoading(false);` at the start.
3. **`AppRoutes.jsx`**:
    - Add `<Route path="/login" element={<Navigate to="/auth/login" replace />} />`.

### Validation

- Clean session test: Navigate to `/`, confirm no 401 in console.
- Expired session test: Trigger a 401, confirm redirect to `/auth/login`.

### Dependencies

- Blocked by: None
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `frontend/src/services/api.js` | 1 | Event dispatching. |
| 2 | `frontend/src/context/AuthContext.jsx` | 1 | State management and listener. |
| 3 | `frontend/src/routes/AppRoutes.jsx` | 1 | Path alignment. |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Targeted changes, easily reversible. |

## Execution Profile

```
Execution Profile:
- Total phases: 1
- Parallelizable phases: 0
- Sequential-only phases: 1
- Estimated parallel wall time: N/A
- Estimated sequential wall time: ~15 minutes

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
