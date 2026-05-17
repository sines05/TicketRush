---
title: "refactor-srp-dip"
created: "2026-05-16T22:38:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Refactor SRP and DIP Violations Design Document

## Problem Statement

The system currently violates the Dependency Inversion Principle (DIP) and Single Responsibility Principle (SRP) within the event creation flow. Specifically, `internal/service/event_service.go` imports and uses `*gorm.DB` directly to orchestrate a database transaction that creates an Event, its Zones, and thousands of Seats. This tight coupling makes the service layer dependent on a specific ORM implementation, complicates unit testing, and breaks clean architecture boundaries.

## Requirements

### Functional Requirements

1. **REQ-1**: Remove all `gorm` imports and usage from `internal/service/event_service.go`.
2. **REQ-2**: Extract the complex transaction logic (creating the Event, Zones, and Seats together) into `internal/repository/event_repository.go` using a new method, such as `CreateEventWithZones`.
3. **REQ-3**: Ensure the frontend or other dependents are not negatively impacted (this is purely backend refactoring, API stability is maintained).
4. **REQ-4**: Keep the `cmd/server/main.go` wiring clean by removing `db` injection into the Event Service.

## Approach

### Selected Approach

**Repository Transaction Encapsulation**

1.  **Repository Update**: Add a method `CreateEventWithZones(ctx context.Context, event *models.Event, zoneConfigs []ZoneConfigPayload) error` to `EventRepository`. We will define the `ZoneConfigPayload` structure to pass the necessary data.
2.  **Move Logic**: Migrate the GORM transaction loop (creating the event, iterating over zones, calculating capacities, and bulk inserting seats) from `event_service.go` into `event_repository.go`.
3.  **Service Cleanup**: Refactor `event_service.go` to prepare the data models and configuration slices, then call `eventRepo.CreateEventWithZones(...)`. Remove `gorm` imports and the `db *gorm.DB` dependency from the service struct.
4.  **Wiring Update**: Modify `cmd/server/main.go` to stop passing `db` to `NewEventService`.

### Alternatives Considered

#### Unit of Work (UoW) Pattern
- **Description**: Implement a generic Unit of Work interface that allows the service layer to control transaction boundaries without knowing about GORM.
- **Pros**: Gives the service layer explicit control over transactions across multiple repositories.
- **Cons**: Over-engineering for this specific use case. The event creation logic is highly cohesive and fits naturally inside the `EventRepository`.
- **Rejected Because**: The current complexity does not warrant a full UoW implementation. Pushing the cohesive logic into the repository is cleaner and faster.

### Decision Matrix

| Criterion | Weight | Repository Encapsulation | Unit of Work Pattern |
| :--- | :--- | :--- | :--- |
| **Architectural Purity (DIP)** | 40% | 5: Service completely agnostic | 4: Abstracts DB, but adds UoW interface |
| **Implementation Simplicity** | 30% | 5: Natural fit for existing repo | 2: Requires new UoW boilerplate |
| **Maintainability** | 30% | 4: Easy to trace | 3: Can become complex to mock |
| **Weighted Total** | | **4.7** | 3.1 |

## Architecture

### Data Flow

```
[Handler] --(EventCreateRequest)--> [EventService]
                                        | (Validates request, calculates dimensions)
                                        v
                               [EventRepository.CreateEventWithZones]
                                        | (Begins DB Transaction)
                                        | --> Insert Event
                                        | --> Insert Zones
                                        | --> Insert Seats (Bulk)
                                        | (Commits DB Transaction)
                                        v
                                  [Database]
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Repository and Service refactoring, Wiring updates. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Logic Drift During Migration** | HIGH | LOW | The calculation for seat geometry and layout metadata might subtly change if the loop is split incorrectly. **Mitigation**: We will copy the exact calculation logic to the repository and ensure variables map identically. |
| **Transaction Boundary Changes** | HIGH | LOW | Moving the transaction could accidentally leave some database operations outside the transaction. **Mitigation**: The new repository method will encapsulate the entire operation within a single `tx.Transaction()` block, just as it was before. |
| **Testing Regressions** | LOW | LOW | Existing service tests might break due to dependency changes. **Mitigation**: We will update `NewEventService` calls in test files and mock the new repository method appropriately. |

## Success Criteria

1. `internal/service/event_service.go` has no `gorm` imports.
2. The `EventService` struct does not hold a `*gorm.DB` reference.
3. Event creation works exactly as before, successfully creating an event, zones, and seats in a single atomic transaction.
