---
title: "TicketMaster UI Upgrade Implementation Plan"
design_ref: "/home/son/TicketRush/docs/maestro/plans/2026-05-10-ticketmaster-ui-upgrade-design.md"
created: "2026-05-10T05:10:00Z"
status: "draft"
total_phases: 4
estimated_files: 6
task_complexity: "complex"
---

# TicketMaster UI Upgrade Implementation Plan

## Plan Overview

- **Total phases**: 4
- **Agents involved**: coder, tester
- **Estimated effort**: High. Significant layout and animation refactoring across core components.

## Dependency Graph

```text
Phase 1: Foundation (CSS & Tailwind)
    |
    +-----------------------+
    |                       |
    v                       v
Phase 2: Bento & Bezel   Phase 3: Motion & Core Layout
(Home, EventCard)        (HeroSlider, App)
    |                       |
    +-----------------------+
    |
    v
Phase 4: Validation (UI Audit)
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Setup animations and base styles |
| 2     | Phase 2, 3 | Parallel | 2 | Independent component overhauls |
| 3     | Phase 4 | Sequential | 1 | Final layout verification |

## Phase 1: Foundation (CSS & Tailwind)

### Objective
Establish the animation keyframes, spacing utilities, and base glassmorphism variants required for the high-end aesthetic.

### Agent: coder
### Parallel: No

### Files to Modify

- `frontend/tailwind.config.js` — Add custom `cubic-bezier` easing curves, `animate-fade-in-up`, and `scale-in` animations.
- `frontend/src/index.css` — Refine the radial gradients in the background and establish `.glass-outer` and `.glass-inner` base classes for the Double-Bezel architecture.

### Implementation Details
- In `tailwind.config.js`, define an `ease-spring` utility: `cubic-bezier(0.32, 0.72, 0, 1)`.
- In `index.css`, create reusable classes for the Double-Bezel effect to ensure consistency across cards and buttons.

### Validation
- `npm run lint` in `frontend/`.

### Dependencies
- Blocked by: None
- Blocks: Phase 2, Phase 3

---

## Phase 2: Bento & Bezel (Home, EventCard)

### Objective
Convert the generic event listing grid into an Asymmetrical Bento layout and upgrade event cards to use physical "Double-Bezel" layers.

### Agent: coder
### Parallel: Yes

### Files to Modify

- `frontend/src/pages/Customer/Home.jsx` — Implement the asymmetrical grid layout (`md:grid-cols-4` with featured events spanning `col-span-2 row-span-2`).
- `frontend/src/components/home/EventCard.jsx` — Apply the Double-Bezel architecture and Button-in-Button pattern.

### Implementation Details
- `Home.jsx`: Ensure the mobile view falls back strictly to `grid-cols-1` with ample `gap-6`.
- `EventCard.jsx`: Nest the main content within an inner container and an outer shell. Add `hover:-translate-y-2` and `hover:shadow-2xl` with the new spring easing.

### Validation
- `npm run lint` in `frontend/`.

### Dependencies
- Blocked by: Phase 1
- Blocks: Phase 4

---

## Phase 3: Motion & Core Layout (HeroSlider, App)

### Objective
Enhance the primary app shell and hero section with macro-whitespace, fluid navigation, and staggered entry motion.

### Agent: coder
### Parallel: Yes

### Files to Modify

- `frontend/src/components/home/HeroSlider.jsx` — Add staggered text entry animations.
- `frontend/src/App.jsx` — Update header spacing and ensure proper padding for the main layout.

### Implementation Details
- `HeroSlider.jsx`: Apply staggered delays to title, description, and CTA. Update pagination bullets to look like pill-shaped indicators.
- `App.jsx`: Refine the `header` element with `backdrop-blur-xl` and increased vertical padding.

### Validation
- `npm run lint` in `frontend/`.

### Dependencies
- Blocked by: Phase 1
- Blocks: Phase 4

---

## Phase 4: Validation (UI Audit)

### Objective
Verify that the Asymmetrical Bento layout collapses correctly on mobile and that all animations perform smoothly without layout thrashing.

### Agent: tester
### Parallel: No

### Validation
- Audit the responsive behavior of `Home.jsx` (Desktop vs. Mobile).
- Check `EventCard.jsx` for correct Double-Bezel rendering and hover physics.
- Confirm `HeroSlider.jsx` staggered entry timing.

### Dependencies
- Blocked by: Phase 2, Phase 3
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `frontend/tailwind.config.js` | 1 | Configuration |
| 2 | `frontend/src/index.css` | 1 | Global Styles |
| 3 | `frontend/src/pages/Customer/Home.jsx` | 2 | Layout |
| 4 | `frontend/src/components/home/EventCard.jsx` | 2 | Component UI |
| 5 | `frontend/src/components/home/HeroSlider.jsx` | 3 | Component UI |
| 6 | `frontend/src/App.jsx` | 3 | Core Layout |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Standard CSS/Config updates. |
| 2     | HIGH | Complex grid changes; high risk of responsive breakage on mobile. |
| 3     | MEDIUM | Animation timings might feel jarring if not tuned correctly. |
| 4     | LOW | Read-only verification. |

## Execution Profile

```text
Execution Profile:
- Total phases: 4
- Parallelizable phases: 2 (in 1 batch)
- Sequential-only phases: 2
- Estimated parallel wall time: ~10 mins
- Estimated sequential wall time: ~20 mins

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```