---
title: "Location Cards Refinement Implementation Plan"
design_ref: "/home/son/TicketRush/docs/maestro/plans/2026-05-10-location-cards-refinement-design.md"
created: "2026-05-10T14:35:00Z"
status: "approved"
total_phases: 1
estimated_files: 3
task_complexity: "medium"
---

# Location Cards Refinement Implementation Plan

## Plan Overview

- **Total phases**: 1
- **Agents involved**: `coder`
- **Estimated effort**: Moderate. Involves UI refactoring in React, minor logic update in Go repository, and adding seed data.

## Dependency Graph

```
[Phase 1: Location Cards & Backend Filter]
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Full Implementation |

## Phase 1: Location Cards & Backend Filter

### Objective
Implement the redesigned Location Cards UI in `SearchOverlay.jsx`, update the backend repository to support the `location=other` filter, and add a seed event for verification.

### Agent: coder
### Parallel: No

### Files to Modify

- `internal/repository/event_repository.go` — Update `GetAllEvents` to handle `location=other` using a `NOT IN` clause.
- `cmd/seed/main.go` — Add a new event in "Đà Lạt" (an 'other' city) with its own zones and seats.
- `frontend/src/components/common/SearchOverlay.jsx` — Redesign the city card mapping, add the special "Vị trí khác" card with 4-image grid, and update styling/overlays.

### Implementation Details

#### Backend (`event_repository.go`):
Update the `location` filtering logic:
```go
if location != "" {
    if location == "other" {
        query = query.Where("events.location NOT IN ('Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ')")
    } else {
        query = query.Where("events.location = ?", location)
    }
}
```

#### Seeder (`seed/main.go`):
Add a 7th event:
- Title: "Đà Lạt Mộng Mơ: Đêm Nhạc Trịnh"
- Location: "Đà Lạt"
- Address: "Quảng trường Lâm Viên, Đà Lạt"
- Category: "Âm nhạc & Lễ hội"

#### Frontend (`SearchOverlay.jsx`):
- Update the `CITY_OPTIONS` mapping inside the `activeTab === 'city'` block.
- Standard Card:
    - Wrapper: `rounded-2xl shadow-lg`
    - Image: `object-cover`
    - Overlay: `bg-gradient-to-b from-black/70 via-black/20 to-transparent`
    - Text: `top-4 left-4 font-extrabold text-lg text-white`
- "Vị trí khác" Card:
    - Rendered after the `CITY_OPTIONS` map.
    - Uses a `grid grid-cols-2 grid-rows-2 gap-1` for 4 thumbnails.
    - Thumbnails: Use 4 distinct Unsplash IDs (e.g., from search 'vietnam landscape').
    - Action: `handleSearchAction({ location: 'other' })`.

### Validation

- **Backend**: `go run cmd/seed/main.go` should succeed.
- **API**: `curl http://localhost:8080/api/v1/events?location=other` should return the Đà Lạt event.
- **Frontend**: Visually inspect the "City" tab in the Search Overlay. Verify text position, gradient, and the "Vị trí khác" grid.

### Dependencies

- Blocked by: None
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/repository/event_repository.go` | 1 | Backend filter logic |
| 2 | `cmd/seed/main.go` | 1 | Testing data |
| 3 | `frontend/src/components/common/SearchOverlay.jsx` | 1 | UI redesign |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Targeted changes to UI and a single repository method. Low impact on core systems. |

## Execution Profile

```
Execution Profile:
- Total phases: 1
- Parallelizable phases: 0
- Sequential-only phases: 1
- Estimated parallel wall time: 10m
- Estimated sequential wall time: 10m

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
