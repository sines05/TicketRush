---
title: "Fix OSMLocation Crash & Enrich Seed Data Implementation Plan"
design_ref: "docs/maestro/plans/2026-05-11-fix-osm-and-seed-data-design.md"
created: "2026-05-11T00:00:00Z"
status: "approved"
total_phases: 2
estimated_files: 4
task_complexity: "medium"
---

# Fix OSMLocation Crash & Enrich Seed Data Implementation Plan

## Plan Overview

- **Total phases**: 2
- **Agents involved**: data_engineer, coder
- **Estimated effort**: Moderate. Requires Go model changes, a seeder rewrite, and React safety guards.

## Dependency Graph

```text
Phase 1: Backend & Data Foundation (Models & Seeder)
    │
    ▼
Phase 2: Frontend Safety & Integration
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Schema-aware model update |
| 2     | Phase 2 | Sequential | 1 | UI fail-safes |

## Phase 1: Backend & Data Foundation

### Objective
Update the `Event` model to support nullable coordinates and enhance the seeder with realistic Vietnamese geographic data.

### Agent: data_engineer
### Parallel: No

### Files to Modify

- `internal/models/event.go`: Change `Latitude` and `Longitude` fields from `float64` to `*float64` in the `Event` struct.
- `cmd/seed/main.go`:
  - Implement a `cities` map containing coordinates for major cities (Hanoi, HCMC, Da Nang, etc.).
  - Update the event seeding loop to randomly assign a city and its coordinates to each event.
  - Ensure coordinates are passed as pointers using a helper function like `func floatPtr(f float64) *float64 { return &f }`.

### Implementation Details
- In `Event` struct:
  ```go
  Latitude  *float64 `gorm:"type:decimal(10,8)" json:"latitude"`
  Longitude *float64 `gorm:"type:decimal(11,8)" json:"longitude"`
  ```
- In `cmd/seed/main.go`, add varied events and ensure every event created has valid coordinates.

### Validation
- Run `go build ./...` to check for pointer-related compiler errors.
- Run `go run cmd/seed/main.go` and verify it completes without errors.

### Dependencies
- Blocked by: None
- Blocks: Phase 2

---

## Phase 2: Frontend Safety & Integration

### Objective
Implement safety guards in the map component and its parent to prevent crashes on missing or invalid data.

### Agent: coder
### Parallel: No

### Files to Modify

- `frontend/src/components/Maps/OSMLocation.tsx`:
  - Add optional chaining in the `Popup` component: `{position.lat?.toFixed(4) ?? '0.0000'}`.
  - In the `useEffect` sync hook, add validation: `if (initialLocation && typeof initialLocation.lat === 'number' && typeof initialLocation.lng === 'number')`.
- `frontend/src/pages/Customer/EventDetail.jsx`:
  - Before rendering `OSMLocation`, check if `event.latitude` and `event.longitude` are present.
  - Only pass `initialLocation` if the data is valid.

### Implementation Details
- Ensure `OSMLocation` handles cases where `initialLocation` might be partially defined or `null`.

### Validation
- `npm run lint`
- `npm run build`

### Dependencies
- Blocked by: Phase 1
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/models/event.go` | 1 | Model update |
| 2 | `cmd/seed/main.go` | 1 | Seeder upgrade |
| 3 | `frontend/src/components/Maps/OSMLocation.tsx` | 2 | UI safety |
| 4 | `frontend/src/pages/Customer/EventDetail.jsx` | 2 | Integration guard |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | MEDIUM | Pointer changes in Go models can cause nil pointer dereference panics if not audited across the backend. |
| 2 | LOW | Standard React null checking. |

## Execution Profile

```
Execution Profile:
- Total phases: 2
- Parallelizable phases: 0
- Sequential-only phases: 2
- Estimated parallel wall time: N/A
- Estimated sequential wall time: 40 mins

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
