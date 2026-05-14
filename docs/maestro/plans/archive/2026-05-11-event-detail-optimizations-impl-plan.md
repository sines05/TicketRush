---
title: "Event Detail Page Optimizations Implementation Plan"
design_ref: "docs/maestro/plans/2026-05-11-event-detail-optimizations-design.md"
created: "2026-05-11T00:00:00Z"
status: "approved"
total_phases: 2
estimated_files: 9
task_complexity: "complex"
---

# Event Detail Page Optimizations Implementation Plan

## Plan Overview

- **Total phases**: 2
- **Agents involved**: coder
- **Estimated effort**: Moderate complexity. Addresses 10 specific review points across logic and styling.

## Dependency Graph

```text
Phase 1: Config and Logic Foundation
    │
    ▼
Phase 2: UI Component and Integration Polish
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Foundation fixes |
| 2     | Phase 2 | Sequential | 1 | UI and wiring |

## Phase 1: Config and Logic Foundation

### Objective
Fix the broken CSS variable system, enable Tailwind alpha support, and implement resilient data fetching for recommendations.

### Agent: coder
### Parallel: No

### Files to Modify
- `frontend/src/index.css` — Add `--tr-surface` (263 30% 10%) to `.dark` layer.
- `frontend/tailwind.config.js` — Update HSL color definitions to use `/<alpha-value>` placeholders.
- `frontend/src/services/eventService.js` — Add `getSimilarEvents(category, limit)` using `getEvents` with category filter.
- `frontend/src/hooks/useEventDetail.js` — Refactor `Promise.all` to `Promise.allSettled`, fetch similar events, and expose `recommendedEvents`.

### Implementation Details
- In `index.css`, ensure `--tr-surface` is added to both `:root` (light value) and `.dark`.
- In `tailwind.config.js`, update `colors` like `border`, `background`, `primary`, etc., to: `hsl(var(--tr-...) / <alpha-value>)`.
- In `useEventDetail.js`, handle results of `allSettled` to set `event`, `seatMap`, and `recommendedEvents` independently.

### Validation
- `npm run lint`

### Dependencies
- Blocked by: None
- Blocks: Phase 2

---

## Phase 2: UI Component and Integration Polish

### Objective
Tighten the page layout, fix component-level bugs (mock data, hardcoded heights), and wire up the recommendations data.

### Agent: coder
### Parallel: No

### Files to Modify
- `frontend/src/pages/Customer/EventDetail.jsx` — Reduce vertical spacing (`py-20` -> `py-10`, `space-y-12` -> `space-y-8`), pass `recommendedEvents` to `RecommendationsSection`, update `IntersectionObserver` threshold to `0.1`.
- `frontend/src/components/EventDetail/IntroductionSection.jsx` — Increase border opacity from `border-white/5` to `border-white/15`.
- `frontend/src/components/EventDetail/ScheduleSection.jsx` — Remove hardcoded `min-h-[300px]` in favor of `min-h-[100px]` or removal.
- `frontend/src/components/EventDetail/OrganizerSection.jsx` — Replace the hardcoded mock organizer object with a check for `event.organizer` and show a "Chưa có thông tin" state if missing.
- `frontend/src/components/EventDetail/RecommendationsSection.jsx` — Update to correctly use the `events` prop passed from the parent.

### Implementation Details
- Ensure the `RecommendationsSection` uses the real data and its mock fallback only if the prop is empty.
- Audit all `space-y-12` usage and reduce to `space-y-6` or `space-y-8`.

### Validation
- `npm run build`
- `npm run lint`

### Dependencies
- Blocked by: Phase 1
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `frontend/src/index.css` | 1 | CSS Variable fix |
| 2 | `frontend/tailwind.config.js` | 1 | Tailwind Alpha fix |
| 3 | `frontend/src/services/eventService.js` | 1 | API implementation |
| 4 | `frontend/src/hooks/useEventDetail.js` | 1 | Resilient fetching |
| 5 | `frontend/src/pages/Customer/EventDetail.jsx` | 2 | Layout and integration |
| 6 | `frontend/src/components/EventDetail/IntroductionSection.jsx` | 2 | Contrast fix |
| 7 | `frontend/src/components/EventDetail/ScheduleSection.jsx` | 2 | Spacing fix |
| 8 | `frontend/src/components/EventDetail/OrganizerSection.jsx" | 2 | Data fallback fix |
| 9 | `frontend/src/components/EventDetail/RecommendationsSection.jsx` | 2 | Prop wiring fix |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | MEDIUM | Changing `tailwind.config.js` and `index.css` global variables can have side effects on other pages. |
| 2 | LOW | Pure UI and wiring changes with clear rollback paths. |

## Execution Profile

```
Execution Profile:
- Total phases: 2
- Parallelizable phases: 0
- Sequential-only phases: 2
- Estimated parallel wall time: N/A
- Estimated sequential wall time: 2 x ~15 mins = 30 mins

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
