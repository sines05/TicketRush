---
title: "fix-oauth-persistence Implementation Plan"
design_ref: "docs/maestro/plans/2026-05-09-fix-oauth-persistence-design.md"
created: "2026-05-09T00:00:00Z"
status: "draft"
total_phases: 2
estimated_files: 5
task_complexity: "medium"
---

# Fix OAuth Persistence Implementation Plan

## Plan Overview
- **Total phases**: 2
- **Agents involved**: `coder`
- **Estimated effort**: Moderate effort to add a DB column and bridge the OAuth frontend-backend handshake.

## Dependency Graph
```text
Phase 1 [coder] ----> Phase 2 [coder]
```

## Execution Strategy
| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1 | Phase 1 | Sequential | 1 | Backend Data Modeling |
| 2 | Phase 2 | Sequential | 1 | Frontend Handshake |

## Phase 1: Backend Data Modeling
### Objective
Explicitly identify OAuth users in the database to prevent password management issues.
### Agent: `coder`
### Parallel: No
### Files to Modify
- `internal/models/user.go` — Add `IsOAuth bool` to the User struct.
- `internal/service/auth_service.go` — Set `IsOAuth: true` when creating users in `GoogleLoginCallback` and `FacebookLoginCallback`. Remove the dummy password `PasswordHash: "[OAUTH2_GOOGLE_USER]"`.
### Implementation Details
- Add `IsOAuth bool \`json:"is_oauth" gorm:"default:false"\`` to `User`.
- In `auth_service.go`, when creating new users from OAuth, set `IsOAuth: true` and leave `PasswordHash: ""`.
### Validation
- `go build ./cmd/server/main.go`
### Dependencies
- Blocked by: None
- Blocks: Phase 2

## Phase 2: Frontend Handshake
### Objective
Implement the missing route and context method to ingest the OAuth token and hydrate the session.
### Agent: `coder`
### Parallel: No
### Files to Create
- `frontend/src/pages/Auth/OAuthCallback.jsx`
### Files to Modify
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/routes/AppRoutes.jsx`
- `frontend/src/services/authService.js` (Optional: add `validateToken` if not already present to fetch user data).
### Implementation Details
- In `AuthContext.jsx`, add `oauthLogin = async (token)` which calls `api.get('/users/me', { headers: { Authorization: 'Bearer '+token } })` to fetch user details, then sets token and user in state and `localStorage`.
- In `OAuthCallback.jsx`, read `?token=` using `useSearchParams()`. Call `loginWithToken(token)` from context, then `navigate('/')`.
- Add `<Route path="/auth/callback" element={<OAuthCallback />} />` to `AppRoutes.jsx`.
### Validation
- `npm run lint`
### Dependencies
- Blocked by: Phase 1
- Blocks: None

## File Inventory
| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `internal/models/user.go` | 1 | Schema update |
| 2 | `internal/service/auth_service.go` | 1 | Callback update |
| 3 | `frontend/src/context/AuthContext.jsx` | 2 | Token ingestion |
| 4 | `frontend/src/pages/Auth/OAuthCallback.jsx` | 2 | Callback route handler |
| 5 | `frontend/src/routes/AppRoutes.jsx` | 2 | Route registration |

## Risk Classification
| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | LOW | Minor schema addition, GORM handles it automatically. |
| 2 | MEDIUM | Critical auth path; must handle missing tokens gracefully. |

## Execution Profile
```text
Execution Profile:
- Total phases: 2
- Parallelizable phases: 0
- Sequential-only phases: 2
```