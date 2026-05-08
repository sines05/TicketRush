# Fix OAuth Persistence Design Document

## Problem Statement
The code review identified three critical issues in the OAuth flow:
1. The frontend lacks a route for `/auth/callback`, causing OAuth redirects to fail and send the user to the unauthenticated home page.
2. The `AuthContext` lacks a mechanism to ingest a token from a URL parameter to complete the OAuth login handshake.
3. The backend assigns a dummy password `[OAUTH2_GOOGLE_USER]` to OAuth users, making manual password recovery impossible and confusing profile management.

## Requirements

### Functional Requirements
1. **REQ-1 (Callback Route)**: The frontend must handle the `/auth/callback` route.
2. **REQ-2 (Token Ingestion)**: `AuthContext` must be able to validate and persist a token provided via URL parameters.
3. **REQ-3 (OAuth Modeling)**: The backend `User` model must explicitly track if a user is an OAuth user (e.g., via an `IsOAuth` flag) to conditionally disable password management.

### Constraints
- The fix must maintain compatibility with the existing `AuthContext` structure.
- Database changes must be non-destructive.

## Approach

### Selected Approach
**Frontend Handshake & Backend Flagging**
- **Frontend**: Create an `OAuthCallback.jsx` component mapped to `/auth/callback`. It will read the `token` from URL parameters, call a new `oauthLogin(token)` method in `AuthContext`, and redirect to `/`.
- **Backend**: Add an `IsOAuth` boolean column to the `User` model. Update `GoogleLoginCallback` and `FacebookLoginCallback` to set this flag to `true` when creating new users.

## Agent Team
| Phase | Agent | Parallel | Deliverables |
|-------|-------|----------|--------------|
| 1 | `coder` | No | Add `IsOAuth` to `models.User` and update backend callbacks. |
| 2 | `coder` | No | Add `oauthLogin` to `AuthContext` and create `OAuthCallback.jsx`. |

## Success Criteria
1. Logging in via Google/Facebook successfully redirects to the frontend, persists the session, and shows the user as authenticated.
2. New OAuth users have `IsOAuth = true` in the database.