---
title: "Security and Logic Fixes"
created: "2026-05-19"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "complex"
---

# Security and Logic Fixes Design Document

## Problem Statement

The TicketRush application contains multiple security vulnerabilities spanning authorization (BOLA), authentication (2FA bypass, inconsistent optional auth), secrets management (hardcoded JWT/Internal secrets), rate-limiting bypass via proxy configuration, and lack of CSRF protection. These vulnerabilities expose the system to cross-user data access, unauthorized API usage, and brute-force attacks.

## Requirements

### Functional Requirements

1. **REQ-1**: Order checkout must verify user ownership.
2. **REQ-2**: Internal AI APIs must enforce `X-User-ID` matching.
3. **REQ-3**: Refresh tokens must correctly evaluate 2FA status.
4. **REQ-4**: AI Agent must reject requests missing `X_INTERNAL_SECRET`.
5. **REQ-5**: Optional auth middleware must check cookies.
6. **REQ-6**: Password reset tokens must be hashed in the database.

### Non-Functional Requirements

1. **REQ-N1**: Secrets must fail-fast on startup if missing (no insecure fallbacks).
2. **REQ-N2**: Rate limiter must not be bypassable via spoofed IPs.
3. **REQ-N3**: State-changing endpoints must have CSRF mitigations.

### Constraints

- Fixes must be surgical and avoid large-scale architectural rewrites.

## Approach

### Selected Approach

**Surgical Security Patching**

We will implement targeted patches for each identified vulnerability:
- **BOLA**: Enforce ownership checks in `order_service.Checkout` and make `X-User-ID` mandatory with strict verification in `ai_internal_handler`. — *[Addresses REQ-1, REQ-2]*
- **2FA Refresh**: Update `auth_service.RefreshToken` to evaluate the user's actual 2FA status instead of hardcoding `true`. — *[Addresses REQ-3]*
- **AI Auth**: Remove `None` defaults in `ai-agent/main.py` to enforce strict secret validation. — *[Addresses REQ-4]*
- **Secrets**: Remove `super-secret` fallback from `config.go` and implement startup validation (panic if missing). — *[Addresses REQ-N1]*
- **Proxy/Rate Limit**: Change `SetTrustedProxies(nil)` to `SetTrustedProxies([]string{"127.0.0.1"})` (or specific local subnets) to prevent IP spoofing. — *[Addresses REQ-N2]*
- **Reset Tokens**: Hash reset tokens using SHA-256 in `auth_service` before storing them in the DB, and hash incoming tokens during verification. — *[Addresses REQ-6]*
- **Middleware/CSRF**: Update `optional_auth_middleware` to check the `tr_access_token` cookie. For CSRF, enforce a strict `Origin` / `Referer` validation middleware on state-changing API endpoints, leveraging existing CORS infrastructure. — *[Addresses REQ-5, REQ-N3]*

### Alternatives Considered

#### Full Architectural Rewrite
- **Description**: Rewrite the authentication and authorization layers entirely.
- **Pros**: Holistic security posture.
- **Cons**: Disproportionate effort, high risk of regressions.
- **Rejected Because**: The current vulnerabilities are distinct and patchable; a full rewrite violates the constraint to avoid unnecessary churn.

### Decision Matrix

| Criterion | Weight | Surgical Patching | Full Rewrite |
|-----------|--------|-------------------|--------------|
| Security Efficacy | 40% | 4: Fixes all known issues | 5: Systemic improvement |
| Risk of Regression | 30% | 4: Low risk, targeted | 1: High risk |
| Speed to Delivery | 30% | 5: Fast | 1: Very slow |
| **Weighted Total** | | **4.3** | **2.6** |

## Architecture

### Component Diagram

```
[API Gateway / Router]
      | (CSRF/Origin Check, Proxy IP Validation)
      v
[Auth Middleware] --> (Cookie + Header, 2FA Validation)
      |
[Business Logic]
      | (BOLA checks in Order Service & Internal Handlers)
      v
[Database] (Hashed Reset Tokens)
```

### Data Flow

1. Request enters router, `RateLimitMiddleware` accurately identifies client IP.
2. `CSRFMiddleware` verifies Origin/Referer for state changes.
3. `OptionalAuthMiddleware` extracts token from cookie or header.
4. `auth_service.RefreshToken` generates new tokens retaining correct 2FA state.
5. Handlers enforce resource ownership (`user_id` matches context).

### Key Interfaces

```go
func (s *orderService) Checkout(ctx context.Context, userID uuid.UUID, orderID uuid.UUID) (*models.Order, error)
func (h *AIInternalHandler) GetUserOrders(c *gin.Context)
func (s *authService) RefreshToken(oldRefreshToken string) (string, string, error)
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | security_engineer | No | Implementation of patches |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Breaking valid user sessions during 2FA fix | HIGH | LOW | Maintain backward compatibility for valid JWT structures; only restrict issuance logic. |
| Startup crashes due to missing secrets | MEDIUM | HIGH | Clear documentation and deployment checks to ensure `.env` is properly populated before launch. |
| AI Agent breaking due to strict secret check | MEDIUM | MEDIUM | Ensure `.env` for AI Agent container specifies `X_INTERNAL_SECRET` correctly. |

## Success Criteria

1. Order checkout and internal APIs reject unauthorized access.
2. Token refresh accurately respects 2FA requirements.
3. Password reset tokens are securely hashed at rest.
4. Rate limiting functions correctly under proxied traffic.
