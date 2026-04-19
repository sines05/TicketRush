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
To provide a "live" feel, WebSockets are used to broadcast state changes.
- Whenever a seat is locked, sold, or released, the server broadcasts a message: `{ "type": "SEAT_LOCKED", "seat_id": 123 }`.
- The frontend listens to these messages and updates the colors of the seats in the map without requiring a page refresh.

## API Summary
- `POST /auth/register`, `/auth/login`: User management.
- `GET /events`, `GET /events/:id`: Event discovery.
- `POST /api/customer/queue/join`, `GET /api/customer/queue/status`: Virtual queue.
- `POST /api/customer/bookings/lock`: Pessimistic seat locking.
- `POST /api/customer/bookings/:id/pay`: Mock payment confirmation.
- `GET /api/admin/stats`: Real-time business intelligence.
- `POST /api/admin/events`: Event and seating matrix creation.
