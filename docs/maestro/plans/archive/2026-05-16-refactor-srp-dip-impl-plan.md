---
title: "refactor-srp-dip-impl-plan"
design_ref: "docs/maestro/plans/2026-05-16-refactor-srp-dip-design.md"
created: "2026-05-16T22:42:00Z"
status: "approved"
total_phases: 1
estimated_files: 4
task_complexity: "medium"
---

# Refactor SRP/DIP Violations Implementation Plan

## Plan Overview

- **Total phases**: 1
- **Agents involved**: `coder`
- **Estimated effort**: Medium. Refactoring transaction logic and removing dependencies.

## Dependency Graph

```
Phase 1: Refactor Event Creation Transaction (Coder)
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Architecture cleanup |

## Phase 1: Refactor Event Creation Transaction

### Objective
Move the complex GORM transaction logic from the service layer to the repository layer, cleanly decoupling the service from the DB framework.

### Agent: `coder`
### Parallel: No

### Files to Modify

- `internal/repository/event_repository.go`
- `internal/service/event_service.go`
- `cmd/server/main.go`
- `internal/tests/*` (Any test files initializing `EventService`)

### Implementation Details

1. **`internal/repository/event_repository.go`**:
    - Add `type CreateEventParams struct { Event *models.Event; Zones []models.EventZone; RowSeatCounts [][]int }` or similar payload structure. Or better, just pass the exact parameters needed to run the GORM transaction.
    - Implement `CreateEventWithZones(ctx context.Context, req EventCreateRequest) (*models.Event, error)`. Wait, putting `EventCreateRequest` in the repo violates DIP too (DTOs belong to the presentation/service layer). Better approach: Pass the fully prepared `*models.Event` and a slice of prepared `*models.EventZone` and a slice of `models.Seat` slice to the repository. The repo's job is simply: begin Tx, `Create(&event)`, `Create(&zone)`, `Create(&seats)`, Commit.
    - Let's define the interface method: `CreateEventWithZones(ctx context.Context, event *models.Event, zones []models.EventZone, zoneSeats [][]models.Seat) error`.
    - The repository executes the `db.Transaction` using these prepared models.
2. **`internal/service/event_service.go`**:
    - Remove `"gorm.io/gorm"` from imports.
    - Remove `db *gorm.DB` from `eventService` and `NewEventService`.
    - In `CreateEvent`, validate and construct the `models.Event`, the slice of `models.EventZone`, and the 2D slice of `models.Seat` (since seats belong to zones). Then call `s.eventRepo.CreateEventWithZones(ctx, &event, zones, seats)`.
3. **`cmd/server/main.go`**:
    - Update `service.NewEventService(eventRepo, metricsRepo)` — remove `db`.
4. **`internal/tests/`**:
    - Update tests to match the new `NewEventService` signature.

### Validation
- `go build ./...`
- `go test ./internal/tests/...`

### Dependencies
- Blocked by: None
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/repository/event_repository.go` | 1 | Encapsulate DB transaction |
| 2 | `internal/service/event_service.go` | 1 | Decouple from GORM |
| 3 | `cmd/server/main.go` | 1 | Update DI wiring |
| 4 | `internal/tests/*` | 1 | Fix test wiring |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Purely architectural refactoring; business logic remains identical. |

## Execution Profile

```
Execution Profile:
- Total phases: 1
- Parallelizable phases: 0
- Sequential-only phases: 1
- Estimated parallel wall time: N/A
- Estimated sequential wall time: ~15 minutes

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
