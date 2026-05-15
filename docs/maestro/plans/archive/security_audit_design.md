# Design Document: TicketRush Security Audit & Remediation

## 1. Overview
This document outlines the security assessment and remediation plan for the TicketRush project. The goal is to identify and address critical vulnerabilities in authentication, authorization, secret handling, and business logic.

## 2. Identified Vulnerabilities & Risks

### 2.1. Broken Authentication (CVSS: 8.1 - High)
- **TOTP 2FA Brute-Force:** No rate limiting on 2FA verification.
- **Credential Leakage:** Password reset tokens are printed to the server console.
- **Weak Secrets:** Default fallback values for `JWT_SECRET` and `X_INTERNAL_SECRET` in `internal/config/config.go`.

### 2.2. Broken Access Control (CVSS: 7.5 - High)
- **Internal API Over-exposure:** `/api/internal/v1/user/profile/:id` relies solely on `X-Internal-Secret` without verifying if the AI agent is authorized for that specific user.

### 2.3. Insecure Storage (CVSS: 6.1 - Medium)
- **JWT in LocalStorage:** Frontend stores JWT in `localStorage`, making it vulnerable to XSS theft.

### 2.4. Business Logic Flaws (CVSS: 9.0 - Critical)
- **Missing Payment Validation:** Checkout and membership upgrades are currently free. There is no integration with a payment gateway or validation of payment success.

## 3. Remediation Strategy

### 3.1. Authentication Fixes
- **Rate Limiting:** Implement rate limiting for 2FA verification endpoints.
- **Log Security:** Remove password reset tokens from console output.
- **Secret Hardening:** Ensure production configurations cannot use weak defaults.

### 3.2. Access Control Hardening
- **Internal API Scoping:** Add context or additional checks to internal APIs to ensure they are used appropriately.

### 3.3. Business Logic Implementation
- **Payment Mock/Integration:** Implement a structure for payment validation, even if it's a "mock" gateway for this prototype, to ensure the flow is secure.

### 3.4. Frontend Security
- **Secure Token Storage:** (Out of scope for this immediate fix, but recommended) Move to HttpOnly cookies for JWT storage.

## 4. Audit Plan

1. **Phase 1: Authentication & Secret Security**
   - Implement rate limiting for 2FA.
   - Fix log leakage.
   - Remove hardcoded fallbacks.
2. **Phase 2: Access Control**
   - Secure internal AI proxy endpoints.
3. **Phase 3: Business Logic Validation**
   - Add payment validation logic to checkout and upgrades.
4. **Phase 4: Final Validation**
   - Run security tests and verify fixes.

## 5. Verification
- Manual verification of rate limits.
- Verification of logs after reset token generation.
- Test internal API access without/with correct headers.
- Verify checkout fails without "payment" confirmation.
