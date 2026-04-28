# Kiến trúc Hệ thống TicketRush - Tổng quan chi tiết

Tài liệu này giải thích sâu về các công nghệ được lựa chọn, cách tổ chức mã nguồn và các mẫu thiết kế phần mềm (Design Patterns) được sử dụng để giải quyết bài toán Flash Sale mua vé.

## 1. Công nghệ sử dụng và Lợi ích

| Công nghệ | Vai trò trong hệ thống | Tại sao lại chọn công nghệ này? |
| :--- | :--- | :--- |
| **Golang (Gin)** | Backend Framework | Golang cực kỳ mạnh mẽ trong xử lý đồng thời (Concurrency) nhờ cơ chế Goroutines nhẹ. Trong môi trường Ticket Flash Sale, việc chịu tải cao và xử lý hàng ngàn request đồng thời là sống còn. Gin là framework cực nhẹ, cho tốc độ định tuyến (routing) rất nhanh. |
| **PostgreSQL** | Cơ sở dữ liệu chính | Một RDBMS chuẩn công nghiệp, hỗ trợ tính toàn vẹn dữ liệu (ACID) cực tốt. Đặc biệt, PostgreSQL hỗ trợ cơ chế khóa dữ liệu cấp dòng (**Row-level locking** với mệnh đề `FOR UPDATE`) - đây là "trái tim" giúp hệ thống không bao giờ bị lỗi bán trùng ghế (Double-booking). |
| **GORM** | Thư viện ORM | Giao tiếp với DB thông qua các đối tượng Struct. Nó hỗ trợ cấu hình quan hệ (1-1, 1-N), schema migration dễ dàng và cung cấp API viết DB Transactions rất sạch. |
| **Redis** | In-memory Cache & Message Broker | Bộ nhớ đệm tốc độ truy xuất siêu nhanh. Redis được sử dụng để xây dựng thuật toán **Virtual Queue** (Hàng chờ ảo) thông qua cấu trúc dữ liệu `Sorted Sets` (`ZADD`) để điều tiết lưu lượng user, cứu database khỏi bị sập do lượng request dồn dập trong một tích tắc. |
| **WebSockets** | Kênh giao tiếp Real-time | Cho phép server chủ động đẩy dữ liệu xuống client. Bắt buộc phải có để tính năng Sơ đồ ghế cập nhật thời gian thực (ghế chuyển màu ngay lập tức khi có người khác khóa) mà khách hàng không cần F5 (tải lại trang). |
| **React 18** | Frontend Framework | Xây dựng giao diện hướng Component rất phù hợp để dựng Sơ đồ ma trận ghế. Kết hợp với TanStack Query giúp quản lý data state gọn gàng và Tailwind CSS làm giao diện hiện đại, tốc độ code nhanh. |

---

## 2. Phân tích Cấu trúc Thư mục

Mã nguồn được tổ chức theo chuẩn **Standard Go Project Layout** kết hợp với kiến trúc **Layered Architecture**. Điều này giúp tách biệt rõ ràng các nhiệm vụ.

```text
TicketRush/
├── cmd/
│   └── server/
│       └── main.go           # 🚀 Điểm bắt đầu của ứng dụng. Nơi nạp cấu hình, kết nối DB/Redis và tiêm phụ thuộc (Dependency Injection) để khởi chạy server.
├── migrations/               # 🗄️ Các file SQL thuần để khởi tạo hoặc cập nhật cấu trúc bảng (schema).
├── docs/                     # 📄 Tài liệu kỹ thuật, API specs, database diagrams.
└── internal/                 # 🔒 Thư mục chứa code cốt lõi, không cho phép dự án Go khác import vào.
    ├── config/               # Đọc và cấu trúc hóa file biến môi trường (.env).
    ├── models/               # Định nghĩa các Struct thực thể (User, Event, Seat, Order) được mapping trực tiếp xuống DB qua GORM.
    ├── repository/           # (Data Access Layer) Nơi duy nhất gọi SQL/Redis query. Xử lý các nghiệp vụ lấy, ghi dữ liệu và Transactions.
    ├── service/              # (Business Logic Layer) Trái tim logic của app. Nó gọi tới Repository để lấy data, xử lý tính toán, phân quyền, sau đó trả về.
    ├── handler/              # (Presentation Layer) Nơi cấu hình các API Endpoints. Nhận HTTP Request, validate JSON, chuyển cho Service và trả về chuẩn JSON response.
    ├── middleware/           # Các "chốt chặn" HTTP (ví dụ: giải mã JWT token ở auth_middleware, kiểm tra quyền Admin ở role_middleware).
    └── utils/                # Các hàm dùng chung (như chuẩn hóa Response định dạng lỗi/thành công).
```

