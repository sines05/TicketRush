---
title: "harden-2fa-security"
created: "2026-05-16T21:40:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Harden 2FA Security Design Document

## Problem Statement

The security audit identified two major vulnerabilities in the 2FA system:
1. **Insecure Decryption Fallback (Critical)**: The `decrypt2FASecret` function falls back to returning the raw secret if AES decryption fails. This exposes the system to stored plaintext secrets and undermines the encryption at rest strategy. 
2. **2FA Login Bypass/Brute-force (Major)**: The `Verify2FALogin` endpoint accepts only a `user_id` and an OTP code. It lacks a cryptographically signed state confirming that the user successfully completed the first factor (password) moments ago. This allows attackers to brute-force OTPs for any user without knowing their password. Additionally, there is no rate limiting on OTP attempts.

## Requirements

### Functional Requirements

1. **REQ-1**: Remove the plaintext fallback from `decrypt2FASecret` and ensure it strictly requires successful decryption.
2. **REQ-2**: Provide a migration script/command to find any plaintext 2FA secrets in the database and encrypt them using the master key.
3. **REQ-3**: Implement a short-lived (e.g., 5 minutes) `2FA_Pending_Token` returned upon successful password validation. `Verify2FALogin` must strictly require this token to proceed.
4. **REQ-4**: Apply rate limiting to the `Verify2FALogin` endpoint (e.g., max 5 attempts per 15 minutes) using the existing Redis rate limiter.

## Approach

### Selected Approach

**Signed Pending Token & Strict Decryption**

1.  **Strict Decryption**: Remove the plaintext fallback in `auth_service.go`'s `decrypt2FASecret`. Any decryption failure will now result in an error.
2.  **Stateful 2FA Verification**: When a user correctly enters their password but has 2FA enabled, the `Login` flow will generate a short-lived (5 min) JWT `2FA_Pending_Token` containing their `user_id` and an `intent: 2fa_login` claim. This token is returned to the client instead of the raw `user_id`.
3.  **Secure Verification Endpoint**: The `Verify2FALogin` endpoint will be updated to accept the `pending_token` instead of `user_id`. It will decode and validate the token before checking the OTP.
4.  **Rate Limiting**: We will apply the existing `RateLimitMiddleware` (e.g., 5 requests per 15 minutes) to the `POST /verify-2fa` route in `cmd/server/main.go`.
5.  **Data Migration**: We will create a standalone CLI script (`cmd/migrate_2fa/main.go`) that iterates over users, identifies plaintext 2FA secrets (those that fail decryption), and securely encrypts them.

### Alternatives Considered

#### Session-based Verification (Redis)
- **Description**: Instead of returning a JWT `2FA_Pending_Token`, store the pending state in Redis mapped to a random UUID session ID.
- **Pros**: Instantly revocable, avoids token manipulation.
- **Cons**: Adds another layer of state to Redis just for a 5-minute login window. The JWT approach is stateless, perfectly suited for short-lived intents, and consistent with our existing architecture.
- **Rejected Because**: JWT is simpler, requires no additional database calls during verification, and is inherently self-expiring.

### Decision Matrix

| Criterion | Weight | Signed Pending Token (JWT) | Session-based (Redis) |
| :--- | :--- | :--- | :--- |
| **Security (Anti-Brute Force)** | 40% | 5: Cryptographically secure | 5: Secure and revocable |
| **Simplicity & Performance** | 30% | 5: Stateless, no DB calls | 3: Requires Redis I/O |
| **Architectural Consistency** | 30% | 4: Aligns with JWT use | 4: Aligns with Redis use |
| **Weighted Total** | | **4.7** | 4.1 |

## Architecture

### Data Flow

```
[User] --(Email+Password)--> [Login API]
                               | (Password Correct, 2FA Enabled)
                               v
[Login API] --(Returns 2FA_Pending_Token)--> [User/Frontend]
                                                  |
[User/Frontend] --(2FA_Pending_Token + OTP)--> [Verify2FALogin API]
                                                  | (Rate Limited)
                                                  | (Validate Token)
                                                  | (Decrypt Secret & Verify OTP)
                                                  v
[Verify2FALogin API] --(Access & Refresh Tokens)--> [User/Frontend]
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Migration script implementation. |
| 2     | `coder`  | No       | Service logic updates and token generation/validation. |
| 3     | `tester` | No       | Test writing for migration and 2FA flow. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Existing Users Locked Out** | HIGH | LOW | If the migration script misses users with plaintext secrets, they won't be able to log in. **Mitigation**: We will write tests for the migration script and ensure the migration logic gracefully handles base64 decoding errors (which indicates plaintext). |
| **Pending Token Reuse** | MEDIUM | LOW | A pending token could be intercepted and reused. **Mitigation**: The token will have a very short expiration (5 minutes) and is single-use for the login flow. We will consider adding `jti` (JWT ID) if strict single-use is required, but the short expiration paired with OTP (which changes every 30s) mitigates replay attacks. |
| **Rate Limit Blocking Legitimate Users** | LOW | LOW | A legitimate user failing 2FA multiple times might be blocked. **Mitigation**: 5 attempts per 15 minutes is a standard threshold. If blocked, the user can use a recovery code or wait. |

## Success Criteria

1. `decrypt2FASecret` correctly fails when presented with unencrypted data.
2. The `Verify2FALogin` endpoint rejects requests lacking a valid `2FA_Pending_Token`.
3. The migration script correctly encrypts all plaintext 2FA secrets without altering already-encrypted ones.
4. OTP brute-forcing is blocked by rate limits and the pending token requirement.
