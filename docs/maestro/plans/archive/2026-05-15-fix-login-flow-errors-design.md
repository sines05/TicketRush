---
title: "Fix Login Flow Integration Errors"
created: "2026-05-15T16:38:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "complex"
---

# Fix Login Flow Integration Errors Design Document

## Problem Statement

Recent security updates to the TicketRush authentication flow introduced several integration issues between the frontend and backend. Specifically, the frontend crashes on registration because the backend returns null data instead of a user object. Additionally, 2FA verification responses omit the user's email, corrupting the frontend state. Furthermore, the backend exposes raw, unprofessional Go validation errors (e.g., "failed on the 'min' tag") to the user, and the frontend lacks its own client-side validation to catch these errors early. Password complexity errors in the backend also incorrectly trigger HTTP 500 responses instead of 400 Bad Requests.

## Requirements

### Functional Requirements

1. **REQ-1**: The `/register` endpoint must return the created user object in the response payload.
2. **REQ-2**: The `/verify-2fa-login` endpoint must return the complete user object, including the email address.
3. **REQ-3**: The backend must translate raw validation errors into user-friendly messages and return them in a standardized, field-level format (e.g., `details` map).
4. **REQ-4**: Password complexity violations in the service layer must result in an HTTP 400 Bad Request response.
5. **REQ-5**: The frontend registration and login forms must implement custom state-based client-side validation before submitting to the backend.

### Non-Functional Requirements

1. **REQ-6**: Error handling changes must not disrupt existing valid API contracts.
2. **REQ-7**: Frontend validation must match the backend's complexity rules (minimum 8 characters, alphanumeric).

### Constraints

- Do not introduce large new frontend dependencies (e.g., react-hook-form/zod) for validation at this stage; use custom React state logic.

## Approach

### Selected Approach

**Standardized Payload & Custom State Validation**

We will address the integration issues holistically across both ends:
- **Backend Error Standardization**: We will enhance `utils.Response` to include a `Details` map. In `auth_handler.go`, we will intercept Gin binding errors, translate them into friendly messages, and map domain errors (like weak passwords) to 400 Bad Request.
- **Frontend Validation**: We will implement custom state-based validation in `Register.jsx` and `Login.jsx` to enforce the 8+ alphanumeric password rule before making API calls.
- **Data Completeness**: We will update the `Register` and `Verify2FALogin` handlers to ensure they return the complete user DTO, resolving the frontend crashes and corrupted state.
- **OAuth Verification**: Ensure that Google and Facebook login flows continue to function correctly with the new standardized error handling and cookie mechanisms.

### Alternatives Considered

#### Basic String Mapping
- **Description**: Use Gin's built-in binding errors and pass them through as a single message string.
- **Pros**: Quickest to implement.
- **Cons**: Generic strings are harder to map to specific form fields in the UI.
- **Rejected Because**: It does not provide the professional, field-level feedback required for a good user experience.

### Decision Matrix

| Criterion | Weight | Standardized Payload (Selected) | Basic String Mapping |
|-----------|--------|---------------------------------|----------------------|
| UX / Professionalism | 40% | 5: Structured field-level errors allow precise UI feedback | 3: Generic strings are harder to map to specific form fields |
| Implementation Effort | 30% | 3: Requires updating the utils package and handler logic | 5: Quickest to implement |
| Maintainability | 30% | 5: Sets a clear pattern for future endpoints | 2: Inconsistent handling across the app |
| **Weighted Total** | | **4.4** | **3.3** |

## Architecture

### Data Flow (Validation)
1. Frontend performs pre-submission validation (e.g., checks if password is 8+ chars).
2. If validation fails, frontend displays inline errors. — *[Prevents unnecessary API calls]*
3. If valid, frontend submits payload.
4. Backend Gin binding checks constraints. If failed, it extracts the field name, translates the error (e.g., "min" -> "Must be at least 8 characters"), and returns a 400 with a `Details` map. — *[Traces To: REQ-3]*
5. Backend service logic runs. If domain validation fails (e.g., password regex), handler maps error to 400 and returns. — *[Traces To: REQ-4]*

### Key Interfaces

```go
// utils/response.go
type Response struct {
	Success   bool              `json:"success"`
	Data      interface{}       `json:"data"`
	Message   string            `json:"message"`
	ErrorCode string            `json:"errorCode,omitempty"`
	Details   map[string]string `json:"details,omitempty"` // New field
}

func SendValidationError(c *gin.Context, err error)
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | Backend validation translation & data completeness |
| 2     | coder    | No       | Frontend client-side validation & error handling |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Breaking other endpoints relying on `utils.Response` | HIGH | LOW | The new `Details` field is `omitempty`, so existing responses without details will not change their JSON shape. |
| Validation logic drift between FE and BE | MEDIUM | MEDIUM | Ensure the regex used in the frontend exactly matches the backend's `validatePassword` logic. Document the rule clearly. |
| Incomplete error mapping | LOW | HIGH | If a new validation tag is added later without translation, it might return a generic message. The translation function should have a fallback default message. |

## Success Criteria

1. Registering a new user succeeds without a frontend crash, and the user is automatically logged in (if applicable based on the flow).
2. Completing 2FA login successfully updates the frontend state with the user's email and role.
3. Submitting a weak password to `/register` or `/login` results in a user-friendly error message, not a raw Go validator string.
4. The frontend prevents submission of obviously invalid forms (e.g., password < 8 chars) without hitting the backend.
5. Password complexity errors from the backend return HTTP 400 Bad Request.
6. Google and Facebook social login flows operate accurately without regression.