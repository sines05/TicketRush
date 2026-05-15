---
title: "Fix Network Resolution and Error Handling Implementation Plan"
design_ref: "/home/son/TicketRush/docs/maestro/plans/2026-05-14-fix-network-resolution-and-error-handling-design.md"
created: "2026-05-14T06:42:00.000Z"
status: "draft"
total_phases: 2
estimated_files: 5
task_complexity: "medium"
---

# Fix Network Resolution and Error Handling Implementation Plan

## Plan Overview

- **Total phases**: 2
- **Agents involved**: `devops_engineer`, `coder`
- **Estimated effort**: Moderate. Fixes connectivity and implements error handling UI patterns across three main entry points.

## Dependency Graph

```text
Phase 1: Environment & API Foundation
    |
Phase 2: UI Error Handling Implementation
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Environment and API logic |
| 2     | Phase 2 | Sequential | 1 | Component UI updates |

## Phase 1: Environment & API Foundation

### Objective
Resolve the connectivity issue by updating the Docker environment and the API client's base URL logic.

### Agent: `devops_engineer`
### Parallel: No

### Files to Modify

- `docker-compose.yml`
  - Ensure `VITE_PUBLIC_API_URL` is explicitly set to `http://localhost:8080` (or `http://127.0.0.1:8080`).
  - Update `VITE_API_URL` to be used only for internal proxying if necessary, but prioritize public access for the browser.

- `frontend/src/services/api.js`
  - Update `getBaseURL` to prioritize `import.meta.env.VITE_PUBLIC_API_URL` over `VITE_API_URL`.
  - Ensure fallback to `http://localhost:8080/api/v1/` remains robust for local non-Docker development.

### Implementation Details
- In `api.js`, change the order in `getBaseURL`:
  ```javascript
  let base = import.meta.env.VITE_PUBLIC_API_URL || import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
  ```
- This ensures that if the browser-visible URL is provided, it is used.

### Validation
- `npm run lint` in the frontend directory.
- Verify that `VITE_PUBLIC_API_URL` is correctly injected into the container (if possible, or via code review).

### Dependencies
- Blocked by: None
- Blocks: Phase 2

---

## Phase 2: UI Error Handling Implementation

### Objective
Add error state management and retry mechanisms to `Home.jsx`, `EventListWithTabs.jsx`, and `SearchOverlay.jsx` using the `EmptyState` component.

### Agent: `coder`
### Parallel: No

### Files to Modify

- `frontend/src/pages/Customer/Home.jsx`
  - Add `error` state.
  - Wrap `fetchHero` in a try-catch that sets `setError(err.message)`.
  - Render `EmptyState` with a "Thử lại" action when `error` is present in the Hero section.

- `frontend/src/components/home/EventListWithTabs.jsx`
  - Add `error` state.
  - Update the `.catch()` block to set `setError(e?.message || 'Không tải được danh sách sự kiện')`.
  - Render `EmptyState` inside the tab content area when `error` is present.

- `frontend/src/components/common/SearchOverlay.jsx`
  - Add `error` state.
  - Wrap `fetchTrending` in a try-catch.
  - Display a compact error message or `EmptyState` in the suggestions section if trends fail to load.

### Implementation Details
- Use the existing `EmptyState` component:
  ```jsx
  <EmptyState 
    title="Lỗi tải dữ liệu" 
    description={error} 
    action={{ label: "Thử lại", onClick: fetchData }} 
  />
  ```
- Ensure the `error` state is cleared before re-attempting a fetch.

### Validation
- `npm run lint` in the frontend directory.
- Verify component structure through code review.

### Dependencies
- Blocked by: Phase 1
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `docker-compose.yml` | 1 | Environment configuration for API access |
| 2 | `frontend/src/services/api.js` | 1 | Base URL resolution logic |
| 3 | `frontend/src/pages/Customer/Home.jsx` | 2 | Hero section error handling |
| 4 | `frontend/src/components/home/EventListWithTabs.jsx` | 2 | Tabbed event list error handling |
| 5 | `frontend/src/components/common/SearchOverlay.jsx` | 2 | Search trends error handling |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Simple environment variable and string manipulation. |
| 2     | MEDIUM | Touches multiple UI entry points; requires ensuring the retry logic correctly resets state to avoid infinite loops or stale UI. |

## Execution Profile

```text
Execution Profile:
- Total phases: 2
- Parallelizable phases: 0
- Sequential-only phases: 2
- Estimated parallel wall time: N/A
- Estimated sequential wall time: ~15-20 minutes

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
