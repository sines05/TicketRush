---
title: "optimize-ui-alignment"
created: "2026-05-09T00:00:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "complex"
---

# Optimize UI Alignment Design Document

## Problem Statement

The TicketRush backend implements a comprehensive suite of features—including 2FA, OAuth, membership tier upgrades, push notifications, customer reviews, and geographical mapping—but the React frontend currently lacks the corresponding user interfaces to expose these capabilities. 

Our investigation reveals several "orphaned" API endpoints and services (e.g., `GoogleMapLocation`, `notificationService.js`) that are defined but never rendered or invoked. Additionally, while authentication state is persisted, the booking session is volatile and lost upon page reloads.

The goal of this task is to systematically upgrade the frontend UI to achieve full feature parity with the backend, creating a cohesive, production-ready user experience.

## Requirements

### Functional Requirements
1. **REQ-1 (Auth UI)**: The Login interface must support Google and Facebook OAuth, and include a 2FA verification step if the user has 2FA enabled. The Profile page must allow users to setup and enable 2FA.
2. **REQ-2 (Membership UI)**: The Membership page must include an actionable UI for users to upgrade their tier.
3. **REQ-3 (Feedback UI)**: Customers must be able to submit event reviews, and an Admin Complaints Management page must be created to view and update complaint statuses.
4. **REQ-4 (Map UI)**: The `GoogleMapLocation` component must be integrated into the `EventDetail` and `EventForm` (Admin) pages.
5. **REQ-5 (Notifications)**: The app must request browser notification permissions and trigger local alerts using the existing `notificationService.js`.

### Non-Functional Requirements
1. **REQ-N1 (Persistence)**: The `BookingContext` must persist user selections (event, seats) across page reloads using `sessionStorage`.

### Constraints
- Must utilize existing frontend architecture (React context, Vite) without introducing heavy third-party UI frameworks unless strictly necessary.

## Approach

### Selected Approach

**Client-Side Integration & State Persistence**
We will implement the missing UI components directly within the existing React pages (`Login.jsx`, `Profile.jsx`, `EventDetail.jsx`) to wire them to the orphaned services. For session persistence (`REQ-N1`), we will upgrade `BookingContext` to synchronize its reducer state with `sessionStorage`. This ensures that if a user accidentally closes or reloads a tab during a flash sale, their local booking progress (e.g., selected seats) is retained without polluting global storage across multiple tabs.

*Rationale*: *`sessionStorage` is chosen over `localStorage` because ticket booking is typically an isolated, per-tab session. We want to avoid conflicts if a user tries to book tickets for different events in different tabs simultaneously. Traces To: REQ-N1.*

### Alternatives Considered

#### LocalStorage for Booking State
- **Description**: Persisting booking state in `localStorage`.
- **Pros**: Survives browser restarts (not just tab reloads).
- **Cons**: State is shared across all tabs, leading to race conditions or confusing UI if the user opens multiple events simultaneously.
- **Rejected Because**: Ticket booking flows are highly contextual to the current window. `sessionStorage` provides a safer boundary.

#### Backend-Driven State Recovery
- **Description**: Frontend fetches the current active session state (locked seats, cart) from the Redis queue upon reload.
- **Pros**: Highly accurate, single source of truth.
- **Cons**: Requires creating new API endpoints for state hydration and increases backend load.
- **Rejected Because**: The frontend already knows its intended state before checkout. Local persistence is lighter and faster for UI recovery.

### Decision Matrix (Persistence Strategy)

| Criterion | Weight | sessionStorage | localStorage | Backend Hydration |
|-----------|--------|----------------|--------------|-------------------|
| Isolation (Multi-tab safety) | 40% | 5: Naturally scoped to the tab. | 1: Shared across tabs. | 4: Scoped by session token. |
| Implementation Speed | 30% | 5: Direct React context integration. | 5: Direct React context integration. | 2: Requires new backend APIs. |
| Resilience (Crash recovery) | 30% | 3: Survives reload, not full browser crash. | 5: Survives full browser crash. | 5: Highly resilient. |
| **Weighted Total** | | **4.4** | **3.4** | **3.7** |

## Architecture

### Component Diagram

```text
[React App]
  ├── [AuthContext] <--- (JWT & 2FA State) ---> [AuthService]
  ├── [BookingContext (sessionStorage)] ------> [OrderService]
  ├── [Pages]
  │    ├── Login (Adds OAuth & 2FA verification forms)
  │    ├── Profile (Adds 2FA Setup/Enable toggles)
  │    ├── EventDetail (Integrates GoogleMapLocation & Reviews UI)
  │    ├── Membership (Adds 'Upgrade Tier' button)
  │    └── Admin/Complaints (New Admin route for status management)
  └── [NotificationService] <--- (Browser Push API integration)
```
*Decision: Extend existing contexts and pages rather than creating parallel structures. Traces To: REQ-1, REQ-2, REQ-3, REQ-N1.*

### Data Flow (2FA Verification Example)
1. User submits Email/Password on `Login.jsx`.
2. Backend responds with `requires_2fa: true`.
3. `Login.jsx` transitions state to show the TOTP input field.
4. User submits TOTP code; `authService.verify2FALogin` is called.
5. On success, `AuthContext` saves the final JWT and redirects to Home.

### Key Interfaces

```typescript
// Extended AuthContext State
interface AuthState {
  user: User | null;
  token: string | null;
  requires2FA: boolean; // Triggers UI state transition
}

// SessionStorage Hydration
function useBookingSession(): [BookingState, Dispatch] {
  // Initializes state from sessionStorage on mount
  // Subscribes to changes to persist updates
}
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1 | `coder` | No | Implementation of Auth, 2FA, and Profile UI updates. |
| 2 | `coder` | No | Integration of Booking Persistence, Google Maps, and Membership UI. |
| 3 | `coder` | No | Implementation of Complaints/Reviews UI and Notification wiring. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Context Corruption** | HIGH | LOW | Bugs in the `BookingContext` hydration from `sessionStorage` could cause mismatched seat data. *Mitigation: Strict schema validation during the initial load on mount.* |
| **OAuth Misconfiguration** | MEDIUM | HIGH | Local development environments often lack proper Google/FB Client IDs, causing the OAuth UI buttons to fail silently. *Mitigation: Add visible error toasts in `Login.jsx` if the OAuth flow fails or is unconfigured.* |

## Success Criteria

1. A user can complete the entire 2FA setup, enabling, and verification loop from the UI.
2. The `GoogleMapLocation` is visible and functional on the Event Details page.
3. Refreshing the browser on the Seat Selection page retains the previously selected seats and current event.
4. An Admin can view and update customer complaints.
5. When checkout is successful, the user receives both a local browser push notification and an email notification.
