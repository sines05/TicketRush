---
title: "optimize-ui-alignment Implementation Plan"
design_ref: "docs/maestro/plans/2026-05-09-optimize-ui-alignment-design.md"
created: "2026-05-09T00:00:00Z"
status: "draft"
total_phases: 3
estimated_files: 10
task_complexity: "complex"
---

# Optimize UI Alignment Implementation Plan

## Plan Overview
- **Total phases**: 3
- **Agents involved**: `coder`
- **Estimated effort**: Implementation of several new UI flows and state persistence across the React application.

## Dependency Graph
```text
Phase 1 [coder] ----> Phase 2 [coder] ----> Phase 3 [coder]
```

## Execution Strategy
| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1 | Phase 1 | Sequential | 1 | Auth & Profile updates |
| 2 | Phase 2 | Sequential | 1 | Persistence & Core UI |
| 3 | Phase 3 | Sequential | 1 | Feedback & Notifications |

## Phase 1: Auth & Profile UI Updates
### Objective
Enable OAuth (Google/FB) buttons and implement 2FA setup/verification flows.
### Agent: `coder`
### Parallel: No
### Files to Modify
- `frontend/src/pages/Auth/Login.jsx` — Add OAuth buttons and 2FA TOTP input state.
- `frontend/src/pages/Profile/Profile.jsx` — Add 2FA setup toggle and QR code display.
- `frontend/src/context/AuthContext.jsx` — Update state to handle 2FA transition during login.
### Implementation Details
- In `Login.jsx`, handle the `requires_2fa` response from the login API and toggle visibility of a new `TwoFactorVerify` component.
- In `Profile.jsx`, wire the "Enable 2FA" toggle to `authService.setup2FA`.
### Validation
- `npm run lint`
- Manual check: Login flow shows 2FA prompt for 2FA-enabled accounts.

## Phase 2: Booking Persistence & Map Integration
### Objective
Ensure booking sessions survive reloads and integrate Google Maps/Membership upgrades.
### Agent: `coder`
### Parallel: No
### Files to Modify
- `frontend/src/context/BookingContext.jsx` — Add `useEffect` to sync state to `sessionStorage` and hydrate on mount.
- `frontend/src/pages/Customer/EventDetail.jsx` — Import and render `GoogleMapLocation` component.
- `frontend/src/pages/Customer/Membership.jsx` — Add "Upgrade Tier" button wired to `membershipService`.
### Implementation Details
- Use `JSON.parse(sessionStorage.getItem('booking_state'))` for initial state in `BookingContext`.
- Ensure `GoogleMapLocation` receives `lat` and `lng` from the event data.
### Validation
- `npm run lint`
- Manual check: Select seats, reload page, seats should remain selected.

## Phase 3: Feedback UI & Notifications
### Objective
Implement Admin Complaints Management, Customer Reviews, and Push Notifications.
### Agent: `coder`
### Parallel: No
### Files to Create
- `frontend/src/pages/Admin/Complaints.jsx` — New admin view for managing feedback.
### Files to Modify
- `frontend/src/pages/Customer/EventDetail.jsx` — Add Reviews section (list + submit form).
- `frontend/src/routes/AppRoutes.jsx` — Register the new Admin Complaints route.
- `frontend/src/App.jsx` — Call `notificationService.registerPush()` on mount.
- `frontend/src/pages/Booking/Checkout.jsx` — Trigger local notification on success.
### Implementation Details
- Create a simple table in `Complaints.jsx` with "Status" update buttons.
- In `EventDetail.jsx`, fetch reviews from the backend and display them below the event info.
### Validation
- `npm run lint`
- Manual check: Submit a review, verify it appears. Submit a complaint, verify it appears in Admin dashboard.

## File Inventory
| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `frontend/src/pages/Auth/Login.jsx` | 1 | Auth UI |
| 2 | `frontend/src/pages/Profile/Profile.jsx` | 1 | 2FA UI |
| 3 | `frontend/src/context/AuthContext.jsx` | 1 | 2FA State |
| 4 | `frontend/src/context/BookingContext.jsx` | 2 | Persistence |
| 5 | `frontend/src/pages/Customer/EventDetail.jsx` | 2, 3 | Map & Reviews |
| 6 | `frontend/src/pages/Customer/Membership.jsx` | 2 | Upgrade UI |
| 7 | `frontend/src/pages/Admin/Complaints.jsx` | 3 | Admin Feedback |
| 8 | `frontend/src/routes/AppRoutes.jsx` | 3 | Route registration |
| 9 | `frontend/src/App.jsx" | 3 | Notification setup |
| 10 | `frontend/src/pages/Booking/Checkout.jsx" | 3 | Success alert |

## Risk Classification
| Phase | Risk | Rationale |
|-------|------|-----------|
| 1 | MEDIUM | Critical auth path; bugs could lock out users. |
| 2 | LOW | Purely additive UI/persistence features. |
| 3 | LOW | UI features for feedback and alerts. |

## Execution Profile
```text
Execution Profile:
- Total phases: 3
- Parallelizable phases: 0
- Sequential-only phases: 3
```
