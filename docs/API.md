# TicketRush API Documentation

## Base URL
`http://localhost:8080`

## Authentication
All protected routes require a JWT token in the header:
`Authorization: Bearer <token>`

---

## Auth Endpoints
### Register
`POST /auth/register`
**Body**: `{ "username": "...", "password": "...", "gender": "...", "age": 25 }`

### Login
`POST /auth/login`
**Body**: `{ "username": "...", "password": "..." }`

---

## Public Event Endpoints
### List Events
`GET /events`
**Response**: `Array<Event>`

### Event Details
`GET /events/:id`
**Response**: `Event` (includes Zones and Seats)

---

## Customer Endpoints
### Join Virtual Queue
`POST /api/customer/queue/join`
**Body**: `{ "event_id": 1 }`
**Response**: `{ "status": "waiting" | "allowed" }`

### Check Queue Status
`GET /api/customer/queue/status?event_id=1`
**Response**: `{ "status": "waiting", "position": 105 }`

### Lock Seats
`POST /api/customer/bookings/lock`
**Body**: `{ "event_id": 1, "seat_ids": [10, 11] }`
**Response**: `{ "booking_id": 500 }`

### Confirm Payment (Mock)
`POST /api/customer/bookings/:id/pay`
**Response**: `{ "message": "payment successful" }`

### Get My Ticket
`GET /api/customer/bookings/:id`
**Response**: `Booking` (includes Tickets)

---

## Admin Endpoints
### Create Event
`POST /api/admin/events`
**Body**: 
```json
{
  "name": "Summer Concert",
  "description": "...",
  "date": "2026-06-01T20:00:00Z",
  "location": "Stadium A",
  "zones": [
    { "name": "VIP", "price": 200, "rows": 5, "cols": 10 },
    { "name": "General", "price": 50, "rows": 20, "cols": 50 }
  ]
}
```

### Get Admin Stats
`GET /api/admin/stats`
**Response**: `{ "total_revenue": 50000, "total_sold": 1000, "gender_dist": [...], "age_dist": [...] }`
