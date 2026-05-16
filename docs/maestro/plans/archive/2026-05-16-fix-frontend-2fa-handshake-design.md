---
title: "fix-frontend-2fa-handshake"
created: "2026-05-16T22:05:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "simple"
---

# Fix Frontend 2FA Handshake Design Document

## Problem Statement

The recent backend security hardening changed the 2FA login flow to use a secure, signed `pending_token` instead of a raw `user_id`. However, the frontend components (`Login.jsx`, `AuthContext.jsx`, `authService.js`) were not updated to reflect this contract change. 

Consequently:
1. The frontend's `Login.jsx` is still looking for a `user_id` field in error responses and URL parameters, missing the `pending_token`. This causes it to silently fail to transition to the 2FA input view.
2. If the user uses social login and has 2FA enabled, they are redirected to `/auth/login?pending_token=...`, but the page ignores this parameter.
3. The `verify2FALogin` API call from the frontend is still trying to send `user_id` instead of `pending_token`, which the backend now rejects.

## Requirements

### Functional Requirements

1. **REQ-1**: Update frontend services and context to handle `pending_token` during 2FA verification.
2. **REQ-2**: Update `Login.jsx` to extract `pending_token` from API error responses and URL search parameters.
3. **REQ-3**: Ensure the 2FA input state is correctly activated when a `pending_token` is present.

## Approach

### Selected Approach

**Frontend Contract Alignment**

We will update the frontend to match the new backend contract:
1.  **`authService.js`**: Change the signature of `verify2FALogin(user_id, code)` to `verify2FALogin(pending_token, code)` and update the payload payload to `{ pending_token, code }`.
2.  **`AuthContext.jsx`**: Update the `verify2FA` function signature to pass `pending_token` instead of `userId`.
3.  **`Login.jsx`**:
    - Rename `userId` state to `pendingToken`.
    - Change sessionStorage key from `2fa_user_id` to `2fa_pending_token`.
    - Update the `searchParams` hook to look for `?pending_token=`.
    - Update the error handling in `handleSubmit` to look for `err.data?.pending_token` or `err.pending_token`.
    - Pass `pendingToken` into the updated `verify2FA` context method.

## Architecture

### Data Flow

```
[Backend] --(Returns pending_token)--> [Login.jsx]
                                            |
                                            v (Stores in state & sessionStorage)
                                       [AuthContext.verify2FA(pendingToken, code)]
                                            |
                                       [authService.verify2FALogin(pendingToken, code)]
                                            |
                                            v (API Request)
[Backend] <--(Receives { pending_token, code })
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Frontend component and service updates. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Incomplete Replacement** | MEDIUM | LOW | We will comprehensively search `Login.jsx` for all instances of `2fa_user_id` and `user_id`. |
| **Stale Session Storage** | LOW | MEDIUM | The update naturally ignores the old key and relies on the new `2fa_pending_token` key, effectively rendering the old stale data inert. |

## Success Criteria

1. Logging in with a 2FA-enabled account correctly transitions the UI to the OTP input view.
2. The OTP verification request is successfully accepted by the backend.
3. Social login with a 2FA-enabled account successfully redirects to the OTP input view.
