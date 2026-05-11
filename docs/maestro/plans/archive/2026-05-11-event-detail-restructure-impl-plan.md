---
title: "Event Detail Page Restructure Implementation Plan"
design_ref: "docs/maestro/plans/2026-05-11-event-detail-restructure-design.md"
created: "2026-05-11T00:00:00Z"
status: "approved"
total_phases: 4
estimated_files: 8
task_complexity: "complex"
---

# Event Detail Page Restructure Implementation Plan

## Plan Overview

- **Total phases**: 4
- **Agents involved**: coder
- **Estimated effort**: Moderate complexity restructure with new components and custom hook extraction.

## Dependency Graph

```text
Phase 1: Custom Hook Foundation
    │
    ▼
Phase 2: UI Component Implementation (Hero, Intro, Schedule, Organizer, StickyBar)
    │
    ▼
Phase 3: Recommendations & Shared Integration
    │
    ▼
Phase 4: Main Page Restructure & Final Polish
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Logic Foundation |
| 2     | Phase 2 | Sequential | 1 | UI Building Blocks |
| 3     | Phase 3 | Sequential | 1 | Integration |
| 4     | Phase 4 | Sequential | 1 | Assembly & Validation |

## Phase 1: Custom Hook Foundation

### Objective
Extract data fetching (event detail, seat map, reviews) and state management from `EventDetail.jsx` into a reusable custom hook.

### Agent: coder
### Parallel: No

### Files to Create
- `frontend/src/hooks/useEventDetail.js` — Custom hook encapsulating `useState`, `useEffect` (for details/seatmap), and `useQuery` (for reviews/mutations).

### Implementation Details
- Extract `slug` handling.
- Move `Promise.all` logic for `getEventDetail` and `getSeatMap`.
- Move `reviews` query and `reviewMutation`.
- Expose a clean interface: `{ event, seatMap, reviews, loading, error, minPrice, reviewMutation, submitReview }`.

### Validation
- Verify the hook compiles and returns expected data structures (via manual inspection/mocking if possible, otherwise by usage in Phase 2).

### Dependencies
- Blocked by: None
- Blocks: Phase 2, 3, 4

---

## Phase 2: UI Component Implementation

### Objective
Create the individual section components as defined in the design.

### Agent: coder
### Parallel: No

### Files to Create
- `frontend/src/components/EventDetail/HeroSection.jsx` — 2-column layout (Info/Poster).
- `frontend/src/components/EventDetail/IntroductionSection.jsx` — Description block.
- `frontend/src/components/EventDetail/ScheduleSection.jsx` — List/Calendar toggle view using `react-day-picker`.
- `frontend/src/components/EventDetail/OrganizerSection.jsx` — Organizer info.
- `frontend/src/components/EventDetail/StickyActionBar.jsx` — Floating CTA bar.

### Implementation Details
- Components should be "pure" UI components receiving data via props from `EventDetail.jsx`.
- Use Tailwind for layouts and animations.
- Integrate `react-day-picker` in `ScheduleSection`.

### Validation
- `npm run lint`

### Dependencies
- Blocked by: Phase 1
- Blocks: Phase 4

---

## Phase 3: Recommendations & Shared Integration

### Objective
Implement the recommendations section and integrate existing shared components.

### Agent: coder
### Parallel: No

### Files to Create
- `frontend/src/components/EventDetail/RecommendationsSection.jsx` — Grid of event cards.

### Files to Modify
- `frontend/src/components/EventDetail/RecommendationsSection.jsx` — Import and use `frontend/src/components/home/EventCard.jsx`.

### Implementation Details
- Create a grid layout (4 columns) as per reference.
- Map through "Related Events" (if available in API) or show placeholders/mock events for now if API doesn't support recommendations yet (adhering to DESIGN.md defaults).

### Validation
- `npm run lint`

### Dependencies
- Blocked by: Phase 1
- Blocks: Phase 4

---

## Phase 4: Main Page Restructure & Final Polish

### Objective
Assemble the components in `EventDetail.jsx` and implement the `IntersectionObserver` logic.

### Agent: coder
### Parallel: No

### Files to Modify
- `frontend/src/pages/Customer/EventDetail.jsx` — Complete rewrite to use `useEventDetail` and the new components.

### Implementation Details
- Use `useEventDetail` hook.
- Implement `IntersectionObserver` on the `HeroSection` container to toggle `StickyActionBar` visibility.
- Ensure all sections are ordered correctly according to the reference design.
- Final visual refinement (padding, gaps).

### Validation
- `npm run build`
- `npm run lint`

### Dependencies
- Blocked by: Phase 2, Phase 3
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `frontend/src/hooks/useEventDetail.js` | 1 | Logic extraction |
| 2 | `frontend/src/components/EventDetail/HeroSection.jsx` | 2 | Hero UI |
| 3 | `frontend/src/components/EventDetail/IntroductionSection.jsx` | 2 | Intro UI |
| 4 | `frontend/src/components/EventDetail/ScheduleSection.jsx` | 2 | Schedule UI |
| 5 | `frontend/src/components/EventDetail/OrganizerSection.jsx` | 2 | Organizer UI |
| 6 | `frontend/src/components/EventDetail/StickyActionBar.jsx` | 2 | Sticky Bar UI |
| 7 | `frontend/src/components/EventDetail/RecommendationsSection.jsx` | 3 | Recommendations UI |
| 8 | `frontend/src/pages/Customer/EventDetail.jsx` | 4 | Page Assembly |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | LOW | Refactoring existing logic is safe if functional parity is maintained. |
| 2 | MEDIUM | Styling complexity with external library (Calendar). |
| 3 | LOW | Reuse of existing card component is low risk. |
| 4 | MEDIUM | IntersectionObserver setup and overall page assembly may require iterative refinement. |

## Execution Profile

```text
Execution Profile:
- Total phases: 4
- Parallelizable phases: 0
- Sequential-only phases: 4
- Estimated parallel wall time: N/A
- Estimated sequential wall time: 4 x ~20 mins = 80 mins

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
