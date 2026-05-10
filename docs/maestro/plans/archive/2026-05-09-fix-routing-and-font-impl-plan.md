---
title: "Fix Trending Events Routing and Font Blurriness Implementation Plan"
created: "2026-05-09T00:00:00Z"
status: "draft"
total_phases: 1
estimated_files: 2
task_complexity: "simple"
---

# Fix Trending Events Routing and Font Blurriness Implementation Plan

## Plan Overview
- **Total phases**: 1
- **Agents involved**: coder
- **Estimated effort**: Small fixes for routing and styling.

## Dependency Graph
```
Phase 1 [coder]
```

## Phase 1: Fix Routing and Styling
### Objective
Update the navigation in TrendingEvents and reduce backdrop blur in the global CSS to ensure sharp text.
### Agent: coder
### Parallel: No
### Files to Modify
- `frontend/src/components/home/TrendingEvents.jsx` — Update navigation to event detail page.
- `frontend/src/index.css` — Reduce `backdrop-filter: blur(12px)` to `blur(4px)` in `.bg-surface`.
### Implementation Details
- In `TrendingEvents.jsx`, change the `to` path from `/booking/queue...` to `/events/${evt.slug || evt.id}`.
- In `index.css`, locate `.bg-surface` and adjust the blur radius.
### Validation
- `npm run build` in `frontend` directory.
### Dependencies
- Blocked by: None
- Blocks: None
