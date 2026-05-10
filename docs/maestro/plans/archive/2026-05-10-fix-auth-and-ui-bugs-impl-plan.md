---
title: \"Fix Authentication Redirects and UI Contrast Implementation Plan\"
design_ref: \"/home/son/TicketRush/docs/maestro/plans/2026-05-10-fix-auth-and-ui-bugs-design.md\"
created: \"2026-05-10T02:55:00Z\"
status: \"approved\"
total_phases: 3
estimated_files: 4
task_complexity: \"complex\"
---

# Fix Authentication Redirects and UI Contrast Implementation Plan

## Plan Overview

- **Total phases**: 3
- **Agents involved**: coder, tester
- **Estimated effort**: Moderate. Targeted fixes in routing, CSS, and service logic.

## Dependency Graph

```
Phase 1: Foundation (CSS & Routing)
    |
    v
Phase 2: Logic Optimization
    |
    v
Phase 3: Verification
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Setup CSS and Routes |
| 2     | Phase 2 | Sequential | 1 | Fix Mock Deadlock |
| 3     | Phase 3 | Sequential | 1 | Verification |

## Phase 1: Foundation & Visual Fixes

### Objective
Restore text visibility and map missing authentication routes.

### Agent: coder
### Parallel: No

### Files to Modify

- `frontend/src/index.css` — Introduce `--tr-muted-foreground` and adjust light-mode contrast.
- `frontend/tailwind.config.js` — Map `muted-foreground` color class.
- `frontend/src/routes/AppRoutes.jsx` — Add `/auth/2fa` route mapped to `Login.jsx`.

### Implementation Details
- In `index.css`, set `--tr-muted-foreground` to a darker HSL value (e.g., `215.4 16.3% 46.9%`).
- Update `tailwind.config.js` colors extend block to include `\"muted-foreground\": \"hsl(var(--tr-muted-foreground))\"`.

### Validation
- `npm run lint` in `frontend/` directory.

### Dependencies
- Blocked by: None
- Blocks: Phase 2

---

## Phase 2: Logic Optimization

### Objective
Prevent authentication failure loops in mock/demo mode.

### Agent: coder
### Parallel: No

### Files to Modify

- `frontend/src/services/userService.js` — Add fallback logic to `getMe`.

### Implementation Details
- Wrap the `getMe` API call in a try/catch block. If it fails and a token exists in localStorage, return the data from `STORAGE_USER`.

### Validation
- `npm run lint`

### Dependencies
- Blocked by: Phase 1
- Blocks: Phase 3

---

## Phase 3: Verification

### Objective
Confirm all bugs are resolved and system integrity is maintained.

### Agent: tester
### Parallel: No

### Validation
- Verify `/auth/2fa` accessibility.
- Check text contrast on labels and placeholders.
- Confirm successful login flow in mock mode.

### Dependencies
- Blocked by: Phase 2
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `frontend/src/index.css` | 1 | Token Definition |
| 2 | `frontend/tailwind.config.js` | 1 | Color Mapping |
| 3 | `frontend/src/routes/AppRoutes.jsx` | 1 | Route Definition |
| 4 | `frontend/src/services/userService.js` | 2 | Mock Logic |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | MEDIUM | Critical for auth flow; CSS changes have high blast radius. |
| 2     | LOW | Targeted service change. |
| 3     | LOW | Verification only. |

## Execution Profile

```
Execution Profile:
- Total phases: 3
- Parallelizable phases: 0
- Sequential-only phases: 3
- Estimated parallel wall time: N/A
- Estimated sequential wall time: ~15 mins

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
