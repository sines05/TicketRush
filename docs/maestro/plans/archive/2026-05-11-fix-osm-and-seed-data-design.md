---
title: "Fix OSMLocation Crash & Enrich Seed Data"
created: "2026-05-11T00:00:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Fix OSMLocation Crash & Enrich Seed Data Design Document

## Problem Statement

The transition to OpenStreetMap introduced a runtime crash due to missing coordinate data in the backend seeder. When an event lacks latitude and longitude, `event.latitude` and `event.longitude` resolve to `undefined` on the frontend. The `EventDetail` page passes these as an object `{ lat: undefined, lng: undefined }` to `OSMLocation`, bypassing default fallbacks. `OSMLocation` then attempts to call `.toFixed()` on these undefined values within its Popup component, causing the page to crash. Furthermore, the backend `Event` model uses primitive `float64` for coordinates, which cannot distinguish between exactly `0.0` (Equator/Prime Meridian) and a missing value. Finally, the seed data lacks geographic diversity and realism.

## Requirements

### Functional Requirements

1. **REQ-1**: Prevent `OSMLocation` from crashing when `lat` or `lng` properties are undefined.
2. **REQ-2**: `EventDetail` must only attempt to render `OSMLocation` or pass an `initialLocation` object if both `latitude` and `longitude` are present and valid.
3. **REQ-3**: The `OSMLocation` synchronization hook must validate incoming coordinate data before overwriting its internal state.
4. **REQ-4**: The backend `Event` model must differentiate between `0.0` and missing coordinates.
5. **REQ-5**: The database seeder (`cmd/seed/main.go`) must generate diverse, realistic coordinate pairs corresponding to Vietnamese cities for all seeded events.

### Non-Functional Requirements

1. **REQ-N1**: Stability: The map component must gracefully fall back to a default center or an empty state without throwing JavaScript exceptions.

### Constraints

- **CON-1**: Seed data modifications must respect the existing test setups (if any rely on specific seed IDs, though this seems to be a generic seed script).

## Approach

### Selected Approach

**Full-Stack Coordinate Validation & Seed Enrichment**

We will implement safe-access guards on the frontend, fix the backend data types, and significantly upgrade the seed data.
- **Frontend Safety** — *[Using optional chaining (`?.`) in `OSMLocation` and strict prop-checking in `EventDetail` prevents the UI from crashing on missing data, satisfying REQ-1, REQ-2, REQ-3, and REQ-N1]* (Traces To: REQ-1, REQ-2, REQ-3, REQ-N1).
- **Backend Model Accuracy** — *[Changing `Latitude` and `Longitude` to `*float64` in the Go model allows the system to return `null` instead of `0.0` when data is missing, satisfying REQ-4]* (Traces To: REQ-4) *(considered: leaving as float64 and assuming 0.0 means missing — rejected because 0.0 is a valid geographic coordinate)*.
- **Seed Data Realism** — *[Updating `cmd/seed/main.go` to include a dictionary of major Vietnamese cities with their actual lat/lng coordinates ensures the frontend maps always have valid, diverse data to render, satisfying REQ-5]* (Traces To: REQ-5).

### Alternatives Considered

#### Frontend Only Catch
- **Description**: Only add null checks in React components.
- **Pros**: Very fast to implement.
- **Cons**: Conflates "missing" data with `0.0` on the backend, and map data remains geographically meaningless.
- **Rejected Because**: It masks the underlying data quality issue and leaves the development environment in a poor state.

### Decision Matrix

| Criterion | Weight | Full-Stack Validation | Frontend Only Catch |
|-----------|--------|-----------------------|---------------------|
| System Stability | 40% | 5: Prevents bad data at source & destination | 3: Prevents crash, but data remains ambiguous |
| Data Accuracy | 30% | 5: `*float64` allows true NULL representation | 1: `0.0` conflates "missing" with Null Island |
| Dev Speed | 30% | 3: Requires minor model and seed updates | 5: Very fast, just `?.` in TSX |
| **Weighted Total** | | **4.4** | **2.9** |

## Architecture

### Component Updates

```text
Backend Layer
├── internal/models/event.go (Change Latitude/Longitude to *float64)
└── cmd/seed/main.go (Add diverse coordinate dictionary and apply to seeds)

Frontend Layer
├── frontend/src/components/Maps/OSMLocation.tsx (Add null checks and optional chaining)
└── frontend/src/pages/Customer/EventDetail.jsx (Conditionally pass initialLocation)
```

### Data Flow Rationale

1. **Model Layer**: By making coordinates pointers (`*float64`), the JSON serialization will correctly emit `null` when a value is not provided, allowing the frontend to distinguish between "missing data" and actual coordinates `(0,0)`.
2. **Seed Layer**: The seeder will randomly select from a predefined list of Vietnamese cities (Hanoi, HCMC, Da Nang, etc.) and assign the corresponding valid `lat` and `lng` pointers to the event seeds.
3. **Frontend Integration**: `EventDetail.jsx` will check if `event.latitude != null && event.longitude != null`. If so, it passes `{ lat, lng }`; otherwise, it omits the prop, allowing `OSMLocation` to fall back to `DEFAULT_CENTER`. `OSMLocation`'s Popup will use `position.lat?.toFixed(4) ?? '0.0000'` as a final fail-safe.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | data_engineer | No  | Update Event model and rewrite the seeder logic. |
| 2     | coder         | No  | Add safety guards to OSMLocation and EventDetail. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Pointer dereference panics in Go | MEDIUM | LOW | Ensure all backend code checking latitude/longitude handles `nil` pointers correctly. |
| Seeder fails due to invalid coordinate types | LOW | LOW | Use helper functions to safely assign float64 addresses. |

## Success Criteria

1. **SC-1**: The Event Detail page renders without crashing, even if an event has missing coordinates.
2. **SC-2**: The `OSMLocation` popup safely displays coordinates.
3. **SC-3**: Running `go run cmd/seed/main.go` successfully populates the database with diverse events containing valid geographic coordinates across Vietnam.
