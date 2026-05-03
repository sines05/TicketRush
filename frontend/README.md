# TicketRush Frontend (Demo)

Frontend-only demo cho web TicketRush (tương tự Ticketbox):
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

## Demo đăng nhập
- Bất kỳ email/mật khẩu đều vào được (mock)
- Email có chứa chuỗi `admin` sẽ có role `ADMIN` và vào được `/admin/*`

## Ghi chú
- Mặc định chạy mock (frontend-only) với `VITE_USE_MOCK`.
- Khi backend sẵn sàng, có thể tắt mock và dùng API thật theo contract:
	- Base URL mặc định: `http://localhost:8080/api/v1` (có thể override bằng `VITE_API_BASE_URL`)
	- Tắt mock: tạo file `.env` trong thư mục `frontend`:
		- `VITE_USE_MOCK=false`
		- `VITE_API_BASE_URL=http://localhost:8080/api/v1`
