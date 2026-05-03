<img src="TicketRush.png" align="right" width="350" alt="TicketRush Logo">

# TicketRush - E-Ticketing System
### High-Concurrency Event Booking Platform

TicketRush is a professional e-ticketing system specifically engineered to handle "Flash Sale" scenarios—where thousands of users compete for a limited number of tickets in a very short timeframe. The system ensures fairness, data integrity, and a smooth user experience through advanced technical solutions.

---

## Key Features

### Customer Experience
*   **Virtual Queue:** Utilizes Redis to coordinate traffic spikes, preventing system crashes and ensuring a first-come, first-served experience.
*   **Interactive Seat Map:** Intuitive seat map with real-time status updates via WebSockets.
*   **Atomic Booking:** Database-level locking mechanisms ensure that a seat is never sold to two users simultaneously.
*   **Digital Tickets:** Automatic generation of unique QR codes for each ticket upon successful checkout.

### Administrative Tools
*   **Event Design:** Comprehensive tools to set up events and configure complex seat matrices (Zones, Rows, Columns, Pricing).
*   **Real-time Dashboard:** Instant monitoring of revenue, seat occupancy rates, and audience demographics (age, gender).
*   **Ticket Management:** Barcode and QR code scanning for physical entry control.

---

## Tech Stack

| Component | Technology |
| :--- | :--- |
| **Backend** | Go (Golang) + Gin Framework |
| **Database** | PostgreSQL 15 |
| **Caching & Queue** | Redis 7 |
| **ORM** | GORM (with Transaction & Row-level Locking) |
| **Frontend** | React 18, Tailwind CSS, Vite, Axios |
| **Real-time** | WebSockets |
| **DevOps** | Docker, Docker Compose, Versioned Migrations |

---

## System Architecture

The project follows modern software design principles:
*   **Domain-Driven Design (DDD):** Logic is partitioned by domain areas (User, Event, Order) for better maintainability.
*   **Repository Pattern:** Decouples data access logic from business logic.
*   **Concurrency Control:** Implements Pessimistic Locking (SELECT FOR UPDATE) to eliminate race conditions during high-demand periods.
*   **Stateless Authentication:** User verification handled via JSON Web Tokens (JWT).

---

## Quick Start Guide

### 1. Infrastructure Setup
The system requires PostgreSQL and Redis. Start them quickly using Docker Compose:
```bash
docker compose up -d
```

### 2. Launch Backend
The system will automatically apply SQL migrations to set up the database schema on startup:
```bash
go run cmd/server/main.go
```

### 3. Seed Sample Data
To populate the database with initial events and seat maps for testing, run the seed script:
```bash
go run cmd/seed/main.go
```

### 4. Test Accounts
All passwords are `password`:
- **Admin**: `admin@ticketrush.com`
- **Customers**: 
    - `customer@ticketrush.com`
    - `linhchi@gmail.com`
    - `minhduc@gmail.com`

### 5. Launch Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Documentation
*   [Architecture Analysis](ArchitectureAnalysis.md) - Deep dive into concurrency and queue handling.
*   [Database Schema](database/database.md) - Entity Relationship Diagrams and table definitions.
*   [Project Requirements](docs/REQUIREMENT.md) - Detailed grading criteria and functional specifications.

---
**Developed by the TicketRush Team 2026**  
*All rights reserved. This project was developed for educational purposes in the Web Application Development course.*
