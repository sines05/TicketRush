# TicketRush System Architecture

## Overview
TicketRush is a high-concurrency e-ticketing platform designed to handle "flash sale" scenarios where demand far exceeds supply. The system ensures that seats are never double-booked, waiting queues are prioritized by membership levels, and real-time updates are distributed efficiently.

## Tech Stack
- **Backend (Clean Architecture)**: Golang (Gin, GORM, Go-Redis, Gorilla WebSocket)
- **Database**: PostgreSQL (ACID transactions, Row-level Locking)
- **Cache/Queue**: Redis (Sorted Set for queue, Sets for active pool, Lua scripts)
- **AI Service**: Python (LangGraph, FastAPI, LlamaGuard/Regex)
- **Frontend (SPA)**: React 18, Vite, Tailwind CSS, React Context, TanStack Query

---

## Core Technical Implementations

### 1. Concurrency & Race Condition Prevention (Row Locking)
To prevent the "double-booking" problem under heavy concurrency, TicketRush implements GORM/PostgreSQL **Pessimistic Row-level Locking** within ACID database transactions.

**The Workflow:**
1. **Deadlock Prevention**: The service sorts the requested `seatIDs` alphabetically before starting the database transaction to prevent cyclic lock dependency (deadlocks) under high concurrent bookings:
   ```go
   sort.Slice(seatIDs, func(i, j int) bool {
       return seatIDs[i].String() < seatIDs[j].String()
   })
   ```
2. **Atomic Row Locking**: Initiates a database transaction and requests row-level locks on the selected available seats:
   ```go
   tx.Clauses(clause.Locking{Strength: "UPDATE"}).
       Where("id IN ? AND status = ?", seatIDs, models.SeatAvailable).
       Find(&seats)
   ```
3. **Validation**: If the locked seat count does not match the requested count (i.e. one or more seats were already locked/sold), the transaction is immediately rolled back, returning `SEAT_ALREADY_TAKEN`.
4. **Transition**: If available, the seats' status is updated to `LOCKED`, assigning the user's ID to `locked_by_user_id` and the current timestamp to `locked_at`.
5. **Dynamic Expiration**: The transaction creates a pending order with an expiration timestamp (`expires_at`), which dynamically grants more checkout time to higher VIP membership tiers (+2 minutes per priority level, starting from 10 minutes default).
6. **Commit**: GORM commits the transaction, releasing the database row locks while holding the seat in the `LOCKED` state.

---

### 2. Priority Virtual Queue (Redis Waiting Room)
To shield the PostgreSQL database from collapsing under sudden load spikes (e.g. at the exact millisecond ticket sales start), the system routes all incoming traffic through a **Virtual Queue** in Redis.

**The Architecture:**
1. **Priority Score Calculation**: When a customer joins, they are placed in a Redis Sorted Set (`event:<EventID>:queue`). The sorting score is computed to prioritize VIP members over standard users:
   $$\text{Score} = (10 - \text{PriorityLevel}) \times 10^{18} + \text{Timestamp (Nanoseconds)}$$
2. **Active Pool Control**: The system limits access to the active seat booking map to a configurable threshold (e.g., `ActiveUserThreshold = 100`) via a Redis Set (`event:<EventID>:active`).
3. **Atomic Admission via Lua Script**: A background queue worker ticks every 2 seconds, calling a Lua script to pull the top eligible users from the waiting ZSET and push them to the active set atomically:
   - Evaluates queue size and active set size.
   - Pop elements using `ZRANGE` and `ZREM` atomically to prevent race conditions during admission.
   - Generates a cryptographically secure `queue_token` (stored in `queue_session:<token>` in Redis with TTL) allowing users to bypass rate limit checks and access seat selection.
4. **heartbeat & Status Check**: The client regularly queries `/api/v1/queue/status` to fetch their queue position calculated dynamically as:
   $$\text{Position} = \text{JoinIndex} - \text{ProcessedCounter}$$

---

### 3. Ticket Lifecycle & Worker Cleanup
Seats follow a strict finite state machine: `AVAILABLE` $\rightarrow$ `LOCKED` $\rightarrow$ `SOLD` or `AVAILABLE` (if released).

Two Go background worker routines run continuously to clean up expired resources:
- **Order Expiration Worker (`releaseExpiredOrders`)**: Runs every 1 minute. It queries PostgreSQL for pending orders where `expires_at < NOW()`. It starts a transaction to:
  1. Set the order status to `CANCELLED`.
  2. Perform a bulk update resetting the associated seats back to `AVAILABLE`, clearing the `locked_by_user_id` and `locked_at` fields.
  3. Evict the user from the Redis active set.
  4. Broadcast `SEATS_RELEASED` over WebSockets to all clients.
- **Allowed Session Worker (`ReleaseExpiredSessions`)**: Runs every 1 minute. If a user is admitted to the active seat map but remains idle without initiating any seat selections or orders for **15 minutes 30 seconds**, their queue session is destroyed, freeing a slot in the active set for waiting queue members. Any future booking attempts from their token will be rejected by backend middlewares, forcing them to re-queue.

---

### 4. Real-time WebSocket Synchronization (Room Isolation)
To synchronize seat states on interactive canvases without browser reloads, the backend maintains persistent WebSocket connections coordinated by a centralized WebSocket Hub.

- **Room Isolation**: The hub maps clients into specific rooms using a map structure `channels map[string]map[*Client]bool`. Clients subscribe to topics like `event:<EventID>` or `user:<UserID>`. This ensures seat updates for Event A do not pollute the UI of Event B.
- **Validation**: Subscriptions to events are validated against the Redis Active Pool. Clients who attempt to subscribe directly to real-time seat channels without an active allowed session are blocked.
- **Event Broadcasting**: Real-time broadcasts are dispatched instantly upon successful transactions:
  - `SEATS_LOCKED`: Seat colored red/yellow (held by another user).
  - `SEATS_SOLD`: Seat colored gray (purchased).
  - `SEATS_RELEASED`: Seat colored green (available).

---

## API Routes Summary

### Authentication & Profiles
- `POST /api/v1/auth/register`: Register new customer accounts.
- `POST /api/v1/auth/login`: Login and receive access/refresh tokens.
- `POST /api/v1/auth/setup-2fa` / `POST /api/v1/auth/enable-2fa`: Configure and activate 2FA.
- `POST /api/v1/auth/verify-2fa`: Submit OTP code or recovery codes during login.

### Event & Seating Map
- `GET /api/v1/events`: Paginated event listings.
- `GET /api/v1/events/:id`: Event details.
- `GET /api/v1/events/:id/seat-map`: Retrieve static seat map layout and price metrics.

### Virtual Waiting Room
- `POST /api/v1/queue/join`: Enroll in the event waiting queue.
- `GET /api/v1/queue/status`: Query queue progress metrics.

### Booking & Orders
- `POST /api/v1/orders/lock-seats` (Protected by X-Queue-Token & Auth): Request temporary row locks.
- `POST /api/v1/orders/checkout`: Confirm checkout and generate check-in tickets.
- `POST /api/v1/orders/cancel`: Voluntarily release held seats.

### AI Assistance (Proxy)
- `POST /api/v1/ai/chat` (Go Proxy $\rightarrow$ FastAPI AI Service): Secure chat tunnel with history.

### Admin Dashboard
- `GET /api/v1/admin/dashboard/stats`: Aggregated demographic and financial real-time dashboard.
- `POST /api/v1/admin/events`: Bulk setup events and seating grids (utilizing GORM Bulk Insert for optimal seeding speeds).
- `POST /api/v1/admin/tickets/check-in`: Process ticket QR codes securely at event gates.
