---
title: "fix-database-migration Implementation Plan"
design_ref: "docs/maestro/plans/2026-05-09-fix-database-migration-design.md"
created: "2026-05-09T00:00:00Z"
status: "draft"
total_phases: 1
estimated_files: 3
task_complexity: "simple"
---

# Fix Database Migration Implementation Plan

## Plan Overview
- **Total phases**: 1
- **Agents involved**: `coder`
- **Estimated effort**: Quick schema migration and model tag fix.

## Dependency Graph
```text
Phase 1 [coder]
```

## Execution Strategy
| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1 | Phase 1 | Sequential | 1 | Schema & Model Fix |

## Phase 1: Schema & Model Fix
### Objective
Add the missing migration files and fix the GORM column naming.
### Agent: `coder`
### Parallel: No
### Files to Create
- `migrations/000010_add_user_is_oauth.up.sql`
- `migrations/000010_add_user_is_oauth.down.sql`
### Files to Modify
- `internal/models/user.go`
### Implementation Details
- In `000010_add_user_is_oauth.up.sql`, write `ALTER TABLE users ADD COLUMN is_oauth BOOLEAN DEFAULT false;`.
- In `000010_add_user_is_oauth.down.sql`, write `ALTER TABLE users DROP COLUMN IF EXISTS is_oauth;`.
- In `internal/models/user.go`, update the `IsOAuth` field tag to ``gorm:"column:is_oauth;default:false" json:"is_oauth"``.
### Validation
- `go build ./...`
### Dependencies
- Blocked by: None
- Blocks: None

## File Inventory
| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `migrations/000010_add_user_is_oauth.up.sql` | 1 | Migration UP |
| 2 | `migrations/000010_add_user_is_oauth.down.sql` | 1 | Migration DOWN |
| 3 | `internal/models/user.go` | 1 | Model tag alignment |

## Risk Classification
| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | LOW | Safe additive migration and simple tag fix. |

## Execution Profile
```text
Execution Profile:
- Total phases: 1
- Parallelizable phases: 0
- Sequential-only phases: 1
```