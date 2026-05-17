---
title: "fix-auth-redirect-loop"
created: "2026-05-16T21:25:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Fix Auth Redirect Loop Design Document

## Problem Statement

The application enters an infinite redirect loop when the Refresh Token mechanism fails. This is caused by a chain of related architectural and routing issues:

1.  **Incorrect Redirect Path**: The Axios interceptor in `api.js` attempts to redirect the user to `/login` when token refresh fails. However, the actual route is `/auth/login`.
2.  **Fallback Route Amplification**: `AppRoutes.jsx` catches the invalid `/login` route using its `*` fallback and redirects the user back to the home page (`/`).
3.  **Unconditional Hydration**: `AuthContext.jsx` unconditionally calls the `/users/me` API whenever it mounts (which happens when arriving at `/`). For an unauthenticated user, this returns a 401.
4.  **Side-Effect Leakage**: The interceptor intercepts the 401, attempts a refresh, fails, and redirects back to `/login`, completing the infinite loop.

## Requirements

### Functional Requirements

1. **REQ-1**: When an authentication session is irrecoverable (refresh fails), the user must be reliably redirected to `/auth/login`.
2. **REQ-2**: An anonymous user arriving at the home page (`/`) should not trigger an unnecessary `/users/me` API call that causes a 401 response.
3. **REQ-3**: The routing mechanism must use SPA transitions (React Router) rather than full page reloads (`window.location.href`) where possible.

## Approach

### Selected Approach

**Event-Driven Authentication State (Decoupled)**

We will address the issues by decoupling the API layer from browser navigation and fixing the hydration logic:
1.  **Decouple Navigation**: Remove `window.location.href` from `api.js`. Instead, when the refresh fails, `api.js` will clear `localStorage` and dispatch a custom window event (e.g., `auth:unauthorized`).
2.  **Native Routing**: Update `AuthContext.jsx` to listen for the `auth:unauthorized` event. When caught, the context will clear its internal state and use React Router's `useNavigate` (via a wrapper or global effect, or simply letting the component re-render with `user=null` and protected routes handle the redirect to `/auth/login`). Since `AuthContext` is high up, we can use `window.location.href = '/auth/login'` if a router context isn't available, but fixing the path alone is a huge step. Wait, `AuthContext` doesn't have access to `useNavigate` if it's above `BrowserRouter`. But we will see.
3.  **Conditional Hydration**: Modify `AuthContext.jsx` so that the `hydrate` function only calls `userService.getMe()` if it detects a prior session (e.g., if `tr_user` exists in `localStorage`). This prevents unnecessary API calls for anonymous users.
4.  **Route Alignment**: Ensure `AppRoutes.jsx` fallback behavior is robust.

### Alternatives Considered

#### Direct Route Correction (Quick Fix)
- **Description**: Simply change `window.location.href = '/login'` to `'/auth/login'` in `api.js` and add a localStorage check in `AuthContext`.
- **Pros**: Very fast to implement; minimal code changes.
- **Cons**: Retains the anti-pattern of a low-level service (Axios) controlling top-level browser navigation, which can cause React state to become out-of-sync.
- **Rejected Because**: The decoupled approach is much cleaner architecturally and prevents future routing bugs.

### Decision Matrix

| Criterion | Weight | Event-Driven (Decoupled) | Direct Route Correction |
| :--- | :--- | :--- | :--- |
| **Architectural Purity (SRP)** | 40% | 5: Clean separation | 2: Mixes API and UI |
| **UX (SPA Transitions)** | 30% | 5: Smooth navigation | 3: Full page reload |
| **Simplicity** | 30% | 3: Requires event listener | 5: One-line change |
| **Weighted Total** | | **4.4** | 3.2 |

## Architecture

### Data Flow

```
[Failed API Refresh in api.js]
      |
      | 1. Dispatch custom event 'auth:unauthorized'
      v
[AuthContext.jsx useEffect listener]
      |
      | 2. Catch event
      | 3. setUser(null)
      | 4. Navigate to /auth/login (via global router or window.location if necessary)
      v
[Login View]
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Implement event-driven auth logic and conditional hydration. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Event Listener Memory Leaks** | LOW | LOW | Ensure the `auth:unauthorized` listener is attached inside a `useEffect` in `AuthContext` and properly removed in the cleanup function. |
| **Silent Auth Failures** | HIGH | LOW | We will verify the event dispatch and routing flow locally before considering the fix complete. |
| **Stale Cache Hydration** | LOW | MEDIUM | The `getMe` API call will still act as the source of truth; `localStorage` is only used to *opt-in* to the network request. |

## Success Criteria

1. Navigating to `/` as an unauthenticated user does not trigger a 401 error or a redirect loop.
2. When an authenticated session expires completely (refresh fails), the user is smoothly redirected to `/auth/login`.
