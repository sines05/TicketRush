---
title: "Fix Code Review Findings"
created: "2026-05-10T17:15:00Z"
status: "approved"
total_phases: 3
estimated_files: 5
task_complexity: "simple"
---

# Implementation Plan: Fix Code Review Findings

## Objective
Address the critical regression and quality issues identified in the recent code review.

## Dependency Graph
```
[Phase 1: Critical Frontend Fix] -> [Phase 2: Backend Error Handling & Refinement] -> [Phase 3: Repository Optimization]
```

## Phase 1: Critical Frontend Fix
### Objective
Fix the `ReferenceError` and clean up unused code in the TrendingEvents component.
### Agent: coder
### Parallel: false
### Files to Modify
- `frontend/src/components/home/TrendingEvents.jsx`: Add `formatVND` to imports. Remove unused `TrendingUp` import and `isValidUUID` function.
### Validation
- `cd frontend && npm run lint`

## Phase 2: Backend Error Handling & Refinement
### Objective
Improve backend robustness by handling time parsing errors and making the featured events limit dynamic.
### Agent: coder
### Parallel: false
### Files to Modify
- `internal/service/event_service.go`: Add error checking for `time.Parse` in `CreateEvent` and `UpdateEvent`.
- `internal/handler/event_handler.go`: Add support for a `limit` query parameter in `ListFeaturedEvents`.
### Validation
- `go build ./...`

## Phase 3: Repository Optimization
### Objective
Optimize the event search query to avoid repeated subqueries for minimum price.
### Agent: data_engineer
### Parallel: false
### Files to Modify
- `internal/repository/event_repository.go`: Refactor `GetAllEvents` to use a `LEFT JOIN` and `GROUP BY` for calculating `min_price`.
### Validation
- `go build ./...`
- `go test ./internal/repository/...`
