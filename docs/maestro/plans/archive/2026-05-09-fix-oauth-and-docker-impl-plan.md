---
title: "fix-oauth-and-docker Implementation Plan"
design_ref: "docs/maestro/plans/2026-05-09-oauth-debug-review.md"
created: "2026-05-09T00:00:00Z"
status: "draft"
total_phases: 2
estimated_files: 4
task_complexity: "medium"
---

# Fix OAuth and Docker Configuration Implementation Plan

## Plan Overview
- **Total phases**: 2
- **Agents involved**: `coder`
- **Estimated effort**: Fixing Docker environment propagation and fixing OAuth callback and initialization logic.

## Dependency Graph
```text
Phase 1 [coder] ----> Phase 2 [coder]
```

## Execution Strategy
| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1 | Phase 1 | Sequential | 1 | Docker & Config Fixes |
| 2 | Phase 2 | Sequential | 1 | OAuth Handler Refactoring |

## Phase 1: Docker & Config Fixes
### Objective
Propagate environment variables correctly to the backend container and add configuration validation.
### Agent: `coder`
### Parallel: No
### Files to Modify
- `docker-compose.yml` — Add `env_file: .env` to the backend service. Remove redundant DB variable mappings if necessary.
- `.env.example` — Update `GOOGLE_REDIRECT_URL` to point to the backend URL correctly, or explain the flow.
- `internal/config/config.go` — Add a warning log if OAuth credentials are empty.
### Implementation Details
- In `docker-compose.yml`, insert `env_file: .env` under the backend service definition.
- In `internal/config/config.go` `LoadConfig`, check if `GoogleClientID` is empty and use `log.Println("WARNING: GOOGLE_CLIENT_ID is not set")`.
### Validation
- `docker-compose config`
- `go build ./cmd/server/main.go`
### Dependencies
- Blocked by: None
- Blocks: Phase 2

## Phase 2: OAuth Handler Refactoring
### Objective
Fix the OAuth redirect loop for SPA and secure the state parameter.
### Agent: `coder`
### Parallel: No
### Files to Modify
- `internal/service/auth_service.go` — Modify `GoogleLoginURL` to accept or generate a state.
- `internal/handler/auth_handler.go` — Implement CSRF state generation (set cookie). Refactor callback to `c.Redirect`.
### Implementation Details
- Update `GoogleLoginURL` and `FacebookLoginURL` to accept a `state` string argument.
- In handlers, generate a UUID for state, set it as an HttpOnly cookie.
- In callbacks, read the cookie, compare with the `state` query param.
- Change JSON response to `c.Redirect(http.StatusTemporaryRedirect, "http://localhost:5173/auth/callback?token="+token)`.
### Validation
- `go build ./cmd/server/main.go`
### Dependencies
- Blocked by: Phase 1
- Blocks: None

## File Inventory
| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `docker-compose.yml` | 1 | Fix environment variables |
| 2 | `.env.example` | 1 | Documentation clarity |
| 3 | `internal/config/config.go` | 1 | Runtime validation |
| 4 | `internal/service/auth_service.go` | 2 | Secure OAuth state |
| 5 | `internal/handler/auth_handler.go` | 2 | SPA Redirect fix |

## Risk Classification
| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | LOW | Docker config changes are easily verifiable. |
| 2 | MEDIUM | Changes to authentication flow could lock out users if done incorrectly. |

## Execution Profile
```text
Execution Profile:
- Total phases: 2
- Parallelizable phases: 0
- Sequential-only phases: 2
```