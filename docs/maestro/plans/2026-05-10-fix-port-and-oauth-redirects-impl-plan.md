# Implementation Plan - Fix Backend Port and OAuth Redirects

## Objective
Correct the backend port from 8081 to 8080 as requested and ensure all OAuth redirect URLs are synchronized with this port.

## Proposed Changes
1.  **Environment Configuration**: Update `.env` and `.env.example` to set `PORT=8080`.
2.  **OAuth Redirects**: Ensure `GOOGLE_REDIRECT_URL` in both environment files uses port 8080.
3.  **Verification**: Confirm the server starts on port 8080 and OAuth redirects point to the correct endpoint.

## Phases

### Phase 1: Environment Synchronization
- **Agent**: `coder`
- **Files**:
    - `.env`
    - `.env.example`
- **Tasks**:
    - Update `PORT` to `8080`.
    - Update `GOOGLE_REDIRECT_URL` to `http://localhost:8080/api/v1/auth/google/callback`.
- **Validation**: `go vet ./...`

### Phase 2: Verification
- **Agent**: `tester`
- **Tasks**:
    - Verify that the server configuration loads port 8080 correctly.
- **Validation**: `go test ./internal/config/...` (if tests exist) or simple check.
