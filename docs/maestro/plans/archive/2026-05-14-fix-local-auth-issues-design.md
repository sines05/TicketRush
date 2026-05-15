---
title: "Fix Local Authentication Issues"
created: "2026-05-14T07:00:00.000Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Fix Local Authentication Issues Design Document

## Problem Statement

The TicketRush frontend application is experiencing issues with Authentication (Login, Registration, and Google OAuth) in the local development environment. 

1. **Login & Registration:** In local development (outside of Docker), the frontend evaluates `VITE_USE_MOCK` as `true` by default because it is not explicitly set to `'false'` in a local `.env` file. This causes the application to use hardcoded mock logic rather than hitting the backend API.
2. **Google Auth:** The Google OAuth flow is likely failing due to missing or misconfigured `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, or `GOOGLE_REDIRECT_URL` environment variables in the local `.env` file, which prevents the backend from generating a valid Google Login URL or exchanging the auth code.

## Requirements

### Functional Requirements
1. **REQ-1**: Local development without Docker must default to hitting the real backend API for Login and Registration unless explicitly instructed to use mock data.
2. **REQ-2**: Google OAuth must function correctly in local development, meaning the backend requires valid Google credentials and the frontend must direct to the correct backend route.

### Non-Functional Requirements
1. **REQ-3**: The `USE_MOCK` flag logic should be intuitive (e.g., explicitly `true` to enable mocks, rather than enabling mocks when undefined).

### Constraints
- The backend `.env` must contain valid `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- The frontend `.env` configuration should be simple to set up for new developers.

## Approach

### Selected Approach

**1. Refactor Frontend Mock Logic & Setup Local Environment:**
- Change the `USE_MOCK` boolean logic in `frontend/src/services/authService.js` to evaluate to `true` **only if** `import.meta.env.VITE_USE_MOCK === 'true'`. This safely defaults the app to using the real API unless mocks are explicitly enabled.
- Ensure `frontend/.env.example` provides the correct default configurations.

**2. Backend Google OAuth Validation & Error Handling:**
- In `internal/handler/auth_handler.go` or `config.go`, check if `GOOGLE_CLIENT_ID` is empty. If it is, return a clear, descriptive HTTP 500 error from the GoogleLogin handler explaining that credentials are not configured, rather than failing silently or redirecting to an invalid Google URL.

### Alternatives Considered

#### Keep Mocks as Default for Local
- **Description**: Leave `USE_MOCK` as defaulting to true, but instruct developers to create `.env.local` to disable it.
- **Rejected Because**: It leads to confusion, as real backend features (like registration returning a 201) are masked by the frontend mock delay and fake data, causing developers to think the auth flow is broken.

## Architecture

### Data Flow for Auth

**Login/Registration:**
1. Frontend `AuthService` checks `USE_MOCK`.
2. Since `VITE_USE_MOCK` is not explicitly `'true'`, it skips the mock block.
3. Frontend makes a `POST /api/v1/auth/login` to the Backend.
4. Backend verifies credentials against PostgreSQL and returns a JWT.

**Google OAuth:**
1. Frontend `socialLogin('google')` redirects the browser to `GET /api/v1/auth/google/login`.
2. Backend `GoogleLogin` handler checks if OAuth is configured. If not, it returns a 500 JSON error. If configured, it generates a state cookie and redirects to Google.
3. User authenticates on Google.
4. Google redirects back to `GET /api/v1/auth/google/callback`.
5. Backend exchanges the code for a profile, creates/updates the user, generates a JWT, and redirects the browser back to `http://localhost:5173/auth/callback?token=...`.

### Key Interfaces

```javascript
// frontend/src/services/authService.js
// Old: const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
// New:
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
```

```go
// internal/handler/auth_handler.go
func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	if h.cfg.GoogleClientID == "" {
		utils.SendError(c, http.StatusInternalServerError, "Google OAuth is not configured on the server", "OAUTH_NOT_CONFIGURED")
		return
	}
    // ... proceed with state generation and redirect
}
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Updated `authService.js` mock logic and `auth_handler.go` OAuth validation guards. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Silent failure in local dev if API is down | LOW | HIGH | The previous phase added UI error handling, so if `USE_MOCK` is disabled and the local API is unreachable, the UI will gracefully show an error state rather than silently failing. |

## Success Criteria

1. In local development (without `VITE_USE_MOCK=true`), logging in or registering triggers real backend requests rather than simulated mock delays.
2. Attempting to click "Login with Google" when backend credentials are not set results in a clear error response rather than a broken redirect or silent failure.
