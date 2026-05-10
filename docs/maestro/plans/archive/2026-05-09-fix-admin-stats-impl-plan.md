---
title: "Fix Admin Stats and Remove Redundancy Implementation Plan"
created: "2026-05-09T00:00:00Z"
status: "draft"
total_phases: 2
estimated_files: 3
task_complexity: "simple"
---

# Fix Admin Stats and Remove Redundancy Implementation Plan

## Plan Overview
- **Total phases**: 2
- **Agents involved**: coder, refactor
- **Estimated effort**: Small routing fix and code cleanup.

## Dependency Graph
```
Phase 1 [coder] ----> Phase 2 [refactor]
```

## Phase 1: Remap Admin Stats Route
### Objective
Update the backend routing to use the correct `GetStats` implementation that includes age and gender demographics.
### Agent: coder
### Parallel: No
### Files to Modify
- `cmd/server/main.go` — Change `/api/v1/admin/dashboard/stats` mapping.
### Implementation Details
Point the route to `eventHandler.GetStats` instead of `adminDashboardHandler.GetStats`.
### Validation
- `go build ./cmd/server`
### Dependencies
- Blocked by: None
- Blocks: Phase 2

## Phase 2: Remove Redundant Handlers
### Objective
Delete the redundant `AdminDashboardHandler` and any associated files to simplify the codebase.
### Agent: refactor
### Parallel: No
### Files to Delete
- `internal/handler/admin_dashboard_handler.go`
### Files to Modify
- `cmd/server/main.go` — Remove `AdminDashboardHandler` initialization.
### Implementation Details
Remove the struct, constructor, and its initialization in `main.go`.
### Validation
- `go build ./cmd/server`
### Dependencies
- Blocked by: Phase 1
- Blocks: None
