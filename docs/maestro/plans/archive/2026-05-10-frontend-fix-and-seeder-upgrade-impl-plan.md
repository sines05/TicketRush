---
title: "Frontend Fixes and Seeder Upgrade Implementation Plan"
design_ref: "/home/son/.gemini/tmp/ticketrush/798b7daf-148e-4146-85dd-10511f7bfb00/plans/2026-05-10-frontend-fix-and-seeder-upgrade-design.md"
created: "2026-05-10T17:15:00Z"
status: "approved"
total_phases: 2
estimated_files: 6
task_complexity: "medium"
---

# Frontend Fixes and Seeder Upgrade Implementation Plan

## Plan Overview

- **Total phases**: 2
- **Agents involved**: `coder`, `data_engineer`
- **Estimated effort**: Moderate effort to clean up UI components and refactor the seeder script.

## Dependency Graph

```
[Phase 1: Frontend Theme Fixes]
       |
[Phase 2: Seeder Upgrade]
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | UI Cleanup |
| 2     | Phase 2 | Sequential | 1 | Data Engineering |

## Phase 1: Frontend Theme Fixes

### Objective
Replace hardcoded `text-white` with `text-foreground` or theme-aware logic in the upgraded frontend components.

### Agent: coder
### Parallel: No

### Files to Modify

- `frontend/src/components/home/EventCard.jsx`: Change `text-white` to `text-foreground` for the event title.
- `frontend/src/components/home/EventListWithTabs.jsx`: Change header and tab colors to be theme-aware.
- `frontend/src/components/home/LocationCards.jsx`: Change section header to `text-foreground`.
- `frontend/src/components/home/SpecialEvents.jsx`: Change section header to `text-foreground`.
- `frontend/src/components/home/TrendingEvents.jsx`: Change header and ranking numbers to be theme-aware.

### Implementation Details
- For titles on plain backgrounds (section headers), use `text-foreground`.
- For text inside cards that might have a background, verify if the card background is consistent. If the card uses `bg-card` or `bg-background`, use `text-foreground`.
- Keep `text-white` ONLY if the text is absolutely positioned over an image with a dark gradient overlay.

### Validation
- Build frontend: `cd frontend && npm run build`
- Manual visual check (simulated): Review the JSX changes to ensure `text-foreground` is used for non-overlay text.

## Phase 2: Seeder Upgrade

### Objective
Refactor `cmd/seed/main.go` to generate 50+ diverse events using a loop and randomization.

### Agent: data_engineer
### Parallel: No

### Files to Modify

- `cmd/seed/main.go`: Replace the hardcoded `eventSeeds` slice with a loop-based generation logic.

### Implementation Details
- Define slices for:
  - Titles (e.g., "Concert X", "Festival Y", "Workshop Z")
  - Descriptions (short blurbs)
  - Banner URLs (use varied Unsplash IDs)
  - Locations (matching `CITY_OPTIONS` labels: 'Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Đà Lạt', 'Nha Trang')
  - Categories (matching `CATEGORY_OPTIONS` labels)
- Use a loop `for i := 0; i < 50; i++`.
- Randomize `start_time` between `now - 30 days` and `now + 60 days`.
- Assign `is_hero` and `is_featured` randomly (e.g., 10% chance).
- Generate 2-3 zones per event with random prices and seat counts.
- Maintain existing Admin and Customer users.

### Validation
- Run seeder: `go run cmd/seed/main.go`
- Verify DB count: `SELECT count(*) FROM events;` should return >= 50.

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `frontend/src/components/home/EventCard.jsx` | 1 | Fix text visibility |
| 2 | `frontend/src/components/home/EventListWithTabs.jsx` | 1 | Fix text visibility |
| 3 | `frontend/src/components/home/LocationCards.jsx` | 1 | Fix text visibility |
| 4 | `frontend/src/components/home/SpecialEvents.jsx` | 1 | Fix text visibility |
| 5 | `frontend/src/components/home/TrendingEvents.jsx` | 1 | Fix text visibility |
| 6 | `cmd/seed/main.go` | 2 | Increase seed data |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Simple class replacements. |
| 2     | LOW | Standard Go script refactor. |

## Execution Profile

```
Execution Profile:
- Total phases: 2
- Parallelizable phases: 0
- Sequential-only phases: 2
- Estimated parallel wall time: 10m
- Estimated sequential wall time: 10m

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
