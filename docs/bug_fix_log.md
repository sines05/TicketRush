# Nhật ký Sửa lỗi TicketRush

## 🛡️ Xác thực & Bảo mật
- [x] Sửa lỗi sập trang khi đăng ký tài khoản mới do dữ liệu trả về bị trống.
- [x] Sửa lỗi mất thông tin email và quyền hạn sau khi xác thực 2FA.
- [x] Ngăn chặn việc bỏ qua bước 2FA (báo lỗi 401 thay vì cho đăng nhập thẳng).
- [x] Cập nhật đăng nhập Google/Facebook để hoạt động với Cookie bảo mật thay vì Token trên URL.
- [x] Sửa lỗi không hiển thị form nhập mã 2FA khi đăng nhập bằng mạng xã hội.

## 📝 Xác thực dữ liệu & Trải nghiệm (UX)
- [x] Việt hóa các thông báo lỗi kỹ thuật của backend (ví dụ: "failed on min" thành "Phải có ít nhất...").
- [x] Hiển thị lỗi theo đúng tên trường dữ liệu để giao diện dễ dàng bắt lỗi.
- [x] Chỉnh lại mã lỗi mật khẩu yếu thành 400 (Lỗi người dùng) thay vì 500 (Lỗi hệ thống).
- [x] Thêm kiểm tra định dạng email và độ mạnh mật khẩu ngay tại giao diện trước khi gửi.
- [x] Hiển thị thông báo lỗi chi tiết ngay dưới từng ô nhập liệu (email, mật khẩu, họ tên).

## 🌐 Tích hợp & Hệ thống
- [x] Sửa lỗi sai đường dẫn (URL) khi nhấn nút đăng nhập bằng Google/Facebook.
- [x] Bỏ lỗi tự động nhảy về trang đăng nhập khi người dùng vãng lai đang xem trang chủ.
- [x] Cập nhật hệ thống dữ liệu mẫu (Mock) đồng bộ với quy định mật khẩu tối thiểu 8 ký tự.
- [x] Sửa lỗi crash khi ứng dụng tự động kiểm tra trạng thái đăng nhập lúc khởi tạo.

---
*Cập nhật lần cuối: Thứ Sáu, ngày 15 tháng 5 năm 2026*
