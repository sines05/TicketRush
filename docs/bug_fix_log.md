# Nhật ký Sửa lỗi TicketRush

## 🛡️ Xác thực & Bảo mật
- [x] Sửa lỗi sập trang khi đăng ký tài khoản mới do dữ liệu trả về bị trống.
- [x] Sửa lỗi mất thông tin email và quyền hạn sau khi xác thực 2FA.
- [x] Ngăn chặn việc bỏ qua bước 2FA (báo lỗi 401 thay vì cho đăng nhập thẳng).
- [x] Cập nhật đăng nhập Google/Facebook để hoạt động với Cookie bảo mật thay vì Token trên URL.
- [x] Sửa lỗi không hiển thị form nhập mã 2FA khi đăng nhập bằng mạng xã hội.
- [x] Sửa lỗi "Could not generate 2FA" bằng cách cấu hình và kiểm tra độ dài 32-byte của `ENCRYPTION_MASTER_KEY`.
- [x] Kích hoạt và áp dụng `TwoFactorMiddleware` cho các endpoint nhạy cảm (thanh toán, đổi mật khẩu, v.v.) để bắt buộc xác thực 2FA.
- [x] Thêm tính năng mã khôi phục (Recovery Codes) và trạng thái chờ xác thực (Pending State) để tránh khóa tài khoản ngoài ý muốn khi cấu hình.
- [x] Cập nhật JWT claim để bao gồm trạng thái `2fa_verified`, đảm bảo an toàn cho phiên làm việc có 2FA.
- [x] Khắc phục triệt để lỗi vòng lặp chuyển hướng (Infinite Redirect Loop) giữa Frontend và Backend bằng cơ chế Event-Driven và Conditional Hydration.
- [x] Loại bỏ cơ chế fallback giải mã 2FA không an toàn (Plaintext fallback), bắt buộc sử dụng mã hóa AES-GCM.
- [x] Nâng cấp bảo mật luồng đăng nhập 2FA: Sử dụng `pending_token` (JWT ngắn hạn) thay vì trả về `user_id` thô để chống Brute-force và Bypass.
- [x] Bổ sung Rate Limit (giới hạn 5 lần/15 phút) cho endpoint xác thực mã OTP 2FA.

## 📝 Xác thực dữ liệu & Trải nghiệm (UX)
- [x] Việt hóa các thông báo lỗi kỹ thuật của backend (ví dụ: "failed on min" thành "Phải có ít nhất...").
- [x] Hiển thị lỗi theo đúng tên trường dữ liệu để giao diện dễ dàng bắt lỗi.
- [x] Chỉnh lại mã lỗi mật khẩu yếu thành 400 (Lỗi người dùng) thay vì 500 (Lỗi hệ thống).
- [x] Thêm kiểm tra định dạng email và độ mạnh mật khẩu ngay tại giao diện trước khi gửi.
- [x] Hiển thị thông báo lỗi chi tiết ngay dưới từng ô nhập liệu (email, mật khẩu, họ tên).
- [x] Cải thiện giao diện cài đặt/tắt 2FA (trang Hồ sơ): Hiển thị thông báo nhập sai mã OTP ngay trên ô nhập thay vì hiển thị ở đầu trang (bị khuất tầm nhìn).

## 🌐 Tích hợp & Hệ thống
- [x] Sửa lỗi sai đường dẫn (URL) khi nhấn nút đăng nhập bằng Google/Facebook.
- [x] Bỏ lỗi tự động nhảy về trang đăng nhập khi người dùng vãng lai đang xem trang chủ.
- [x] Cập nhật hệ thống dữ liệu mẫu (Mock) đồng bộ với quy định mật khẩu tối thiểu 8 ký tự.
- [x] Sửa lỗi crash khi ứng dụng tự động kiểm tra trạng thái đăng nhập lúc khởi tạo.

## 🌐 Realtime & Hàng chờ
- [x] Sửa lỗi WebSocket bị từ chối (401 Unauthorized) bằng cách điều chỉnh hook `useWebSocket` kết nối trực tiếp tới host backend, cho phép trình duyệt gửi kèm HttpOnly Cookie.
- [x] Triển khai cơ chế Heartbeat (Ping/Pong) định kỳ 30s để giữ kết nối WebSocket ổn định qua các lớp Proxy và Load Balancer.
- [x] Chuyển đổi toàn bộ cơ chế thông báo hàng chờ từ Polling (gọi API liên tục) sang Event-driven (WebSocket), giúp giảm tải server và cập nhật vị trí realtime.
- [x] Loại bỏ hoàn toàn 100% mã nguồn giả lập (Mock Mode) và các hàm `sleep` ở Frontend, đảm bảo ứng dụng luôn giao tiếp với dữ liệu thực.
- [x] Sửa lỗi UX khi ghế trong giỏ bị người khác đặt mất (Cart Eviction). Chuyển từ việc văng ra trang lỗi toàn màn hình sang hiển thị Pop-up Modal tại chỗ.
- [x] Khắc phục triệt để lỗi "nhảy số thứ tự" hàng chờ bằng cách triển khai Redis Lua Script. Đảm bảo việc cấp số là nguyên tử (Atomic) ngay cả khi có hàng chục request đồng thời từ một người dùng.
- [x] Tăng giới hạn Rate Limit cho các API đăng nhập/đăng ký để hỗ trợ việc chạy kịch bản kiểm thử giả lập nhiều người dùng cùng lúc.
- [x] Nâng cấp script kiểm thử `simulate_multi_booking.js` để hỗ trợ giả lập gọi API đồng thời (Concurrency) nhằm kiểm chứng tính an toàn của hệ thống.
- [x] Bổ sung bộ kiểm thử bảo mật (Security Tests) toàn diện cho vòng đời 2FA và cơ chế bảo vệ route.

## 🗄️ Cơ sở dữ liệu & Hiệu năng
- [x] Loại bỏ triệt để nguy cơ Deadlock (Khóa chéo) trong hàm `LockSeats` bằng cách sắp xếp (sort) ID ghế theo thứ tự từ điển trước khi gọi `FOR UPDATE`.
- [x] Khắc phục lỗi Race Condition trong hàm `ReleaseOrder` và `CompleteOrder` bằng cách áp dụng khóa mức dòng (Pessimistic Row-level Locking - `FOR UPDATE`).
- [x] Tối ưu hóa hiệu năng, loại bỏ lỗi N+1 Query trong luồng đặt ghế bằng cách chuyển từ truy vấn vòng lặp sang Batch Query (`IN`) kết hợp Eager Loading (`Preload`).

## 🏗️ Kiến trúc & Mã nguồn (Coding Style)
- [x] Đạt chuẩn **Clean Architecture**: Loại bỏ hoàn toàn sự phụ thuộc vào thư viện GORM tại tầng `Service`. Tầng Service hiện tại chỉ xử lý nghiệp vụ thuần túy, không còn nắm giữ kết nối Database.
- [x] Tuân thủ nguyên tắc **DIP (Dependency Inversion)**: Refactor lại luồng tạo sự kiện, chuyển toàn bộ logic Database Transaction từ `event_service.go` xuống `event_repository.go`. 
- [x] Tuân thủ nguyên tắc **SRP (Single Responsibility)**: Tách biệt rõ ràng trách nhiệm giữa Service (điều phối/validate) và Repository (lưu trữ/truy vấn).
---
*Cập nhật lần cuối: Thứ Bảy, ngày 16 tháng 5 năm 2026*