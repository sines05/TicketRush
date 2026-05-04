# TicketRush API Documentation

## Base URL
`http://localhost:8080/api/v1`

## Standard Response Format
All API responses follow this structure:
```json
{
  "success": boolean,
  "data": object | array | null,
  "message": "User-facing message",
  "errorCode": "INTERNAL_ERROR_CODE" // Only if success is false
}
```

## Authentication
Protected routes require a JWT token in the header:
`Authorization: Bearer <token>`

---

## 1. Auth Endpoints
### Register
`POST /auth/register`
- **Body**: 
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "Nguyen Van A",
  "gender": "MALE",
  "date_of_birth": "1995-01-01"
}
```

### Login
`POST /auth/login`
- **Body**: `{ "email": "...", "password": "..." }`
- **Success Data**: `{ "user_id": "...", "full_name": "...", "role": "CUSTOMER|ADMIN", "access_token": "..." }`

---

## 2. Public Event Endpoints
### List Events
`GET /events`
- **Success Data**: `Array<{ "id": "...", "title": "...", "banner_url": "...", "start_time": "..." }>`

### Event Details
`GET /events/:id`
- **Success Data**: `{ "id": "...", "title": "...", "description": "...", "banner_url": "...", "start_time": "...", "end_time": "..." }`

### Seat Map (Live Status)
`GET /events/:id/seat-map`
- **Success Data**: `Array<{ "zone_id": "...", "zone_name": "...", "price": 500, "seats": [[{ "id": "...", "status": "AVAILABLE|LOCKED|SOLD" }, ...], ...] }>`

---

## 3. Customer Endpoints (Protected)
### Join Virtual Queue
`POST /queue/join`
- **Body**: `{ "event_id": "..." }`
- **Success Data**: `{ "status": "waiting" | "allowed" }`

### Check Queue Status
`GET /queue/status?event_id=...`
- **Success Data**: `{ "status": "waiting" | "allowed", "position": 105 }`

### Lock Seats (Reserve)
`POST /orders/lock-seats`
- **Body**: `{ "event_id": "...", "seat_ids": ["uuid1", "uuid2"] }`
- **Success Data**: `{ "order_id": "...", "total_amount": 1000, "status": "PENDING", "expires_at": "..." }`

### Checkout (Confirm Payment)
`POST /orders/checkout`
- **Body**: `{ "order_id": "..." }`
- **Success Data**: `{ "order_id": "...", "status": "COMPLETED", "ticket_count": 2 }`

### My Tickets
`GET /tickets/my-tickets`
- **Success Data**: `Array<{ "ticket_id": "...", "event_title": "...", "zone_name": "...", "seat_label": "A-1", "qr_code_token": "...", "is_checked_in": false }>`

---

## 4. Admin Endpoints (Admin Only)
### Create Event
`POST /admin/events`
- **Body**: 
```json
{
  "title": "Summer Concert",
  "description": "...",
  "banner_url": "...",
  "start_time": "2026-06-01T20:00:00Z",
  "end_time": "2026-06-01T23:00:00Z",
  "zones": [
    { "name": "VIP", "price": 200, "rows": 5, "cols": 10 },
    { "name": "Standard", "price": 50, "rows": 20, "cols": 50 }
  ]
}
```

### Dashboard Stats
`GET /admin/dashboard/stats?event_id=...`
- **Success Data**: `{ "total_revenue": 50000, "total_sold": 1000, "occupancy_rate": 0.85, ... }`

### Admin Ticket Check-in
`GET /admin/tickets?event_id=...`
- **Success Data**: `Array<{ "ticket_id": "...", "event_title": "...", "zone_name": "...", "seat_label": "A-1", "qr_code_token": "...", "is_checked_in": false }>`

`POST /admin/tickets/check-in`
- **Body**: `{ "qr_code_token": "..." }`
- **Success Data**: `{ "ticket_id": "...", "event_title": "...", "zone_name": "...", "seat_label": "A-1", "qr_code_token": "...", "is_checked_in": true }`

---

## 5. Real-time (WebSocket)
`GET /ws`
- **Protocol**: `ws://localhost:8080/ws`
- **Broadcast Messages**:
  - `{ "type": "SEAT_LOCKED", "seat_id": "..." }`
  - `{ "type": "SEAT_RELEASED", "seat_id": "..." }`
  - `{ "type": "SEAT_SOLD", "seat_id": "..." }`

