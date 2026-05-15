---
title: "Fix Network Resolution and Error Handling"
created: "2026-05-14T06:36:55.533Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Fix Network Resolution and Error Handling Design Document

## Problem Statement

The TicketRush frontend application is experiencing `net::ERR_NAME_NOT_RESOLVED` errors when attempting to communicate with the backend. This occurs because the Docker Compose configuration passes an internal Docker hostname (`backend:8080`) to the browser, which operates outside the Docker network and cannot resolve it. Furthermore, when these network failures happen, critical UI components (Hero events, Event lists, and Search trends) fail silently or render empty states without providing user-facing feedback or recovery options.

## Requirements

### Functional Requirements

1. **REQ-1**: The frontend API client must successfully connect to the backend from the user's browser during local development.
2. **REQ-2**: Affected UI components (`Home`, `EventListWithTabs`, `SearchOverlay`) must display a visible error message when API requests fail.
3. **REQ-3**: Affected UI components should provide a mechanism (e.g., a "Thử lại" / "Retry" button) to re-fetch data upon failure.

### Non-Functional Requirements

1. **REQ-4**: Error handling additions must not degrade the existing loading states or skeleton UI.

### Constraints

- The fix must maintain compatibility with the existing Vite and Axios setup.
- Must not introduce new external dependencies.

## Approach

### Selected Approach

**Local Component Error States with Dynamic Base URL Fallback**

The API client will be updated to correctly prioritize `VITE_PUBLIC_API_URL` as a fallback, and `docker-compose.yml` will expose `http://localhost:8080`. Components will manage their own local error states and render specific fallback UI with retry buttons.

### Alternatives Considered

#### Unified Fallback Component

- **Description**: Create a single `ErrorFallback` wrapper component for all data-fetching sections.
- **Pros**: Reduces boilerplate in individual components; consistent UI.
- **Cons**: Less contextual; harder to place inline with complex layouts like the Search Overlay.
- **Rejected Because**: The user explicitly preferred local component states to maintain granular control over how errors are presented in specific layouts (e.g., Hero vs. List).

### Decision Matrix

| Criterion | Weight | Local Component Error States | Unified Fallback Component |
|-----------|--------|------------------------------|----------------------------|
| Layout Granularity | 40% | 5: Full control over placement | 2: Rigid placement |
| Implementation Speed | 30% | 3: Requires touching multiple files | 4: One component to build |
| UX Context | 30% | 5: Can tailor messages per section | 3: Generic messages |
| **Weighted Total** | | **4.4** | **2.9** |

## Architecture

### Component Diagram

```text
[Browser] 
   |-- (http://localhost:8080) --> [API Client (api.js)]
   |                                     |-- Axios Interceptors (Tokens & Fallback)
   |
[Components]
   |-- Home.jsx (State: heroEvents, loading, error)
   |-- EventListWithTabs.jsx (State: events, loading, error)
   |-- SearchOverlay.jsx (State: trendingEvents, error)
```

### Data Flow

1. Component mounts and attempts to fetch data via `eventService`.
2. `api.js` constructs the URL using `VITE_PUBLIC_API_URL` (resolving to `localhost:8080`).
3. On success, data is rendered. On failure, Axios rejects the promise.
4. Component catches the error, sets local `error` state, and renders the retry UI.
5. User clicks "Retry", resetting `error` to null and re-triggering the fetch flow.

### Key Interfaces

```javascript
// Local component state signature addition
const [error, setError] = useState(null); // string | null
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `devops_engineer` | No | Updated `docker-compose.yml` with correct `VITE_PUBLIC_API_URL` |
| 2     | `coder` | No | Updated `api.js` and UI components with local error states and retry logic |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Component layout breaking due to error UI | MEDIUM | MEDIUM | Render error states within the existing bounding boxes of the components, using standard Tailwind classes to maintain dimensions. |
| Endless redirect loops on 401 | LOW | LOW | `api.js` already contains a guard against redirect loops. Replacing `window.location.href` with React Router navigation (if accessible) or refining the check will preserve this safety. |

## Success Criteria

1. The frontend browser successfully resolves the API domain and completes requests to `http://localhost:8080` (or the equivalent public URL).
2. `Home.jsx`, `EventListWithTabs.jsx`, and `SearchOverlay.jsx` display a clear, localized error message instead of crashing or showing empty space when an API request fails.
3. Users can manually retry failed data fetching operations via a "Retry" button.
