---
title: "Standardize Timezone Implementation Plan"
created: "2026-05-09T00:00:00Z"
status: "approved"
total_phases: 4
estimated_files: 10
task_complexity: "medium"
---

# Standardize Timezone Implementation Plan

## Plan Overview
- **Total phases**: 4
- **Agents involved**: database_administrator, coder, tester
- **Estimated effort**: Standardize all backend time handling to UTC as per AGENTS.md requirements.

## Phase 1: Database and Connection Standard
### Objective
Ensure the database connection is explicitly set to UTC.
### Agent: database_administrator
### Parallel: No
### Files to Modify
- `internal/repository/postgres.go`: Append `&TimeZone=UTC` to the DSN string.
### Validation
- Backend builds successfully.
### Dependencies
- Blocks: Phase 2

## Phase 2: Seed and Auth Service Standardization
### Objective
Update seed data and auth service to use UTC consistently.
### Agent: coder
### Parallel: Yes
### Files to Modify
- `cmd/seed/main.go`: Update all `time.Now()` to `time.Now().UTC()`.
- `internal/service/auth_service.go`: Update all `time.Now()` to `time.Now().UTC()`.
### Validation
- `go build ./cmd/seed`
- `go build ./cmd/server`
### Dependencies
- Blocked by: Phase 1
- Blocks: Phase 4

## Phase 3: Order, Queue, and Worker Standardization
### Objective
Standardize critical business logic for orders, queues, and workers.
### Agent: coder
### Parallel: Yes
### Files to Modify
- `internal/repository/order_repository.go`: Update all `time.Now()` to `time.Now().UTC()`.
- `internal/worker/worker.go`: Update all `time.Now()` to `time.Now().UTC()`.
- `internal/queue/service.go`: Update all `time.Now()` to `time.Now().UTC()`.
- `internal/queue/repository.go`: Update all `time.Now()` to `time.Now().UTC()`.
- `internal/service/event_service.go`: Update all `time.Now()` to `time.Now().UTC()`.
### Validation
- `go build ./cmd/server`
### Dependencies
- Blocked by: Phase 1
- Blocks: Phase 4

## Phase 4: Final Verification
### Objective
Run all tests to ensure logic consistency.
### Agent: tester
### Parallel: No
### Files to Modify: None
### Validation
- `go test ./internal/tests/...`
### Dependencies
- Blocked by: Phase 2, Phase 3
