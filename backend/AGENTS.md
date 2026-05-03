# AGENTS.md - Technical Guide for AI Assistants

This document contains strictly technical instructions and business logic constraints for any AI agent working on the TicketRush project.

## RULE #1: MANDATORY DOCUMENTATION REVIEW
Before performing any task (coding, refactoring, or designing), you MUST read and understand the following documents:
1. [REQUIREMENT.md](docs/REQUIREMENT.md): High-level project requirements, features, and success criteria.
2. [API.md](docs/API.md): API specifications, standard response format, and endpoint logic.
3. [database.md](database/database.md): Database schema, relationships, and indexing strategy.

---

## CORE TECHNICAL ARCHITECTURE

### 1. Concurrency Control (Race Condition Prevention)
Ticket booking involves high concurrency on shared resources (seats).
- Locking Strategy: Use PostgreSQL Row-level Locking (SELECT ... FOR UPDATE).
- Atomic Transactions: Wrapping seat checks and order creation within a single BEGIN...COMMIT block is non-negotiable.
- Workflow:
    1. BEGIN transaction.
    2. SELECT seats WHERE id IN (...) FOR UPDATE.
    3. Verify status = 'AVAILABLE'.
    4. INSERT into orders and order_items.
    5. UPDATE seats SET status = 'LOCKED'.
    6. COMMIT.

### 2. State Management & Lifecycle
- Seat Status:
    - AVAILABLE: Default.
    - LOCKED: Temporary hold (10 minutes).
    - SOLD: Finalized purchase.
- Order Expiration:
    - Orders have an expires_at timestamp (10 minutes from creation).
    - A background task (Cron/Worker) must periodically release LOCKED seats if the order is not COMPLETED by the expiration time.

### 3. Virtual Queue (Redis)
- For high-traffic events, users must join a virtual queue.
- Backend: Use Redis to store queue positions and issue queue_token.
- Verification: POST /orders/lock-seats must verify the X-Queue-Token if the event is in "Queue Mode".

---

## DEVELOPMENT STANDARDS

### 1. Standard Response Format
Every API response MUST follow this structure:
```json
{
  "success": boolean,
  "data": object | array | null,
  "message": "User-facing message",
  "errorCode": "INTERNAL_ERROR_CODE" // Required if success is false
}
```

### 2. Database Integrity
- Always use UUIDs (gen_random_uuid()) for primary keys.
- Ensure all relationships defined in db_design.md are enforced via Foreign Keys.
- Use bulk inserts for seat generation in Admin APIs (e.g., POST /admin/events).

### 3. Error Handling
- Never return raw database errors to the client.
- Map specific SQL errors (e.g., unique constraint violation on seat_id) to meaningful internal error codes (e.g., SEAT_ALREADY_TAKEN).

---

## AGENT BEHAVIORS
- No Placeholders: Do not use // TODO or placeholder code unless explicitly asked for a mockup.
- Persistence: Ensure that locked_by_user_id and locked_at are properly cleared when a seat is released.
- Security: Verify [Auth: Bearer] on all protected routes using a robust JWT strategy.

---

## CODING CONVENTIONS

### 1. Naming Strategy
To ensure consistency across the stack:
- JSON Properties: camelCase (e.g., fullName, orderId).
- Database: snake_case for Table and Column names (e.g., full_name, order_id).
- Code:
    - camelCase for Variables and Functions.
    - PascalCase for Classes, Interfaces, and Enums.
- API: Use plural nouns for resource paths (e.g., /events, /tickets).

### 2. Timezone Consistency
- All timestamps MUST be stored, handled, and transmitted in UTC (ISO 8601) format.
- Format: YYYY-MM-DDTHH:mm:ssZ.

### 3. Type Safety & Documentation
- Strict Typing: Mandatory use of TypeScript types (or Python type hints). Avoid any.
- Self-Documenting Code: Write clear variable names. Use comments only for "Why" (intent), not "What" (logic context).
- JSDoc/Docstrings: Use for complex utility functions and public API handlers.

### 4. API & Pattern Standards
- Statelessness: The backend must be completely stateless. Use JWT for session management.
- Error Mapping: Map database/internal errors to the Standard Response Format (e.g., SQL unique_violation -> errorCode: "EMAIL_ALREADY_EXISTS").
- Atomic Operations: Any logic involving multiple DB changes must be wrapped in a single transaction.

### 5. Testing Requirements
- Unit Tests: Focus on core business logic (Locking, Expiration, Price Calculation).
- Integration Tests: Verify full flows (Join Queue -> Lock Seat -> Checkout).
- Mocking: Mock external services (e.g., Payment Gateway, Email) in tests.
