---
title: "Event Detail Full Optimization"
created: "2026-05-11T00:00:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "complex"
---

# Event Detail Full Optimization Design Document

## Problem Statement

The previous code review identified 7 issues across the backend and frontend. A critical backend error (`reviews_user_id_fkey`) prevents users from submitting reviews because the `ReviewHandler` retrieves the user ID incorrectly. Additionally, the `Event` model lacks fields (Organizer, Showtimes, Metadata) required by the UI, causing components to fall back to mock data or display empty. Visually, the UI appears "dim" and "blurry" due to insufficient backdrop blur (`blur(4px)`) and invisible borders (`border-white/5`). Finally, the recommendations feature lacks a proper server-side endpoint.

## Requirements

### Functional Requirements

1. **REQ-1**: `ReviewHandler` must retrieve the `user_id` correctly from the gin context to fix the foreign key violation.
2. **REQ-2**: The `Event` backend model must be updated to include `Organizer`, `Showtimes`, and `Metadata` fields (using JSONB or new columns) to support the UI.
3. **REQ-3**: The `ReviewSection` component must correctly map the user's name from `r.user.full_name` instead of `r.user_name`.
4. **REQ-4**: A new backend endpoint `/api/v1/events/:id/similar` must be implemented to fetch recommended events.
5. **REQ-5**: Unhandled errors in `GetAverageRating` must be logged and handled gracefully.

### Non-Functional Requirements

1. **REQ-N1**: UI Polish: Update `.bg-surface` blur to `12px` and increase border opacity to at least `white/15` to resolve "dimness".

### Constraints

- **CON-1**: Avoid creating complex new database tables for Organizer/Metadata if a simple JSONB column (`LayoutMeta` or a new `EventMeta`) suffices for the current scope.

## Approach

### Selected Approach

**Targeted Full-Stack Fixes**

We will implement precise fixes across the backend, frontend, and database schema layers.
- **Backend Fixes** — *[Extract user object via `c.Get("user")` and cast to `*models.User` to resolve the critical FK bug, satisfying REQ-1]* (Traces To: REQ-1).
- **Data Model Augmentation** — *[Add `EventMeta JSONMap` and `OrganizerMeta JSONMap` to the `Event` model and database schema via a new migration. This allows flexible storage for showtimes, authors, directors, and organizer info without complex table joins, satisfying REQ-2 and CON-1]* (Traces To: REQ-2, CON-1) *(considered: separate tables for Organizers and Showtimes — rejected because it requires extensive repository rewrites and is disproportionate to the current read-heavy UI needs)*.
- **UI & Mapping Polish** — *[Increase CSS blur, border opacities, and update the review name mapping to `r.user.full_name` to restore visual clarity and data correctness, satisfying REQ-3 and REQ-N1]* (Traces To: REQ-3, REQ-N1).
- **Recommendations API** — *[Implement a `GetSimilarEvents` repository method and handler (fetching events in the same category) to feed the frontend, satisfying REQ-4]* (Traces To: REQ-4).

### Alternatives Considered

#### New Relational Tables for Organizers and Showtimes
- **Description**: Create full SQL tables for Organizers and Showtimes, linking them via foreign keys.
- **Pros**: Strict schema, easier to query independently.
- **Cons**: High overhead for joins, requires significant repository rewrites.
- **Rejected Because**: It requires extensive repository rewrites and is disproportionate to the current read-heavy UI needs.

### Decision Matrix

| Criterion | Weight | JSONB Columns (EventMeta) | New Relational Tables |
|-----------|--------|---------------------------|-----------------------|
| Dev Speed | 40% | 5: Fast schema migration | 2: High overhead for joins |
| Maintainability | 30% | 4: Flexible for future metadata | 3: Strict schema, harder to evolve |
| Performance | 30% | 4: Good for read-heavy loads | 3: Additional joins required |
| **Weighted Total** | | **4.4** | **2.6** |

## Architecture

### Component Diagram

```text
Backend Layer
├── internal/models/event.go (Add OrganizerMeta, EventMeta JSONMap)
├── migrations/... (Add 000015_add_event_metadata.up.sql / .down.sql)
├── internal/handler/review_handler.go (Fix user_id context extraction, handle errors)
├── internal/repository/event_repository.go (Add GetSimilarEvents method)
└── internal/handler/event_handler.go (Add GetSimilarEvents handler endpoint)

Frontend Layer
├── frontend/src/services/eventService.js (Point getSimilarEvents to real API)
├── frontend/src/components/EventDetail/ReviewSection.jsx (Fix user.full_name map)
├── frontend/src/components/EventDetail/IntroductionSection.jsx (Fix border opacity)
├── frontend/src/pages/Customer/EventDetail.jsx (Fix border opacity)
└── frontend/src/index.css (Update blur to 12px)
```

### Data Flow

1. **Model Augmentation**: Adding `OrganizerMeta` and `EventMeta` JSONB columns to the `events` table provides a flexible, schema-less way to store varied metadata (directors, actors, organizer name/logo, showtimes) without creating a rigid relational structure that would be overkill for a read-only display.
2. **Review Fix**: Proper extraction of the user object from the Gin context ensures that the `UserID` is reliably passed to the `ReviewRepository`, preventing foreign key failures and maintaining data integrity.
3. **Similarity Engine**: Creating a dedicated backend endpoint for similar events (filtering by category and excluding the current event ID) moves the logic off the client, improving accuracy and performance.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | data_engineer | No  | Backend fixes (Models, Migrations, Repositories, Handlers) |
| 2     | coder         | No  | Frontend UI polish & Integration (CSS, Border Opacities, API Wiring) |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| JSONB migration affects existing events | LOW | LOW | Use `DEFAULT '{}'` for new JSONB columns in the migration. |
| `GetSimilarEvents` endpoint performance | MEDIUM | LOW | The query will filter by category, which should be fast, but consider adding an index if dataset grows. |

## Success Criteria

1. **SC-1**: Users can successfully submit reviews without triggering `SQLSTATE 23503`.
2. **SC-2**: The Event model successfully stores and returns Organizer and Metadata info.
3. **SC-3**: The `RecommendationsSection` fetches data from the new `/api/v1/events/:id/similar` endpoint.
4. **SC-4**: UI glassmorphism looks clean and intentional with a 12px blur and visible borders.
