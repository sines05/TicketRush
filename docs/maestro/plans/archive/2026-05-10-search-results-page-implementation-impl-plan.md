---
title: "Search Results Page Implementation Plan"
design_ref: "/home/son/.gemini/tmp/ticketrush/798b7daf-148e-4146-85dd-10511f7bfb00/plans/2026-05-10-search-results-page-implementation-design.md"
created: "2026-05-10T15:20:00Z"
status: "draft"
total_phases: 1
estimated_files: 2
task_complexity: "medium"
---

# Search Results Page Implementation Plan

## Plan Overview

- **Total phases**: 1
- **Agents involved**: `coder`
- **Estimated effort**: Moderate. Requires creating a new React page component, adapting routing, and ensuring URL parameters sync with backend fetching logic.

## Dependency Graph

```
[Phase 1: Search Results Page]
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Full Implementation |

## Phase 1: Search Results Page

### Objective
Create the Search Results Page (`SearchResults.jsx`) with a Top Bar containing filter buttons, a 4-column event grid, and specialized Event Cards. Wire it into the application routing.

### Agent: coder
### Parallel: No

### Files to Create

- `frontend/src/pages/Customer/SearchResults.jsx` — The main page component.

### Files to Modify

- `frontend/src/routes/AppRoutes.jsx` — Add the `/search` route and lazy load the new component.

### Implementation Details

1. **`AppRoutes.jsx`**:
   - Add `const SearchResults = lazy(() => import('../pages/Customer/SearchResults.jsx'));`
   - Add `<Route path="/search" element={<SearchResults />} />` inside the Customer layout routes.

2. **`SearchResults.jsx`**:
   - **Data Fetching**: Use `useSearchParams` to read `q`, `location`, `category`, and `date`. Use `react-query`'s `useQuery` (or a `useEffect`) to call `eventService.getEvents` with these parameters.
   - **Top Bar**: 
     - Left: Text "Kết quả tìm kiếm" (small size).
     - Right: 
       - "Tất cả các ngày" button with a Calendar icon (Lucide).
       - Green "Bộ lọc" button with a Filter/Funnel icon.
       - "Vị trí khác" button with a MapPin icon.
   - **Grid Layout**: `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">`
   - **Event Card**: Since the user requested a specific layout (Image 1/2 height, title max 2 lines, price in green "Từ ...", date with icon), implement a local `SearchEventCard` component inside `SearchResults.jsx` to perfectly match these specs without risking breaking the global `EventCard`.
     - Image wrapper: `aspect-[4/3] w-full overflow-hidden rounded-t-xl`
     - Content wrapper: `p-4 flex flex-col gap-2`
     - Title: `font-bold line-clamp-2`
     - Price: `text-green-600 font-bold` (Từ [Price])
     - Date: flex container with `<Calendar />` and formatted date string.

### Validation

- Verify navigating to `http://localhost:5173/search` loads the page without crashing.
- Verify the Top Bar renders all requested buttons.
- Verify the 4-column grid layout on wide screens.
- Verify the Event Card matches the requested visual hierarchy.

### Dependencies

- Blocked by: None
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `frontend/src/pages/Customer/SearchResults.jsx` | 1 | New Search Results Page |
| 2 | `frontend/src/routes/AppRoutes.jsx` | 1 | Register the new route |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Adding a new page and route is standard React pattern. Does not interfere with existing complex business logic. |

## Execution Profile

```
Execution Profile:
- Total phases: 1
- Parallelizable phases: 0
- Sequential-only phases: 1
- Estimated parallel wall time: 5m
- Estimated sequential wall time: 5m

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```