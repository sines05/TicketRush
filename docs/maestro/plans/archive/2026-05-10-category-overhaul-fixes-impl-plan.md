---
title: "Category Overhaul Fixes Implementation Plan"
design_ref: "/home/son/.gemini/tmp/ticketrush/798b7daf-148e-4146-85dd-10511f7bfb00/plans/2026-05-10-category-overhaul-fixes-design.md"
created: "2026-05-10T18:15:00Z"
status: "approved"
total_phases: 2
estimated_files: 5
task_complexity: "medium"
---

# Category Overhaul Fixes Implementation Plan

## Plan Overview

- **Total phases**: 2
- **Agents involved**: `data_engineer`, `coder`
- **Estimated effort**: Medium. Coordinated changes across database schema, backend seed data, and frontend components to switch from localized strings to stable keys.

## Dependency Graph

```
[Phase 1: Database & Backend Fixes]
       |
[Phase 2: Frontend Consistency]
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Schema and Data |
| 2     | Phase 2 | Sequential | 1 | UI and API Integration |

## Phase 1: Database & Backend Fixes

### Objective
Migrate existing category labels to keys in the database and update backend configurations (models and seeder) to generate key-based data natively.

### Agent: data_engineer
### Parallel: No

### Files to Create
- `migrations/000014_migrate_category_labels_to_keys.up.sql` — Convert existing Vietnamese labels to English keys.
- `migrations/000014_migrate_category_labels_to_keys.down.sql` — Rollback for safety.

### Files to Modify
- `internal/models/event.go` — Change default category from `'Nhạc sống'` to `'music_festival'`.
- `cmd/seed/main.go` — Update `categories` slice to use keys (`music_festival`, `sports`, `arts_stage`, etc.). Update the static events at the beginning of the seeder to use keys instead of labels.

### Implementation Details
- **Migration**: 
  - `UPDATE events SET category = 'music_festival' WHERE category IN ('Âm nhạc & Lễ hội', 'Nhạc sống');`
  - `UPDATE events SET category = 'sports' WHERE category IN ('Thể thao', 'Thể Thao');`
  - `UPDATE events SET category = 'arts_stage' WHERE category = 'Sân khấu & Nghệ thuật';`
  - `UPDATE events SET category = 'education_workshop' WHERE category IN ('Hội thảo & Giáo dục', 'Hội thảo & Workshop');`
  - `UPDATE events SET category = 'experience_entertainment' WHERE category IN ('Giải trí & Trải nghiệm', 'Tham quan & Trải nghiệm');`
  - `UPDATE events SET category = 'other' WHERE category IN ('Cộng đồng & Khác', 'Khác');`

### Validation
- `go run cmd/seed/main.go`
- Inspect database or print sample event to ensure the category field holds a key.

### Dependencies
- Blocked by: None
- Blocks: 2

## Phase 2: Frontend Consistency

### Objective
Update all frontend components to render labels dynamically while transmitting raw keys for filtering and creation.

### Agent: coder
### Parallel: No

### Files to Modify
- `frontend/src/services/eventService.js` — Update the mock `EVENTS` array to use category keys (e.g., `music_festival` instead of `Âm nhạc & Lễ hội`).
- `frontend/src/pages/Admin/EventForm.jsx` — Stop mapping category keys to labels on submit. Ensure the raw key is sent in the API payload.
- `frontend/src/components/home/EventCard.jsx` — Ensure the category badge uses `getCategoryLabel(event.category)`.
- `frontend/src/pages/Customer/SearchResults.jsx` — Ensure `SearchResultCard` uses `getCategoryLabel(event.category)`.

### Implementation Details
- In `EventForm.jsx` (line ~451), change the submission logic to use `data.category` directly rather than invoking a label lookup before posting to the backend.
- In `eventService.js`, the static events array needs its `category` property changed to the corresponding keys.

### Validation
- `cd frontend && npm run build`
- `npx eslint frontend/src` (Optional, depending on linter setup)

### Dependencies
- Blocked by: 1
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `migrations/000014_migrate_category_labels_to_keys.up.sql` | 1 | Update existing records to keys |
| 2 | `migrations/000014_migrate_category_labels_to_keys.down.sql` | 1 | Rollback to labels |
| 3 | `internal/models/event.go` | 1 | Set default to key |
| 4 | `cmd/seed/main.go` | 1 | Generate mock data using keys |
| 5 | `frontend/src/services/eventService.js` | 2 | Sync mock data with keys |
| 6 | `frontend/src/pages/Admin/EventForm.jsx` | 2 | Stop mapping keys to labels before API call |
| 7 | `frontend/src/components/home/EventCard.jsx` | 2 | Ensure dynamic label rendering |
| 8 | `frontend/src/pages/Customer/SearchResults.jsx` | 2 | Ensure dynamic label rendering |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | HIGH | Database migrations carry inherent risk. The `IN` clauses mitigate the risk of missing variations of the previous labels. |
| 2 | LOW | Standard React property updates and form payload adjustments. |

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