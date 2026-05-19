---
title: "Fix Past Events Logic Implementation Plan"
design_ref: "/home/son/.gemini/tmp/ticketrush/25b8ec3e-84c8-4c8c-bbb7-1012dc814eb0/plans/fix-past-events-logic-design.md"
created: "2026-05-17T08:20:00Z"
status: "draft"
total_phases: 2
estimated_files: 7
task_complexity: "complex"
---

# Fix Past Events Logic Implementation Plan

## Plan Overview

- **Total phases**: 2
- **Agents involved**: coder
- **Estimated effort**: Medium-low. The fixes are targeted at specific boundary conditions across the stack.

## Dependency Graph

```
       Start
      /     \
[Phase 1] [Phase 2]
      \     /
        End
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | 1, 2   | Parallel  | 1 (coder x2)| Independent backend and frontend fixes |

## Phase 1: Backend Logic Fixes

### Objective
Implement `EndTime` validation in the ordering flow, ensure reviews require the event to have started, and hide past events from trending stats.

### Agent: coder
### Parallel: Yes

### Files to Modify

- `internal/utils/errors.go` — Add `ErrEventAlreadyEnded`.
- `internal/service/order_service.go` — In `LockSeats` and `Checkout`, add `time.Now().After(event.EndTime)` check.
- `internal/handler/review_handler.go` — In `CreateReview`, fetch the event and reject if `time.Now().Before(event.StartTime)`.
- `internal/repository/event_repository.go` — In `GetTrendingTicketStats`, modify the base WHERE clause to include `e.end_time > ?`.

### Implementation Details

Ensure the order of operations in `LockSeats` catches the `EndTime` error before modifying DB state. For `review_handler.go`, we will need to fetch the event via `eventRepo` first to check `StartTime` since the handler only receives the `EventID` in the request body.

### Validation

- `go test ./internal/tests/...`
- `go build ./...`

### Dependencies

- Blocked by: None
- Blocks: None

---

## Phase 2: Frontend UI Fixes

### Objective
Correct the `isPast` logic, update default discovery dates, and clearly display past event status on purchased tickets.

### Agent: coder
### Parallel: Yes

### Files to Modify

- `frontend/src/pages/Customer/EventDetail.jsx` — Change `isPast` memo to use `endTime` instead of `startTime`.
- `frontend/src/components/home/EventListWithTabs.jsx` — In the `month` tab logic, set `date_from` to `format(now, 'yyyy-MM-dd')`.
- `frontend/src/components/tickets/TicketItem.jsx` — Surface the event date/time in the UI and apply an "Ended" badge style if the current date is past the event date.

### Implementation Details

Check that date string parsing works correctly with `Date` constructor for the ticket item since we'll need to pass the event end time down or infer it if it's available in the ticket DTO. 

### Validation

- `npm run lint` (in frontend directory)
- `npm run build` (in frontend directory)

### Dependencies

- Blocked by: None
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/utils/errors.go` | 1 | Define common error |
| 2 | `internal/service/order_service.go` | 1 | Enforce purchase constraints |
| 3 | `internal/handler/review_handler.go` | 1 | Enforce review constraints |
| 4 | `internal/repository/event_repository.go` | 1 | Filter trending data |
| 5 | `frontend/src/pages/Customer/EventDetail.jsx` | 2 | Fix `isPast` logic |
| 6 | `frontend/src/components/home/EventListWithTabs.jsx` | 2 | Update tab date filters |
| 7 | `frontend/src/components/tickets/TicketItem.jsx` | 2 | Enhance ticket UI for past events |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Fixes are straightforward conditional additions. |
| 2     | LOW | UI changes are localized and don't affect global state. |

## Execution Profile

```
Execution Profile:
- Total phases: 2
- Parallelizable phases: 2 (in 1 batch)
- Sequential-only phases: 0
- Estimated parallel wall time: 2 minutes
- Estimated sequential wall time: 4 minutes

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```