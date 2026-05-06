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

## Quick Start Guide (Docker - Recommended)

### Prerequisites
- Docker & Docker Compose installed
- Copy `.env.example` to `.env` (or use defaults for Docker)

### One-Command Setup
The entire system (PostgreSQL, Redis, Backend, Frontend) starts automatically with **fresh database seeding** on every run:

```bash
docker compose up --build
```

✅ **What happens automatically:**
- Builds backend and frontend images
- Starts PostgreSQL (port 5433), Redis (port 6379), Backend (port 8080), and Frontend (port 5173)
- Entrypoint waits for PostgreSQL to be ready
- **Drops all tables** and runs fresh migrations
- **Seeds rich sample data**: 6 events with banner images (Jack 97, Sơn Tùng M-TP, Rap Việt All-Star, Hà Anh Tuấn, Ravolution EDM Festival, Mỹ Tâm), 10 users, zones, seats, sample orders & tickets
- Backend API available at: `http://localhost:8080`
- Frontend available at: `http://localhost:5173`

> **Note:** Every `docker compose up` on a fresh volume will re-seed the database. Use `docker compose down -v` to wipe volumes and start completely fresh.

### Sample Events (Auto-Seeded)
| Event | Category | Zones | Banner |
| :--- | :--- | :--- | :--- |
| Jack - J97: Đom Đóm In The Stars | Âm nhạc & Lễ hội | VVIP, VIP, Standard A, Standard B | ✅ |
| Sơn Tùng M-TP: Sky Tour 2026 | Âm nhạc & Lễ hội | Diamond, VVIP, VIP, General A, General B | ✅ |
| Rap Việt All-Star Concert 2026 | Âm nhạc & Lễ hội | VIP Standing, Premium Seated, Standard | ✅ |
| Hà Anh Tuấn: Sketch A Rose | Âm nhạc & Lễ hội | Hạng Nhất, Hạng Nhì, Hạng Ba | ✅ |
| Ravolution Music Festival 2026 | Giải trí & Trải nghiệm | Backstage Pass, VIP Area, General Admission | ✅ |
| Mỹ Tâm: Tri Ân (Draft) | Âm nhạc & Lễ hội | VIP, Standard | ✅ |

### Test Accounts (Password: `password`)
| Role | Email | Status |
| :--- | :--- | :--- |
| **Admin** | `admin@ticketrush.com` | Full access |
| **Customer** | `customer@ticketrush.com` | Has sample orders |
| **Customer** | `linhchi@gmail.com` | Has sample orders |
| **Customer** | `minhduc@gmail.com` | Has PENDING order |
| **Customer** | `thuytrang@gmail.com` | Has sample orders |
| **Customer** | `hoangnam@gmail.com` | Has sample orders |
| **Customer** | `ngocanhh@gmail.com` | Has sample orders |
| **Customer** | `quanghai@gmail.com` | Has sample orders |
| **Customer** | `thanhhuyen@gmail.com` | Has sample orders |
| **Customer** | `ducmanh@gmail.com` | Has sample orders |

### Stop & Clean Up
```bash
# Stop running containers
docker compose down

# Stop and remove all data (fresh seed next time)
docker compose down -v
```

---

## Manual Setup (Without Docker)

### 1. Infrastructure Setup
Ensure PostgreSQL 15 and Redis 7 are installed and running locally.

### 2. Launch Backend
```bash
go run cmd/server/main.go
```

### 3. Seed Sample Data (Optional)
```bash
go run cmd/seed/main.go
```

### 4. Launch Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Updating Database Sample Data

### Scenario 1: Update Auto-Seed Data (Docker - Fresh Database)
**When:** You want to change the sample events, users, or seats before first-time setup.

**How:** Edit [internal/repository/seeder.go](internal/repository/seeder.go), then rebuild containers:
```go
// Example: In seeder.go, modify this section
events := []models.Event{
    {
        Title:       "Your Event Name",
        Description: "Your description",
        Category:    "MUSIC",
        IsFeatured:  true,
        IsPublished: true,
        StartTime:   time.Date(2026, 6, 15, 20, 0, 0, 0, time.UTC),
        // ... modify fields
    },
    // Add more events
}
```

Then restart Docker:
```bash
docker compose down -v  # Remove old volumes
docker compose up --build  # Auto-seed with new data
```

### Scenario 2: Add More Data to Existing Docker Container
**When:** You want to add additional events/users without removing existing data.

**How:** Enter the database container directly:
```bash
# Connect to PostgreSQL container
docker exec -it ticketrush-db psql -U user -d ticketrush

# Now you can run SQL commands
INSERT INTO events (title, description, category, is_featured, is_published, start_time, end_time, created_at, updated_at) 
VALUES ('New Event', 'Description', 'MUSIC', true, true, NOW(), NOW() + interval '3 hours', NOW(), NOW());
```

### Scenario 3: Re-Seed Entire Database (Docker)
**When:** You want to reset everything to the initial auto-seed state.

**How:**
```bash
# Stop containers and remove volumes
docker compose down -v

# Restart (auto-seeding will run again)
docker compose up
```

### Scenario 4: Seed Data Manually (Non-Docker Setup)
**When:** You're running the backend locally (not in Docker).

**How:** Edit [cmd/seed/main.go](cmd/seed/main.go) and run:
```bash
go run cmd/seed/main.go
```

This will:
- Drop and recreate all tables
- Run migrations
- Populate with sample data from the seed file

> **Note:** This is a complete reset - all existing data will be deleted.

---

## Documentation
*   [Architecture Analysis](ArchitectureAnalysis.md) - Deep dive into concurrency and queue handling.
*   [Database Schema](database/database.md) - Entity Relationship Diagrams and table definitions.
*   [Project Requirements](docs/REQUIREMENT.md) - Detailed grading criteria and functional specifications.

---
**Developed by the TicketRush Team 2026**  
*All rights reserved. This project was developed for educational purposes in the Web Application Development course.*