---

## 3. Các Mẫu thiết kế (Design Patterns) nổi bật

### 3.1. Layered Architecture (Kiến trúc phân tầng)
Hệ thống tuân thủ chặt chẽ việc chia thành 3 tầng: `Handler` -> `Service` -> `Repository`.
- **Lợi ích**: Tầng `Handler` không bao giờ được viết lệnh DB và tầng `Repository` không được phép biết thông tin về HTTP Web Context. Nếu mai sau đổi từ làm Web API sang làm ứng dụng giao diện Terminal, chỉ cần đổi `Handler` mà không phải sửa `Service` hay `Repository`.

### 3.2. Dependency Injection (Tiêm phụ thuộc)
Trong file `main.go`, các object được khởi tạo và "bơm" vào tầng trên thay vì tầng trên tự sinh ra chúng.
*Ví dụ:* `orderRepo := repository.NewOrderRepository(db)` sau đó được bơm vào `service.NewOrderService(orderRepo, hub)`.
- **Lợi ích**: Code lỏng lẻo (loose coupling), rất dễ dàng viết Unit Test vì có thể nạp một `MockRepo` giả lập vào Service thay vì gọi DB thật.

### 3.3. Pessimistic Locking Pattern (Khóa Bi quan)
Mẫu thiết kế đồng bộ CSDL dùng cho API Khóa ghế (`LockSeats`).
- Khi user gửi yêu cầu giữ ghế, Transaction mở ra và lấy đúng những ghế đó với lệnh `SELECT ... FOR UPDATE`.
- Nếu 1000 người cùng click vào 1 ghế, CSDL sẽ cấp khóa cho 1 người nhanh nhất, 999 người còn lại phải "xếp hàng chờ" khóa đó.
- Ngay khi người thứ nhất đổi trạng thái ghế sang `LOCKED` và Commit, 999 giao dịch kia được nhả ra, nhưng sẽ lập tức bị lỗi do ghế không còn ở trạng thái `AVAILABLE`. 

### 3.4. Background Worker / Cron Job Pattern
Hệ thống cấp phát một Goroutine chạy song song không dính dáng đến luồng HTTP Request để tự động dọn rác (File `worker.go`).
- Một bộ định thời `time.Ticker` đếm mỗi 1 phút sẽ tự đánh thức Worker.
- Worker quét các hóa đơn `PENDING` bị quá hạn 10 phút, tự động gọi hàm đổi trạng thái ghế về lại `AVAILABLE` để bán cho khách khác.

### 3.5. Observer / Pub-Sub Pattern (WebSockets)
Thay vì `OrderService` phải trực tiếp gọi các API của công nghệ WebSockets (điều này gây vi phạm Clean Architecture), dự án sử dụng một Interface có tên `Broadcaster`.
- Bất kỳ khi nào có một ghế bị Khóa/Nhả/Bán, `OrderService` chỉ cần gọi `broadcaster.Broadcast(thông_tin_ghế)`.
- Ở một nơi khác, `WebSocket Hub` (kẻ đăng ký - subscriber) sẽ lắng nghe lệnh này và phân phát gói tin xuống tất cả các khách hàng đang xem Sơ đồ ghế ở Frontend. Mọi người đều có trải nghiệm mượt mà, sống động.
