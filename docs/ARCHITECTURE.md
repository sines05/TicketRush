# TicketRush System Architecture

## Overview
TicketRush is a high-concurrency e-ticketing platform designed to handle "flash sale" scenarios where demand far exceeds supply. The system ensures that seats are never double-booked and that the server remains stable under extreme load.

## Tech Stack
- **Backend**: Golang (Gin, GORM)
- **Database**: PostgreSQL (ACID transactions)
- **Cache/Queue**: Redis (Virtual Queue, Session State)
- **Real-time**: WebSockets (Live seat status)
- **Frontend**: React 18, Tailwind CSS, TanStack Query

## Core Technical Implementations

### 1. Concurrency & Race Condition Prevention
To prevent the "double-booking" problem, TicketRush implements **Pessimistic Locking** at the database level.

**The Flow:**
1. When a user selects seats, the backend initiates a database transaction.
2. It executes: `SELECT * FROM seats WHERE id = ? AND status = 'available' FOR UPDATE`.
3. The `FOR UPDATE` clause locks the specific rows in PostgreSQL. Any other transaction attempting to lock the same rows will block until the first transaction commits or rolls back.
4. Once the lock is acquired, the status is updated to `Locked` with a `locked_until` timestamp (10 minutes).
5. The transaction is committed, releasing the lock but keeping the seat status as `Locked`.

### 2. Virtual Queue Algorithm
To protect the database from crashing during sudden spikes, a **Virtual Queue** is implemented using Redis.

**The Flow:**
1. **Entry**: When a user clicks "Book Now", they call `/api/queue/join`.
2. **Admission Check**: The system checks if the current number of active booking sessions is below a predefined threshold (e.g., 100).
3. **Queueing**: If the threshold is exceeded, the user is added to a Redis Sorted Set (`ZADD event:queue <timestamp> <user_id>`).
4. **Polling**: The frontend polls `/api/queue/status`. The backend returns the user's rank using `ZRANK`.
5. **Admission**: A background worker periodically moves the top N users from the queue to the `active` set, granting them access to the booking page.

### 3. Ticket Lifecycle & Auto-Release
Tickets follow a state machine: `Available` $\rightarrow$ `Locked` $\rightarrow$ `Sold` / `Available`.

- **Locked**: Seats are held for 10 minutes for payment.
- **Auto-Release**: A background Go worker runs every minute, scanning for seats where `status = 'locked' AND locked_until < NOW()`. These seats are automatically reset to `available` and a WebSocket broadcast is sent to all clients.

### 4. Real-time Synchronization
To provide a "live" feel, WebSockets are used to broadcast state changes. To maintain Clean Architecture (SOLID), the `OrderService` uses a `Broadcaster` interface to send messages without coupling directly to the WebSocket Hub.
- The server broadcasts messages when seats change states:
  - `{ "type": "SEAT_LOCKED", "seat_id": "uuid" }` (When a user successfully reserves seats)
  - `{ "type": "SEAT_SOLD", "seat_id": "uuid" }` (When an order is successfully checked out)
  - `{ "type": "SEAT_RELEASED", "seat_id": "uuid" }` (When an order expires and seats are freed)
- The frontend listens to these messages and updates the colors of the seats in the map without requiring a page refresh.

## API Summary
- `POST /api/v1/auth/register`, `/api/v1/auth/login`: User management.
- `GET /api/v1/events`, `GET /api/v1/events/:id`: Event discovery.
- `POST /api/v1/queue/join`, `GET /api/v1/queue/status`: Virtual queue.
- `POST /api/v1/orders/lock-seats`: Pessimistic seat locking.
- `POST /api/v1/orders/checkout`: Payment confirmation and ticket generation.
- `GET /api/v1/tickets/my-tickets`: User's purchased tickets.
- `GET /api/v1/admin/dashboard/stats`: Real-time business intelligence.
- `POST /api/v1/admin/events`: Event and seating matrix creation.
