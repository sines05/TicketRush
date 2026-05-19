---
title: "Fix Past Event Handling Implementation Plan"
design_ref: "docs/maestro/plans/2026-05-17-fix-past-event-handling-design.md"
created: "2026-05-17T00:00:00Z"
status: "draft"
total_phases: 3
estimated_files: 8
task_complexity: "medium"
---

# Fix Past Event Handling Implementation Plan

## Plan Overview

- **Total phases**: 3
- **Agents involved**: coder, tester
- **Estimated effort**: Medium. Spans across backend filtering, queue logic, and frontend UI synchronization.

## Dependency Graph

```
Phase 1: Backend Filtering (Repo & Search)
    |
Phase 2: Queue Validation (JoinQueue)
    |
Phase 3: Frontend UI Sync
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1, 2 | Sequential | 1 | Backend logic and validation |
| 2     | Phase 3 | Sequential | 1 | Frontend UI updates |

## Phase 1: Backend Event Filtering

### Objective
Filter out past events from high-visibility homepage sections and provide a clean "upcoming" default for the Search API.

### Agent: coder
### Parallel: No

### Files to Modify

- `internal/repository/event_repository.go` — Update `GetFeaturedEvents` and `GetHeroEvents` to filter by `start_time > now`.
- `internal/handler/event_handler.go` — Update `ListEvents` to default `filter.DateFrom` to `now` if no date filters are provided.

### Implementation Details
- In `event_repository.go`: Append `.Where("start_time > ?", time.Now().UTC())` to GORM queries.
- In `event_handler.go`: Check `if filter.DateFrom == nil && filter.DateTo == nil { now := time.Now().UTC(); filter.DateFrom = &now }`.

### Validation
- `go test ./internal/repository/...`
- `go test ./internal/handler/...`
- Manual verification: Search `/api/v1/events` and verify no past events are returned by default.

### Dependencies
- Blocked by: None
- Blocks: Phase 2, 3

---

## Phase 2: Queue Validation

### Objective
Prevent users from joining the virtual queue for events that have already started.

### Agent: coder
### Parallel: No

### Files to Modify

- `internal/queue/service.go` — Add event start time validation in `JoinQueue`.

### Implementation Details
- In `internal/queue/service.go`: Fetch the event using `eventRepo.GetEventByID`. If `event.StartTime.Before(time.Now().UTC())`, return a new error `utils.ErrEventAlreadyStarted`.

### Validation
- `go test ./internal/tests/queue_logic_test.go`
- Manual verification: Attempt to call `JoinQueue` for a past event and confirm `400 Bad Request` or appropriate error response.

### Dependencies
- Blocked by: Phase 1
- Blocks: Phase 3

---

## Phase 3: Frontend UI Synchronization

### Objective
Globally disable booking buttons and provide visual feedback for past events on the Event Detail page.

### Agent: coder
### Parallel: No

### Files to Modify

- `frontend/src/pages/Customer/EventDetail.jsx` — Compute `isPast` and pass it to child components.
- `frontend/src/components/EventDetail/HeroSection.jsx` — Disable "Mua vé ngay" button based on `isPast`.
- `frontend/src/components/EventDetail/ScheduleSection.jsx` — Disable "Chọn" buttons based on `isPast`.
- `frontend/src/components/EventDetail/StickyActionBar.jsx` — Disable "Mua vé ngay" button based on `isPast`.

### Implementation Details
- `EventDetail.jsx`: `const isPast = event && new Date(event.start_time) < new Date();`.
- Update each component to handle the `isPast` prop, changing button styles (disabled state) and text to "Sự kiện đã kết thúc".

### Validation
- `npm run lint` in frontend directory.
- Manual verification: Open a past event in the browser, verify all booking buttons are disabled and correctly labeled.

### Dependencies
- Blocked by: Phase 2
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/repository/event_repository.go` | 1 | Filter past events in featured/hero methods |
| 2 | `internal/handler/event_handler.go` | 1 | Default Search API to upcoming events |
| 3 | `internal/queue/service.go` | 2 | Add cutoff logic to JoinQueue |
| 4 | `frontend/src/pages/Customer/EventDetail.jsx` | 3 | Orchestrate `isPast` status |
| 5 | `frontend/src/components/EventDetail/HeroSection.jsx` | 3 | Disable button for past events |
| 6 | `frontend/src/components/EventDetail/ScheduleSection.jsx` | 3 | Disable buttons for past events |
| 7 | `frontend/src/components/EventDetail/StickyActionBar.jsx` | 3 | Disable button for past events |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | LOW | Straightforward GORM filters. |
| 2 | MEDIUM | Adding repository calls to the queue service might slightly increase latency, but it's necessary for validation. |
| 3 | LOW | UI-only changes, but requires passing props through several layers. |

## Execution Profile

```
Execution Profile:
- Total phases: 3
- Parallelizable phases: 0
- Sequential-only phases: 3
- Estimated wall time: ~45 minutes

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
