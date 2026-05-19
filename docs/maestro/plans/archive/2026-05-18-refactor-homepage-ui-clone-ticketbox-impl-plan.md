---
title: "TicketRush Homepage UI Refactor Implementation Plan"
design_ref: "docs/maestro/plans/2026-05-18-refactor-homepage-ui-clone-ticketbox-design.md"
created: "2026-05-18T14:15:00.000Z"
status: "approved"
total_phases: 5
estimated_files: 10
task_complexity: "complex"
---

# TicketRush Homepage UI Refactor Implementation Plan

## Plan Overview
- **Total phases**: 5
- **Agents involved**: design_system_engineer, coder, ux_designer
- **Estimated effort**: Complex UI refactor involving structural changes to the header and global theme updates.

## Dependency Graph
```
Phase 1 (Foundation: Theme Tokens & Extraction)
  |
Phase 2 (Header Refactor: Inline Search & Green Style)
  |
Phase 3 (Home Layout: Content Category Nav)
  |
Phase 4 (Component Skinning: Cards & Sections)
  |
Phase 5 (Validation & Final Polish)
```

## Execution Strategy
| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1| Sequential| 1           | Define tokens & setup structure |
| 2     | Phase 2, 3 | Parallel | 2        | Header and Home layout changes |
| 3     | Phase 4| Sequential| 1           | Visual skinning of components |
| 4     | Phase 5| Sequential| 1           | Final audit and bug fixes |

## Phase 1: Foundation (Theme Tokens & Component Extraction)
### Objective
Establish the Ticketbox brand identity in the codebase and extract the monolithic components from `App.jsx`.

### Agent: design_system_engineer
### Parallel: No

### Files to Create
- `frontend/src/components/layout/Header.jsx` — Extracted header component.
- `frontend/src/components/home/CategorySection.jsx` — Extracted category navigation component.

### Files to Modify
- `frontend/src/index.css` — Update `--tr-primary` to Ticketbox green (`136 67% 44%` HSL) and define dark mode forest green variant.
- `frontend/src/App.jsx` — Replace inline header/nav with imported components.

### Validation
- `npm run lint`
- Verify that the app still renders with the new (extracted) components and the primary color has changed to green.

---

## Phase 2: Header Refactor (Inline Search & Clone Style)
### Objective
Implement the Ticketbox-style inline search and header actions.

### Agent: coder
### Parallel: Yes (with Phase 3)

### Files to Modify
- `frontend/src/components/layout/Header.jsx` — Refactor JSX to include a persistent search input field. Style with solid green background.
- `frontend/src/components/common/SearchOverlay.jsx` — (Optional) Update styles or disable if no longer needed by the new header trigger.

### Implementation Details
- The search input must use the `eventSearch` state passed from `App.jsx` (or a context if preferred).
- Replicate the Ticketbox search bar look: rounded, white background, "Tìm kiếm" button on the right inside the input.

### Validation
- `npm run lint`
- Manual check: Typing in the header search bar filters events on the homepage.

---

## Phase 3: Home Layout (Content-Level Category Nav)
### Objective
Move the category navigation from the sticky header to the page content.

### Agent: coder
### Parallel: Yes (with Phase 2)

### Files to Modify
- `frontend/src/pages/Customer/Home.jsx` — Inject `CategorySection` between `HeroCarousel` and `PromotionBanners`.
- `frontend/src/components/home/CategorySection.jsx` — Remove sticky styles; update button styles to match Ticketbox rounded filters.

### Validation
- `npm run lint`
- Manual check: Category navigation is no longer sticky and appears below the hero carousel.

---

## Phase 4: Component Skinning (Cards & Sections)
### Objective
Apply the Ticketbox aesthetic to all homepage components.

### Agent: coder
### Parallel: No

### Files to Modify
- `frontend/src/components/home/EventCard.jsx` — Update border-radius, font weights, and price colors.
- `frontend/src/components/home/HeroCarousel.jsx` — Update indicators and layout.
- `frontend/src/components/home/TrendingEvents.jsx` — Update rank colors and icons.
- `frontend/src/components/home/SpecialEvents.jsx` — Update card proportions.

### Validation
- `npm run lint`
- `npm run build`
- Visual check against `ticketbox.vn`.

---

## Phase 5: Validation & Final Polish
### Objective
Audit the UI for visual regressions and verify mobile responsiveness.

### Agent: ux_designer
### Parallel: No

### Files to Modify
- Any component requiring minor CSS adjustments based on the visual audit.

### Validation
- Run Playwright E2E tests: `npx playwright test tests/e2e/booking.spec.ts`.
- Verify dark mode remains legible and "Ticketbox-inspired".

---

## File Inventory
| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `frontend/src/index.css` | 1 | Theme tokens |
| 2 | `frontend/src/components/layout/Header.jsx` | 1, 2 | Header refactor |
| 3 | `frontend/src/components/home/CategorySection.jsx` | 1, 3 | Category Nav refactor |
| 4 | `frontend/src/App.jsx` | 1 | Integration |
| 5 | `frontend/src/pages/Customer/Home.jsx` | 3 | Home layout |
| 6 | `frontend/src/components/home/EventCard.jsx` | 4 | Card skinning |
| 7 | `frontend/src/components/home/HeroCarousel.jsx" | 4 | Hero skinning |
| 8 | `frontend/src/components/home/TrendingEvents.jsx` | 4 | Trending skinning |
| 9 | `frontend/src/components/home/SpecialEvents.jsx` | 4 | Special skinning |
| 10| `frontend/src/components/home/EventListWithTabs.jsx` | 4 | List skinning |

## Execution Profile
```
Execution Profile:
- Total phases: 5
- Parallelizable phases: 2 (in 1 batch: Phase 2, Phase 3)
- Sequential-only phases: 3
- Estimated parallel wall time: 4 implementation turns
- Estimated sequential wall time: 6 implementation turns

Note: Native subagents currently run in autonomous mode.
All tool calls are auto-approved without user confirmation.
```
