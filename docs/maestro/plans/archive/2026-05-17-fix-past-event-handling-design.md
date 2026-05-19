---
title: "Fix Past Event Handling"
created: "2026-05-17T00:00:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Fix Past Event Handling Design Document

## Problem Statement

Currently, the system lacks a unified strategy for handling past events. Past events appear in high-visibility sections (Featured, Hero), users can join virtual queues for them, and the frontend allows ticket purchases for events that have already started. Furthermore, the search API does not filter out past events by default.

## Requirements

### Functional Requirements

1. **REQ-1**: `GetFeaturedEvents` and `GetHeroEvents` must only return events where `start_time` is in the future.
2. **REQ-2**: The `JoinQueue` function must reject requests to join the queue for events that have already started (Strict Cutoff).
3. **REQ-3**: The frontend `HeroSection`, `ScheduleSection`, and Sidebar must disable the "Buy Tickets" button and display "Sự kiện đã kết thúc" for past events.
4. **REQ-4**: The `ListEvents` API must default to returning only upcoming events unless specific date filters are provided, aligning with both the frontend and the AI Agent's default behavior.

### Non-Functional Requirements

1. **REQ-5**: Time comparisons must consistently use UTC to prevent edge cases around timezone offsets.

### Constraints

- The AI Agent (`ai-agent/tools.py`) currently calls the search API without date parameters and expects relevant upcoming events by default.

## Approach

### Selected Approach

**Upcoming Default & Strict Cutoff Strategy**

We will implement a targeted strategy across the stack to filter out past events and prevent booking for them.

- **Backend Repositories**: Update `GetFeaturedEvents` and `GetHeroEvents` to append `.Where("start_time > ?", time.Now().UTC())`. — *Ensures past events do not occupy valuable prime real estate on the homepage.*
- **Backend Queue**: In `JoinQueue`, fetch the event and reject the request if `event.StartTime` is in the past compared to `time.Now().UTC()`. — *Provides a strict server-side cutoff, preventing zombie queue sessions.*
- **Backend Search API**: In `ListEvents`, explicitly set `filter.DateFrom` to `time.Now().UTC()` if both `date_from` and `date_to` are empty. — *Aligns the default search behavior with user expectations and supports the existing AI Agent tools without modifications.*
- **Frontend UI**: Calculate an `isPast = new Date(mappedEvent.startTime) < new Date()` boolean in `EventDetail.jsx`. Pass this state to all child components (`HeroSection`, `ScheduleSection`, `StickyActionBar`) to globally disable booking buttons and change their text to "Sự kiện đã kết thúc". — *Ensures a consistent user experience and prevents user frustration.*

### Alternatives Considered

#### Grace Period for Cutoff
- **Description**: Allow a 15-minute grace period after `start_time` for late bookings.
- **Pros**: Accommodates late-arriving users.
- **Cons**: Can lead to state inconsistencies with check-in processes.
- **Rejected Because**: The user explicitly preferred a "Strict Cutoff" to maintain strong guarantees.

#### Query Parameter Defaulting for Search
- **Description**: Add `?status=upcoming` to frontend API calls instead of a backend hardcoded default.
- **Pros**: Keeps the backend API purely declarative.
- **Cons**: Requires updating the LangGraph AI Agent tools, which currently do not pass status flags.
- **Rejected Because**: Implementing the default in the backend ensures both the web app and the AI Agent cleanly filter out past events without requiring cross-service modifications.

### Decision Matrix

| Criterion | Weight | Upcoming Default & Strict Cutoff | Grace Period & Frontend Query |
|-----------|--------|----------------------------------|-------------------------------|
| Security & Consistency | 40% | 5: Strict cutoff prevents edge cases | 3: Grace period creates gray areas |
| AI Agent Compatibility | 40% | 5: Works perfectly with existing tools | 2: Requires updating python tools |
| User Experience | 20% | 4: Clear "ended" UI and clean search | 4: Accommodates late users but complex UI |
| **Weighted Total** | | 4.8 | 2.8 |

## Architecture

### Component Updates

```
[Frontend - EventDetail.jsx]
  |
  +-- Computes `isPast`
  +-- Passes to HeroSection, ScheduleSection, StickyActionBar

[Backend - EventHandler]
  |
  +-- ListEvents: Injects `DateFrom = now` if empty

[Backend - QueueService]
  |
  +-- JoinQueue: Validates `event.StartTime > now`

[Backend - EventRepository]
  |
  +-- GetFeaturedEvents: Filters `start_time > now`
  +-- GetHeroEvents: Filters `start_time > now`
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | Backend and Frontend logic updates |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Search API excludes events happening today if timezone logic is misaligned | MEDIUM | LOW | Ensure all backend time comparisons use `.UTC()` strictly. The frontend must also parse dates considering UTC offsets. |
| AI Agent fails to find specific past events when explicitly asked | LOW | MEDIUM | If the AI Agent needs past events, it can be updated in the future to pass `?date_to=now`. For now, defaulting to upcoming aligns with 95% of user intents. |
| Users currently on the page when the event starts might still see the enabled button | LOW | LOW | The backend `JoinQueue` cutoff provides a second layer of defense. Even if the frontend button is clicked, the backend will reject the request. |

## Success Criteria

1. Past events no longer appear in the "Featured" or "Hero" carousels on the homepage.
2. A search without date parameters (`/api/v1/events`) returns only upcoming events.
3. Attempting to call `JoinQueue` for a past event returns an error.
4. On the frontend Event Detail page, all "Mua vé ngay" buttons display "Sự kiện đã kết thúc" and are unclickable if the event has started.
