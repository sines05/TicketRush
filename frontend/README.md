# TicketRush Frontend

Frontend cho web TicketRush:
- Customer flow: Home → EventDetail → VirtualQueue → SeatMap → Checkout (10 phút) → Vé QR
- Admin flow: Dashboard (biểu đồ) + EventForm (sinh ma trận ghế)

## Yêu cầu môi trường
- Cài **Node.js LTS** (khuyến nghị 20+)

## Chạy dự án
```bash
cd frontend
npm install
npm run dev
```

Mở: http://localhost:5173

## Ghi chú
- Hệ thống sử dụng API thật từ Backend.
- Base URL mặc định: `http://localhost:8080/api/v1` (có thể override bằng `VITE_API_BASE_URL` trong file `.env`).
