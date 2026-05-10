---
title: "Fix Social Login Absolute URL"
created: "2026-05-10T04:00:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "medium"
---

# Fix Social Login Absolute URL Design Document

## Problem Statement

TicketRush is experiencing an authentication flow issue where initiating social login (Google/Facebook) immediately redirects the user back to the home page instead of the OAuth provider. 

This occurs because `authService.js` constructs the login URL using `VITE_API_BASE_URL` (e.g., `/api/v1`), making it a relative path. The frontend React Router intercepts this navigation, fails to match it against any defined frontend route, and hits the catch-all wildcard (`*`), which forces a redirect to `/`.

The proposed fix is to use an absolute URL to force the browser to bypass the SPA router. However, using the existing `VITE_API_URL` presents a critical production gap: in `docker-compose.yml`, `VITE_API_URL` is configured as `http://backend:8080`. While this works for the internal Vite proxy, exposing this internal Docker hostname to the user's browser for an absolute redirect will fail.

## Requirements

### Functional Requirements
1. **REQ-1**: Social login buttons must redirect the user directly to the OAuth provider via the backend, completely bypassing the frontend SPA router.
2. **REQ-2**: The frontend configuration must support distinct URLs for internal proxying (for API calls) and public-facing redirects (for OAuth) in production environments.

### Non-Functional Requirements
1. **REQ-3**: Security: Internal network hostnames (e.g., `http://backend:8080`) must not be exposed to the client browser.

### Constraints
- The solution must integrate natively with Vite's environment variable system (`import.meta.env`).
- Must not require significant architectural changes to the existing Docker setup.

## Approach

### Selected Approach

**Introduce VITE_PUBLIC_API_URL Variable** — *[Provides explicit separation between internal proxy targets and external client redirects (REQ-2, REQ-3)]*

We will introduce a new environment variable, `VITE_PUBLIC_API_URL`. The existing `VITE_API_URL` will continue to serve as the internal routing target for the Vite proxy (handling `backend:8080` in Docker). `VITE_PUBLIC_API_URL` will be explicitly used in client-side code (like `authService.js`) whenever an absolute, browser-reachable URL is required.

### Alternatives Considered

#### Dynamic Origin Construction (window.location.origin)
- **Description**: Construct the absolute URL dynamically using `window.location.origin + VITE_API_BASE_URL`.
- **Rejected Because**: It lacks the flexibility to decouple frontend and backend hosting domains in production. Assumes the API is always hosted on the exact same origin as the frontend.

### Decision Matrix

| Criterion | Weight | VITE_PUBLIC_API_URL | Dynamic Origin |
|-----------|--------|---------------------|----------------|
| **Reliability (Bypass SPA)** | 40% | 5: Explicit absolute URL completely avoids React Router. | 4: Works, but rigidly couples origins. |
| **Env Separation (Dev vs Prod)** | 40% | 5: Clearly separates internal proxying from public URLs. | 2: Fails if backend is on a separate domain. |
| **Simplicity** | 20% | 3: Requires updating `.env` files across environments. | 5: No `.env` updates needed. |
| **Weighted Total** | | **4.6** | **3.4** |

## Architecture

### Data Flow
`User Click` -> `authService.js` -> `window.location.href = VITE_PUBLIC_API_URL + VITE_API_BASE_URL + route` -> `Browser Navigates to Backend Directly`.

### Key Component Updates
1.  **`.env.example` & `.env.local`**: Add `VITE_PUBLIC_API_URL=http://localhost:8080`.
2.  **`docker-compose.yml`**: Ensure the frontend service receives `VITE_PUBLIC_API_URL` (passed through from the host environment).
3.  **`authService.js`**: Refactor `socialLogin` to use `VITE_PUBLIC_API_URL`.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | Environment configs, `authService.js` updates |
| 2     | tester   | No       | Validation of absolute redirect generation |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Missing Env Var in Prod | HIGH | LOW | Fallback to `VITE_API_URL` or a sane default if `VITE_PUBLIC_API_URL` is omitted, though explicit failure is safer. Provide clear `.env.example`. |
| Docker Networking | MEDIUM | LOW | Ensure `docker-compose.yml` passes the variable through via the `environment` block without hardcoding a local address. |

## Success Criteria
1. Clicking Google/Facebook login navigates correctly to the backend OAuth initialization endpoint.
2. `docker-compose up` runs successfully and correctly injects environment variables.
