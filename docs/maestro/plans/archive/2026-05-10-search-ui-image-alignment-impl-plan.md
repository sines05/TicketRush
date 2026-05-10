---
title: "Search UI Image Alignment Implementation Plan"
created: "2026-05-10T08:00:00Z"
status: "draft"
total_phases: 2
estimated_files: 1
task_complexity: "medium"
---

# Search UI Image Alignment Implementation Plan

## Plan Overview

- **Total phases**: 2
- **Agents involved**: coder, tester
- **Estimated effort**: Medium. Focuses on structural CSS and layout changes within `SearchOverlay.jsx` to match the provided reference image.

## Dependency Graph

```text
Phase 1: Component Refactor (SearchOverlay)
    |
    v
Phase 2: Validation (UX Audit)
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Refactor overlay structure and colors |
| 2     | Phase 2 | Sequential | 1 | Verify against reference image |

## Phase 1: Component Refactor (SearchOverlay)

### Objective
Redesign the `SearchOverlay` component to match the linear structure and specific color palette of the reference image.

### Agent: coder
### Parallel: No

### Files to Modify

- `frontend/src/components/common/SearchOverlay.jsx`

### Implementation Details
- **Modal Colors**: Change the main modal background from `bg-background/95` to a dark teal/greenish hue (e.g., `bg-[#182a2a]/95` or similar) to match the reference.
- **Search Bar**: 
  - Change the search input area to have a solid white background (`bg-white`) with dark text (`text-gray-900`).
  - Add a "Tìm kiếm" (Search) button inside the right side of the input area, separated by a light gray border.
- **Linear Layout**: Remove the 2-column Bento grid (`md:col-span-3` and `md:col-span-2`).
- **Content Sections**: Stack the content vertically:
  1. **Lịch sử tìm kiếm (Recent Searches)**: A clean list at the top with `ArrowUpRight` icons.
  2. **Khám phá theo Thể loại (Categories)**: A horizontal row or grid of category cards with image backgrounds (using existing category data or static images).
  3. **Gợi ý dành cho bạn (Recommendations)**: A grid of event cards (using `trendingEvents` or `results`) showing image, title, price, and date.
- **Remove Footer**: Remove the ESC/Enter hint footer from the previous design to match the cleaner look of the image.

### Validation
- `npm run lint` in `frontend/`.

### Dependencies
- Blocked by: None
- Blocks: Phase 2

---

## Phase 2: Validation (UX Audit)

### Objective
Verify that the Search Hub matches the layout and color scheme of the reference image.

### Agent: tester
### Parallel: No

### Validation
- Confirm the modal background is dark teal/green and the search bar is white.
- Verify the layout is a single vertical column containing Recent Searches, Categories, and Recommendations.
- Check mobile responsiveness.

### Dependencies
- Blocked by: Phase 1
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `frontend/src/components/common/SearchOverlay.jsx` | 1 | Structural Refactoring |

## Execution Profile

```text
Execution Profile:
- Total phases: 2
- Parallelizable phases: 0
- Sequential-only phases: 2
- Estimated parallel wall time: N/A
- Estimated sequential wall time: ~10 mins

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
