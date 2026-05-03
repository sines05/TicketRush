# TicketRush Workspace

Repo này đã được sắp xếp theo cấu trúc monorepo:

- `backend/`: Go + Gin + PostgreSQL + Redis (API + WebSocket)
- `frontend/`: React + Vite + Tailwind (ứng dụng bạn đang làm)

## Chạy nhanh (local)

### Backend
```bash
cd backend
# infra
docker compose up -d
# chạy server
go run cmd/server/main.go

# seed vài sự kiện demo (events + zones + seats)
Get-Content -Raw database/seed_events.sql | docker exec -i ticketrush-db psql -U user -d ticketrush
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Mặc định frontend dùng API base URL: `http://localhost:8080/api/v1`.
