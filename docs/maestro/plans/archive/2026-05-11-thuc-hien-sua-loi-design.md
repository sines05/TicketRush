---
title: "Fix State Leakage on Logout"
created: "2026-05-11T00:00:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Fix State Leakage on Logout Design Document

## Problem Statement

When a user logs out of the application, the `logout` function in `AuthContext` only clears `localStorage` and the React Query cache. However, it fails to clear `sessionStorage` (used by `BookingContext`) and module-level in-memory variables (used by `queueService.js`). Because this is a Single Page Application (SPA), these states persist if the browser tab remains open. Consequently, a new user logging in on the same tab inherits the previous user's ticket booking progress and queue session, leading to data leakage and inconsistent application state.

## Requirements

### Functional Requirements

1. **REQ-1**: When a user logs out, all session-related states including `sessionStorage` and module-level variables MUST be completely cleared.
2. **REQ-2**: A subsequent user logging in on the same browser tab MUST start with a clean state.

### Non-Functional Requirements

1. **REQ-N1**: The fix should be robust against future state additions to prevent regressions.

### Constraints

- Needs to be a low-risk, immediate fix to address the critical bug.

## Approach

### Selected Approach

**Hard Reload on Logout**

We will modify the `logout` function in `AuthContext` to clear all local storage and then force a hard page reload using `window.location.href = '/'`.
Hard reload — *[Chosen because it provides a foolproof way to clear all in-memory variables (like `queuesByEvent` in `queueService.js`) and transient states across the entire application without requiring extensive refactoring of individual services]*

### Alternatives Considered

#### Manual State Clearance
- **Description**: Add `sessionStorage.clear()` to `AuthContext` and expose a `clearQueueState()` method from `queueService.js` to be called during logout.
- **Pros**: Keeps the application feeling like a fast SPA without a full page reload.
- **Cons**: Prone to future regressions if new services add module-level state and developers forget to hook them into the logout flow.
- **Rejected Because**: The user explicitly selected the Hard Reload approach for its foolproof nature and simplicity.

#### Refactor to React Context
- **Description**: Move the queue state from a global Map into a React Context that mounts/unmounts with the user session.
- **Pros**: Clean architectural pattern that naturally ties state lifecycle to the component tree.
- **Cons**: Requires more extensive refactoring of `queueService.js` and its consumers.
- **Rejected Because**: The scope of refactoring is disproportionate to the current need of fixing the bug quickly and safely.

### Decision Matrix

| Criterion | Weight | Hard Reload | Manual State Clearance | Refactor to React Context |
|-----------|--------|-------------|------------------------|---------------------------|
| Implementation Simplicity | 40% | 5: One-line change | 3: Requires touching multiple files | 2: Significant refactoring |
| Regression Prevention | 40% | 5: Guarantees memory purge | 2: Developers might forget new states | 4: Natural state lifecycle |
| SPA User Experience | 20% | 2: Causes a full page refresh | 5: No reload needed | 5: No reload needed |
| **Weighted Total** | | 4.4 | 3.0 | 3.4 |

## Architecture

### Component Diagram

```
[Logout Action] --> AuthContext.logout()
                       |
                       +--> Clear localStorage (Tokens)
                       +--> Clear React Query Cache
                       +--> window.location.href = '/' (Browser clears memory & sessionStorage upon reload)
```

### Data Flow

1. User clicks Logout.
2. `AuthContext` executes the `logout()` function.
3. Tokens are removed from `localStorage`.
4. The application navigates to the root `/` via `window.location.href`.
5. The browser fully reloads the page, destroying the SPA instance.
6. All `sessionStorage` and in-memory variables (`queuesByEvent`) are wiped.
7. The application initializes freshly on the home page.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Fix `logout` function in `AuthContext.jsx` |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| User loses unsaved work on logout | LOW | LOW | Logout is an explicit user action; they expect their session to end. |
| Page reload causes a visible flicker | LOW | HIGH | Acceptable trade-off for guaranteeing absolute state security. The flicker only happens upon logging out. |
| Other `localStorage` items not related to auth get cleared | MEDIUM | LOW | The implementation will only clear specific auth keys or we will use `window.location.href = '/'` while retaining the existing specific `localStorage.removeItem()` calls, ensuring safe purging. |

## Success Criteria

1. User 1 logs out. User 2 logs in on the same tab and does not see User 1's queue session or selected seats.