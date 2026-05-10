---
title: "Fix Social Login Absolute URL Implementation Plan"
design_ref: "/home/son/TicketRush/docs/maestro/plans/2026-05-10-fix-social-login-absolute-url-design.md"
created: "2026-05-10T04:30:00Z"
status: "draft"
total_phases: 3
estimated_files: 4
task_complexity: "medium"
---

# Fix Social Login Absolute URL Implementation Plan

## Plan Overview

- **Total phases**: 3
- **Agents involved**: coder, tester
- **Estimated effort**: Low code complexity, medium configuration coordination.

## Dependency Graph

```text
Phase 1: Foundation (Environment Configs)
    |
    v
Phase 2: Core Domain (authService.js & Docker)
    |
    v
Phase 3: Verification (Validation)
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1 | Sequential | 1 | Environment file setup |
| 2     | Phase 2 | Sequential | 1 | Code and Infrastructure |
| 3     | Phase 3 | Sequential | 1 | Validation and Testing |

## Phase 1: Foundation (Environment Configs)

### Objective
Establish the new `VITE_PUBLIC_API_URL` environment variable across frontend template and local configurations.

### Agent: coder
### Parallel: No

### Files to Modify

- `frontend/.env.example` — Add `VITE_PUBLIC_API_URL` variable template.
- `frontend/.env.local` — Add local fallback for `VITE_PUBLIC_API_URL`.

### Implementation Details
- Insert `VITE_PUBLIC_API_URL=http://localhost:8080` below the existing `VITE_API_URL` definitions in both files.

### Validation
- Ensure files are syntactically valid (no stray characters).

### Dependencies
- Blocked by: None
- Blocks: Phase 2

---

## Phase 2: Core Domain (authService.js & Docker)

### Objective
Refactor the social login method to use the new absolute URL configuration and pass the variable through Docker.

### Agent: coder
### Parallel: No

### Files to Modify

- `frontend/src/services/authService.js` — Update `socialLogin` to use `VITE_PUBLIC_API_URL`.
- `docker-compose.yml` — Pass `VITE_PUBLIC_API_URL` to the frontend container.

### Implementation Details
- **`authService.js`**: Update lines 122-128. Change `window.location.href` assignments to construct an absolute URL using `import.meta.env.VITE_PUBLIC_API_URL` as the host prefix.
- **`docker-compose.yml`**: Under `services.frontend.environment`, add `- VITE_PUBLIC_API_URL=${VITE_PUBLIC_API_URL:-http://localhost:8080}` to ensure the variable is forwarded.

### Validation
- `npm run lint` in `frontend/`.

### Dependencies
- Blocked by: Phase 1
- Blocks: Phase 3

---

## Phase 3: Verification

### Objective
Ensure the absolute URL redirect functions correctly and Docker configuration builds.

### Agent: tester
### Parallel: No

### Validation
- Verify `authService.js` constructs the correct URL format.
- Confirm Docker configuration is syntactically valid using `docker-compose config`.

### Dependencies
- Blocked by: Phase 2
- Blocks: None

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `frontend/.env.example` | 1 | Config template |
| 2 | `frontend/.env.local` | 1 | Local config |
| 3 | `frontend/src/services/authService.js` | 2 | Auth redirect logic |
| 4 | `docker-compose.yml` | 2 | Container config |

## Risk Classification

| Phase | Risk | Rationale |
|-------|------|-----------|
| 1     | LOW | Simple environment variable additions. |
| 2     | MEDIUM | Modifies authentication flow and Docker network topology. |
| 3     | LOW | Verification only. |

## Execution Profile

```text
Execution Profile:
- Total phases: 3
- Parallelizable phases: 0
- Sequential-only phases: 3
- Estimated parallel wall time: N/A
- Estimated sequential wall time: ~10 mins

Note: Native subagents currently run without user approval gates.
All tool calls are auto-approved without user confirmation.
```
