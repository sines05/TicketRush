---
title: "Advanced Date Picker & Filters Refinement Implementation Plan"
design_ref: "/home/son/.gemini/tmp/ticketrush/798b7daf-148e-4146-85dd-10511f7bfb00/plans/2026-05-10-advanced-date-picker-filters-refinement-design.md"
created: "2026-05-10T16:15:00Z"
status: "approved"
total_phases: 3
estimated_files: 8
task_complexity: "medium"
---

# Advanced Date Picker & Filters Refinement Implementation Plan

## Plan Overview

- **Total phases**: 3
- **Agents involved**: `coder`, `data_engineer`
- **Estimated effort**: Medium. Significant UI refactoring with state-to-URL synchronization and backend repository updates.

## Dependency Graph

```
[Phase 1: Foundation & Backend]
       |
[Phase 2: Filter Components]
       |
[Phase 3: Integration & Polish]
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Backend and Dependencies |
| 2     | Phase 2 | Sequential | 1 | Component Implementation |
| 3     | Phase 3 | Sequential | 1 | Page Integration |

## Phase 1: Foundation & Backend

### Objective
Update the backend to support new filter parameters and set up frontend UI primitives.

### Agent: data_engineer
### Parallel: No

### Files to Modify
- `internal/repository/event_repository.go`: Update `EventRepository` and `GetAllEvents` to accept `EventFilterParams`. Add GORM filters for `date_from`, `date_to`, `category`, and `min_price`/`max_price`.
- `internal/service/event_service.go`: Update `ListEvents` interface and implementation to pass new filters.
- `internal/handler/event_handler.go`: Update `ListEvents` to parse query parameters (`date_from`, `date_to`, `category`, `min_price`, `max_price`) and pass them to the service.

### Implementation Details
- Define `type EventFilterParams struct { Search, Location, Category string; DateFrom, DateTo *time.Time; MinPrice, MaxPrice *float64 }` in `repository`.
- In `GetAllEvents`, add `Where("start_time >= ?", params.DateFrom)` and `Where("start_time <= ?", params.DateTo)`.
- For `MinPrice`, use a subquery or `HAVING` clause as price is in `event_zones`.

### Validation
- Backend build: `go build ./...`
- Test API: `curl "http://localhost:8080/api/v1/events?location=hcm&category=music_festival"`

## Phase 2: Filter Components

### Objective
Create the standalone filter components (`DatePickerDropdown`, `AdvancedFiltersSheet`, `LocationDropdown`) with the required UX behavior.

### Agent: coder
### Parallel: No

### Files to Create
- `frontend/src/components/common/DatePickerDropdown.jsx`: Custom Popover with `react-day-picker` (dual months), Quick Selection Bar, and Reset/Apply footer.
- `frontend/src/components/common/AdvancedFiltersSheet.jsx`: Sheet component with Price range slider and Category pills.
- `frontend/src/components/common/LocationDropdown.jsx`: Popover/Select for choosing specific cities or "Other".

### Implementation Details
- **Dependency installation**: `npm install react-day-picker date-fns`. Run shadcn commands to add `popover`, `sheet`, `calendar`, `slider`.
- **DatePicker**: Implement `onApply(dateRange)` and `onReset()` props. Use `numberOfMonths={2}` on desktop.
- **Styling**: Match the high-end TicketRush design with green accents (`text-primary`, `bg-primary/10`).

### Validation
- Lint check: `npx eslint frontend/src/components/common/`

## Phase 3: Integration & Polish

### Objective
Integrate the new components into `SearchResults.jsx` and implement responsive behaviors.

### Agent: coder
### Parallel: No

### Files to Modify
- `frontend/src/pages/Customer/SearchResults.jsx`: Replace dummy buttons with the new components. Sync state with `useSearchParams`.
- `frontend/src/components/common/SearchOverlay.jsx`: Ensure navigation to `/search` preserves all current params.

### Implementation Details
- In `SearchResults`, read `date_from`, `date_to`, etc., from URL. Pass them as initial values to the filter components.
- Implementation of responsive logic: On mobile, use a full-screen drawer or single-month calendar.

### Validation
- Final build: `npm run build`
- Manual verification: Check URL update upon clicking "Apply" in the Date Picker and Filters sheet.

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/repository/event_repository.go` | 1 | Backend filter logic |
| 2 | `internal/service/event_service.go` | 1 | Service layer pass-through |
| 3 | `internal/handler/event_handler.go` | 1 | API query param parsing |
| 4 | `frontend/src/components/common/DatePickerDropdown.jsx` | 2 | Advanced Date Picker |
| 5 | `frontend/src/components/common/AdvancedFiltersSheet.jsx` | 2 | Price/Category filters |
| 6 | `frontend/src/components/common/LocationDropdown.jsx` | 2 | City/Other location filter |
| 7 | `frontend/src/pages/Customer/SearchResults.jsx` | 3 | Page integration |
| 8 | `frontend/src/components/common/SearchOverlay.jsx` | 3 | Navigation sync |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | LOW | Standard Go/GORM refactor. |
| 2 | MEDIUM | Complex UI logic for dual-calendar and manual date selection logic. |
| 3 | MEDIUM | State-to-URL synchronization needs to be bug-free to avoid infinite re-fetches. |

## Execution Profile

```
Execution Profile:
- Total phases: 3
- Parallelizable phases: 0
- Sequential-only phases: 3
- Estimated parallel wall time: 10m
- Estimated sequential wall time: 10m

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
