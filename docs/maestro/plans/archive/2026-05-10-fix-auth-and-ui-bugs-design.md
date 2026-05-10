---
title: \"Fix Authentication Redirects and UI Contrast\"
created: \"2026-05-10T02:50:00Z\"
status: \"approved\"
authors: [\"TechLead\", \"User\"]
type: \"design\"
design_depth: \"standard\"
task_complexity: \"complex\"
---

# Fix Authentication Redirects and UI Contrast Design Document

## Problem Statement

TicketRush is experiencing critical bugs affecting user authentication and visual accessibility:
1.  **Google Login Redirect Failure**: Users with 2FA enabled are redirected to the home page in an unauthenticated state because the required `/auth/2fa` route is missing from the frontend.
2.  **Invisible Text**: Secondary text and placeholders are nearly white on light backgrounds because the `--tr-muted` variable has insufficient contrast (96.1% lightness).
3.  **Mock Logic Deadlock**: The mock authentication service fails to provide user data during login because of synchronization issues between `getMe` and `localStorage`.

## Requirements

### Functional Requirements
1.  **REQ-1**: Successful redirect from Google Auth to 2FA verification if enabled.
2.  **REQ-2**: High-contrast readable text for all UI elements (min 4.5:1 ratio).
3.  **REQ-3**: Reliable mock authentication for development/demo mode.

### Non-Functional Requirements
1.  **Security**: Maintain secure 2FA token handling during redirects.
2.  **Performance**: No impact on frontend loading speed.

### Constraints
-   Backend Go source code remains untouched.
-   Fixes must integrate with the existing Tailwind/Shadcn system.

## Approach

### Selected Approach: **Synchronized System Fix**

1.  **Frontend Routing**: Map `/auth/2fa` to the `Login` component in `AppRoutes.jsx`.
2.  **HSL Color Refinement**: Introduce `--tr-muted-foreground` in `index.css` with a darker HSL value (~45% lightness).
3.  **Tailwind Configuration**: Add `muted-foreground` to `tailwind.config.js` and ensure it maps to the new HSL variable.
4.  **Mock Service Patch**: Update `userService.js` to return stable mock data when a token is detected.

## Architecture

### Data Flow
`Google Auth (OAuth)` -> `Backend Redirect (/api/v1/auth/google/callback)` -> `Frontend Navigation (/auth/2fa?user_id=...)` -> `Login.jsx (requires2FA=true)` -> `Authentication Success`.

### Key Interfaces
- **AppRoutes.jsx**: Maps URL paths to components.
- **index.css**: Central repository for design system tokens.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | CSS & Route Fixes |
| 2     | tester   | No       | Verification Report |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| UI Regressions | MEDIUM | LOW | Manual verification across viewports and themes. |
| Redirect Loop | LOW | MEDIUM | Ensure AppRoutes wildcard doesn't override /auth/2fa. |

## Success Criteria
1. Google Login users can reach the 2FA screen.
2. All labels and muted text are clearly visible in light mode.
3. No authentication errors in mock mode.
