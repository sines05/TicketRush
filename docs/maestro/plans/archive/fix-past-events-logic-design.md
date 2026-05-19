---
title: "Fix Past Events Logic Bugs"
created: "2026-05-17T08:12:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "complex"
---

# Fix Past Events Logic Bugs Design Document

## Problem Statement

The TicketRush platform currently lacks consistent validation and handling for events that have already taken place (past events) across both the backend and frontend. This results in several critical and UX-impacting issues:
1. **Critical Security/Business Logic Flaw**: The backend `OrderService` does not validate the `EndTime` of an event during `LockSeats` and `Checkout`, allowing users to purchase tickets for events that have already concluded via direct API calls.
2. **Review Integrity**: The `ReviewHandler` allows users to submit reviews for events that have not yet started.
3. **Misleading Discovery**: Past events continue to appear in "Trending" statistics and "This Month" discovery tabs, cluttering the UI and leading users to unbookable events.
4. **Confusing Frontend UX**: The event detail page incorrectly uses `StartTime` instead of `EndTime` to determine if an event is past, blocking sales prematurely for multi-day events. Additionally, purchased tickets lack date information and an "Ended" status indicator.

## Requirements

### Functional Requirements

1. **REQ-1**: Prevent ticket purchases for ended events at the backend level (`LockSeats` and `Checkout`).
2. **REQ-2**: Allow reviews only after an event's `StartTime`.
3. **REQ-3**: Filter ended events from "Trending" and "This Month" lists.
4. **REQ-4**: Correct frontend `isPast` logic to use `EndTime`.
5. **REQ-5**: Update ticket UI to show event dates and "Ended" status.

### Non-Functional Requirements

1. **REQ-N1**: Existing pending orders for events that just ended should be gracefully rejected at checkout.

### Constraints

- Real-time time comparisons must be used instead of background state updates.

## Approach

### Selected Approach

**Targeted Full-Stack Remediation**

We will apply precise fixes across the affected layers:
- **Backend**: Inject `time.Now().After(event.EndTime)` checks into `order_service.go` (`LockSeats` and `Checkout`), returning a new error. Update `review_handler.go` to enforce the `StartTime` constraint. Update `GetTrendingTicketStats` in `event_repository.go` to add `WHERE e.end_time > ?` (using the current time).
- **Frontend**: In `EventDetail.jsx`, update the `isPast` memo to compare against `endTime`. In `EventListWithTabs.jsx`, adjust the `dateFilter` for the "month" tab to use `new Date()` instead of `startOfMonth`. In `TicketItem.jsx`, surface the event date and add conditional styling for past events.

### Alternatives Considered

#### Scheduled Job for Event Status

- **Description**: Running a cron job to mark events as 'CLOSED' in the database.
- **Pros**: Explicit status column makes queries simpler.
- **Cons**: Adds unnecessary state management overhead and potential sync issues.
- **Rejected Because**: Real-time time comparisons are sufficient, simpler to implement, and avoid background job complexity.

## Architecture

### Component Diagram

```
[Frontend UI]
  |
  +-- Event Detail (Checks EndTime instead of StartTime)
  |
  +-- Ticket Item (Displays "Ended" status based on EndTime)
  |
  +-- Home Discovery (Requests events from 'now' instead of start of month)
  |
[Backend API]
  |
  +-- ReviewHandler (Rejects reviews if Now < StartTime)
  |
  +-- OrderService (Rejects LockSeats/Checkout if Now > EndTime)
  |
[Database / Repo]
  |
  +-- EventRepository (Trending queries filter out EndTime < Now)
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | Backend and Frontend logic fixes |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Blocking valid sales | HIGH | LOW | Ensure frontend `isPast` correctly uses `EndTime` and properly parses ISO8601 strings. Test multi-day event boundary conditions. |
| DB Query Performance | LOW | LOW | The `end_time > ?` filter in `GetTrendingTicketStats` utilizes the existing index (assuming start_time/end_time are indexed, or adds minimal overhead). |
| Existing pending orders| MEDIUM | LOW | Orders already in the queue before the fix is deployed will be caught by the new `Checkout` validation and rejected cleanly if the event has ended. |

## Success Criteria

1. Direct API calls to `LockSeats` or `Checkout` for an event where `EndTime` is in the past return a structured error (`EVENT_ALREADY_ENDED`).
2. Reviews submitted before an event's `StartTime` are rejected.
3. The "Trending" backend endpoint and "This Month" frontend tab no longer return/request events where `EndTime` is in the past.
4. The frontend Event Detail page remains bookable until `EndTime`.
5. The `TicketItem` UI successfully displays the "Đã kết thúc" (Ended) badge and event date for past tickets.