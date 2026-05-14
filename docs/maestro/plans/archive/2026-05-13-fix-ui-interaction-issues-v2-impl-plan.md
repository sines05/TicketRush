---
title: "Fix UI Interaction Issues (V2) Implementation Plan"
design_ref: "/home/son/TicketRush/docs/maestro/plans/2026-05-13-fix-ui-interaction-issues-v2-design.md"
created: "2026-05-13T00:00:00Z"
status: "draft"
total_phases: 1
estimated_files: 2
task_complexity: "medium"
---

# Fix UI Interaction Issues (V2) Implementation Plan

## Plan Overview

- **Total phases**: 1
- **Agents involved**: coder
- **Estimated effort**: Low/Medium. Requires fixing React ref bindings for Swiper and resolving CSS stacking context / pointer-event issues on existing components.

## Dependency Graph

```
[Phase 1: UI Fixes (Carousel & ChatWidget)]
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Single agent handles all related UI interaction fixes. |

## Phase 1: UI Fixes (Carousel & ChatWidget)

### Objective
Update `HeroCarousel.jsx` to use React refs for navigation, increase arrow z-index, and fix loop logic. Update `ChatWidget.jsx` to avoid capturing pointer events in its invisible container.

### Agent: coder
### Parallel: No

### Files to Modify

- `frontend/src/components/home/HeroCarousel.jsx`:
  - Import `useRef`, `useState`, `useEffect`.
  - Add `const prevRef = useRef(null); const nextRef = useRef(null);` and state for swiper readiness.
  - Update Swiper `navigation` prop to use these refs on `onInit` / `onSwiper`.
  - Change `.z-10` on arrow buttons to `z-30`. Change `opacity-0` to standard visibility or ensuring it's not permanently invisible on mobile.
  - Update `loop={events.length > 2}` to handle `slidesPerView: 2`.
- `frontend/src/components/ChatWidget.jsx`:
  - Add `pointer-events-none` to the main fixed wrapper (around line 105).
  - Add `pointer-events-auto` to the chat window and the toggle button so they remain interactive.

### Implementation Details

- **HeroCarousel**: Use `onInit={(swiper) => { swiper.params.navigation.prevEl = prevRef.current; swiper.params.navigation.nextEl = nextRef.current; swiper.navigation.init(); swiper.navigation.update(); }}`.
- **ChatWidget**: Ensure the invisible backdrop doesn't block the "Vị trí khác" card in `LocationCards`.

### Validation

- `cd frontend && npm run lint`
- `cd frontend && npm run build`

### Dependencies

- Blocked by: None
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `frontend/src/components/home/HeroCarousel.jsx` | 1 | Fix swiper loop, refs, and z-index |
| 2 | `frontend/src/components/ChatWidget.jsx` | 1 | Fix global pointer-event capture |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW  | Simple targeted CSS/React fixes with no complex logic changes. |

## Execution Profile

```
Execution Profile:
- Total phases: 1
- Parallelizable phases: 0
- Sequential-only phases: 1
- Estimated parallel wall time: 0
- Estimated sequential wall time: 1 min

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```