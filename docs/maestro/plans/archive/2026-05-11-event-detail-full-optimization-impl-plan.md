---
title: "Event Detail Full Optimization Implementation Plan"
design_ref: "docs/maestro/plans/2026-05-11-event-detail-full-optimization-design.md"
created: "2026-05-11T00:00:00Z"
status: "approved"
total_phases: 2
estimated_files: 11
task_complexity: "complex"
---

# Event Detail Full Optimization Implementation Plan

## Plan Overview

- **Total phases**: 2
- **Agents involved**: data_engineer, coder
- **Estimated effort**: Moderate complexity full-stack update with schema changes and UI polish.

## Dependency Graph

```text
Phase 1: Backend & Data Foundation (Models, Repositories, Handlers)
    │
    ▼
Phase 2: Frontend UI & API Integration
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Data layer first |
| 2     | Phase 2 | Sequential | 1 | Integration second |

## Phase 1: Backend & Data Foundation

### Objective
Resolve the critical review bug and augment the event model with required metadata fields.

### Agent: data_engineer
### Parallel: No

### Files to Modify
- `internal/models/event.go`: Add `OrganizerMeta JSONMap` and `EventMeta JSONMap`.
- `internal/handler/review_handler.go`: Fix `CreateReview` context extraction; properly handle error from `GetAverageRating`.
- `internal/repository/event_repository.go`: Implement `GetSimilarEvents(ctx, category, limit, excludeID)`.
- `internal/handler/event_handler.go`: Implement `GetSimilarEvents` endpoint.
- `cmd/server/main.go` (or wherever routes are): Register `GET /api/v1/events/:id/similar`.

### Files to Create
- `migrations/000015_add_event_metadata.up.sql`: Add `organizer_meta` and `event_meta` JSONB columns to `events`.
- `migrations/000015_add_event_metadata.down.sql`: Drop the columns.

### Implementation Details
- In `CreateReview`, use `u, _ := c.Get("user"); user := u.(*models.User); userID := user.ID`.
- Migration: `ALTER TABLE events ADD COLUMN organizer_meta JSONB DEFAULT '{}'; ALTER TABLE events ADD COLUMN event_meta JSONB DEFAULT '{}';`
- Repository: `GetSimilarEvents` should return `[]models.Event` filtering by category and status, excluding the current event.

### Validation
- `go vet ./...`
- Manual check: Submit a review with a valid token and verify no FK error.

### Dependencies
- Blocked by: None
- Blocks: Phase 2

---

## Phase 2: Frontend UI & API Integration

### Objective
Restore visual clarity and link UI components to the new backend fields and API.

### Agent: coder
### Parallel: No

### Files to Modify
- `frontend/src/index.css`: Update `.bg-surface` blur to `12px`.
- `frontend/src/pages/Customer/EventDetail.jsx`: Global change `border-white/5` to `border-white/15`.
- `frontend/src/components/EventDetail/IntroductionSection.jsx`: Ensure `border-white/15` is used.
- `frontend/src/components/EventDetail/ReviewSection.jsx`: Update user name map to `r.user?.full_name`.
- `frontend/src/services/eventService.js`: Update `getSimilarEvents` to call the new backend endpoint `/api/v1/events/${id}/similar`.

### Implementation Details
- Ensure all sections in `EventDetail.jsx` use the increased border contrast.
- In `eventService.js`, remove mock logic for similar events.

### Validation
- `npm run build`
- `npm run lint`

### Dependencies
- Blocked by: Phase 1
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/models/event.go` | 1 | Schema definition |
| 2 | `migrations/000015_add_event_metadata.up.sql` | 1 | DB Migration |
| 3 | `internal/handler/review_handler.go` | 1 | Logic fix |
| 4 | `internal/repository/event_repository.go` | 1 | Similarity logic |
| 5 | `internal/handler/event_handler.go" | 1 | API Endpoint |
| 6 | `frontend/src/index.css` | 2 | UI Polish (Blur) |
| 7 | `frontend/src/pages/Customer/EventDetail.jsx` | 2 | UI Polish (Borders) |
| 8 | `frontend/src/components/EventDetail/ReviewSection.jsx` | 2 | Mapping fix |
| 9 | `frontend/src/services/eventService.js` | 2 | API Integration |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | MEDIUM | Schema migration requires DB access and coordination. |
| 2 | LOW | Pure UI and wiring fixes. |

## Execution Profile

```text
Execution Profile:
- Total phases: 2
- Parallelizable phases: 0
- Sequential-only phases: 2
- Estimated parallel wall time: N/A
- Estimated sequential wall time: 2 x ~20 mins = 40 mins

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
