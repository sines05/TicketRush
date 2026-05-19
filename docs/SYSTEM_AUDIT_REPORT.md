# Báo cáo Kiểm toán Bảo mật - TicketRush

## Tóm tắt
Dựa trên yêu cầu kiểm tra các lỗi cũ và tìm kiếm lỗi mới, tôi đã thực hiện kiểm toán toàn diện hệ thống TicketRush (Backend Go & AI Agent Python). Kết quả cho thấy hầu hết các lỗi nghiêm trọng đã được khắc phục, tuy nhiên vẫn còn một số điểm cần lưu ý để tăng cường bảo mật.

## 1. Xác thực các lỗi cũ (Từ hình ảnh bug report)

| Lỗi | Trạng thái | Chi tiết |
| --- | --- | --- |
| **BOLA in Order Checkout** | ✅ Đã sửa | `order_service.go` hiện đã kiểm tra `order.UserID != userID`. |
| **2FA Bypass via Refresh** | ⚠️ Đã cải thiện | Logic hiện tại cho phép duy trì phiên (refresh) mà không cần nhập lại 2FA nếu RT cũ đã xác thực. Rủi ro trung bình nếu RT bị đánh cắp. |
| **AI Agent Auth Bypass** | ✅ Đã sửa | Đã áp dụng `X-Internal-Secret` cho cả Go Proxy và Python Agent. |
| **BOLA in Internal APIs** | ✅ Đã sửa | `AIInternalHandler` bắt buộc kiểm tra `X-User-ID` khớp với query parameter. |
| **Rate Limit Bypass** | ✅ Đã sửa | Đã cấu hình `SetTrustedProxies([]string{"127.0.0.1"})`, ngăn chặn spoofing IP. |
| **Plaintext Reset Tokens** | ✅ Đã sửa | Reset tokens hiện được băm bằng SHA-256 trước khi lưu vào DB. |
| **Hardcoded Secrets** | ✅ Đã sửa | Đã loại bỏ các giá trị fallback nguy hiểm (như "super-secret"). |
| **Inconsistent Auth** | ✅ Đã sửa | `OptionalAuthMiddleware` hiện kiểm tra cả Cookie và Header. |
| **Lack of CSRF Protection** | ✅ Đã sửa | Đã thêm `CSRFMiddleware` kiểm tra Origin/Referer cho các request thay đổi trạng thái. |

## 2. Các phát hiện mới và Rủi ro tiềm ẩn

### [Medium] Duy trì phiên 2FA (Session Persistence Risk)
- **Tệp tin:** `internal/service/auth_service.go:250`
- **Vấn đề:** Khi refresh token, hệ thống tin tưởng hoàn toàn vào cờ `2fa_verified` từ token cũ. Nếu một refresh token bị lộ, kẻ tấn công có thể duy trì quyền truy cập đã qua 2FA mãi mãi.
- **Khuyến nghị:** Cần có thời hạn tối đa cho phiên 2FA (ví dụ: yêu cầu xác thực lại 2FA sau 24-48 giờ) bất kể việc refresh token.

### [Low] Chính sách mật khẩu cơ bản (Weak Password Policy)
- **Tệp tin:** `internal/service/auth_service.go:74`
- **Vấn đề:** `validatePassword` chỉ yêu cầu 8 ký tự, 1 chữ cái và 1 số.
- **Khuyến nghị:** Tăng độ phức tạp lên ít nhất 12 ký tự, yêu cầu ký tự đặc biệt và chữ hoa.

### [Low] Phơi nhiễm dữ liệu trong DTO
- **Tệp tin:** `internal/dto/user.go`
- **Vấn đề:** `UserResponse` trả về khá nhiều thông tin nhạy cảm (Ngày sinh, Giới tính, Email).
- **Khuyến nghị:** Đảm bảo các thông tin này chỉ trả về cho chính chủ sở hữu hoặc admin, không trả về trong các API công khai hoặc tìm kiếm.

### [Low] SQL Injection (Hầu như không có)
- **Chi tiết:** Hệ thống sử dụng GORM với parameter binding (`?`). Một số truy vấn Raw trong `notification_repository.go` cũng sử dụng placeholder nên an toàn.

## 3. Hướng dẫn khắc phục (Remediation)

1. **Bảo mật Secret:** Đảm bảo `X_INTERNAL_SECRET` và `JWT_SECRET` trong production là các chuỗi ngẫu nhiên dài (ít nhất 32 ký tự).
2. **Cấu hình Cookie:** Trong production, hãy đặt `COOKIE_SECURE=true` để đảm bảo cookie chỉ gửi qua HTTPS.
3. **Giới hạn AI Agent:** Triển khai giới hạn tần suất (Rate Limit) riêng cho endpoint `/chat` để tránh bị khai thác tài nguyên LLM (vốn tốn kém).
4. **Giám sát:** Log các trường hợp `X-Internal-Secret` hoặc `X-User-ID` không khớp để phát hiện sớm các hành vi tấn công thăm dò.

---
**Người thực hiện:** Gemini CLI Security Audit Tool
**Ngày:** 19/05/2026
