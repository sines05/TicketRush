---
title: "Fix Login Flow Security"
created: "2026-05-15T16:05:45Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "complex"
---

# Fix Login Flow Security Design Document

## Problem Statement

The current login flow and authentication mechanisms in TicketRush have critical security vulnerabilities. These include plaintext storage of 2FA secrets, insecure OAuth state cookies, vulnerable JWT storage in LocalStorage (susceptible to XSS), lack of rate limiting (susceptible to brute force), email enumeration risks, weak password policies, and missing token refresh capabilities. These issues collectively pose a high risk of account takeover and data breaches.

## Requirements

### Functional Requirements

1. **REQ-1**: 2FA secrets must be encrypted at rest in the database.
2. **REQ-2**: JWT access tokens must be delivered and stored securely to prevent XSS theft.
3. **REQ-3**: Authentication endpoints must be protected against brute-force attacks.
4. **REQ-4**: Password complexity must be enforced (Min 8 chars, alphanumeric).
5. **REQ-5**: Error messages must not reveal user account existence.

### Non-Functional Requirements

1. **REQ-6**: Security mechanisms must be stateless where possible, or use Redis for distributed state (e.g., rate limiting).
2. **REQ-7**: The system must assume a deployment model where the frontend and backend share a root domain.

### Constraints

- Existing 2FA secrets must not break; a fallback or migration is required.

## Approach

### Selected Approach

**Holistic Security Remediation**
We will address each vulnerability systematically:
- **2FA Encryption**: Implement AES-256-GCM encryption for TOTP secrets using an environment variable master key.
- **JWT Storage**: Transition to HttpOnly, Secure, SameSite=Lax cookies for the Access Token, removing it from LocalStorage. Implement a `/auth/logout` endpoint to clear the cookie.
- **Rate Limiting**: Introduce a Redis-based rate limiting middleware applied to `/login`, `/register`, and `/forgot-password`.
- **Password Policy**: Update validation logic to enforce 8+ characters and alphanumeric complexity.
- **Email Enumeration**: Standardize responses for password reset requests.
- **OAuth State**: Secure the OAuth cookie with `Secure=true`.

### Alternatives Considered

#### Refresh Token Flow
- **Description**: Store a long-lived Refresh Token in an HttpOnly cookie, and keep a short-lived Access Token in memory.
- **Pros**: Enables robust session revocation and limits the blast radius of access token theft.
- **Cons**: Requires additional `/refresh` endpoints and complex frontend logic to silently refresh tokens.
- **Rejected Because**: The scope is disproportionately large for the immediate risk, and SameSite/HttpOnly cookies provide sufficient protection when domains are shared.

### Decision Matrix

| Criterion | Weight | HttpOnly Cookie (Selected) | Refresh Token Flow |
|-----------|--------|----------------------------|--------------------|
| XSS Protection | 40% | 5: Immune to XSS | 4: Refresh token immune, access token vulnerable but short-lived |
| CSRF Protection | 30% | 4: Relies on SameSite (sufficient for shared domain) | 5: Requires API explicit calls |
| Implementation Effort | 30% | 5: Simple change to cookie headers | 2: Requires new endpoints and frontend logic |
| **Weighted Total** | | **4.7** | **3.7** |

## Architecture

### Data Flow (Authentication)
1. User submits credentials.
2. Backend validates credentials against hashed password.
3. Backend generates JWT and sets it as an `HttpOnly`, `Secure`, `SameSite=Lax` cookie in the response. — *[Traces To: REQ-2, REQ-7]* *(considered: LocalStorage — rejected because of XSS vulnerability)*
4. Frontend relies on cookie attachment for subsequent requests.

### Data Flow (2FA)
1. Backend generates TOTP secret.
2. Backend encrypts secret using AES-GCM and `ENCRYPTION_MASTER_KEY` before saving to DB. — *[Traces To: REQ-1]* *(considered: KMS — rejected because it adds unnecessary infrastructure complexity)*
3. On verification, backend decrypts secret and validates OTP.

### Key Interfaces

```go
// Rate Limiter Middleware
func RateLimitMiddleware(redisClient *redis.Client, limit int, window time.Duration) gin.HandlerFunc

// Encryption Utility
func EncryptAES(key []byte, plaintext string) (string, error)
func DecryptAES(key []byte, cryptoText string) (string, error)
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | Encryption utilities, 2FA handler updates |
| 2     | coder    | No       | Auth handler updates (Cookies, Password Policy, Error Msgs) |
| 3     | coder    | No       | Rate limiting middleware and configuration |
| 4     | coder    | No       | Frontend auth service and context updates |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Existing unencrypted 2FA secrets break | HIGH | HIGH | Implement dual-read fallback (try decrypt, if fails use plaintext) until all users are migrated. |
| Frontend loses ability to read token for state | MEDIUM | HIGH | Update `AuthContext.jsx` to rely on an `/api/auth/me` call to hydrate user state instead of reading the token from LocalStorage. |
| CORS/Cookie domain issues | HIGH | LOW | Ensure frontend and backend are configured to send/accept credentials (`withCredentials: true`) and share a root domain. |

## Success Criteria

1. 2FA secrets are no longer visible in plaintext in the database.
2. The JWT is no longer stored in LocalStorage and is transmitted via an HttpOnly cookie.
3. Brute-forcing the login endpoint is prevented by Redis rate limiting.
4. Passwords must be at least 8 alphanumeric characters.
5. All tests pass and the login flow functions smoothly from end to end.