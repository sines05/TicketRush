**Bài tập lớn**

# INT3306 - Phát triển ứng dụng web

Spring 2026

## TicketRush

Đặt vé online.

### 1. Hướng dẫn thực hiện

- Thực hiện theo nhóm (team) 3 sinh viên.
- Tự do lựa chọn công nghệ, framework, library cho cả frontend và backend.
- Trình bày sản phẩm tại buổi thi vấn đáp (demo trực tiếp, không cần slide, doc).
( **11-16/5/2026** )


## 2. Mô tả Tổng quan

**TicketRush** là nền tảng phân phối vé điện tử do một Đơn vị tổ chức sự kiện tự xây dựng và
vận hành. Hệ thống cho phép đơn vị này đăng tải các sự kiện âm nhạc/giải trí, thiết lập sơ
đồ ghế ngồi trực quan và mở bán vé trực tuyến cho khán giả.
Trọng tâm của dự án là xây dựng một hệ thống có khả năng chịu tải tốt, xử lý chính xác tình
huống hàng ngàn người dùng cùng truy cập để giành được một số lượng vé giới hạn trong
một khoảng thời gian ngắn (flash sale).

| STT | Tiêu chí chấm điểm | Hệ số |
| :--- | :--- | :--- |
| 1 | Chức năng và các features đã cài đặt | 0.35 |
| 2 | Thiết kế: Logic, dễ sử dụng | 0.1 |
| 3 | Giao diện: Responsive, đẹp, hiện đại, có bản sắc, đặc trưng nhận dạng thương hiệu nổi bật | 0.2 |
| 4 | Hiệu năng: Sử dụng fetch hoặc AJAX để tải bộ phận, không tải lại, backend API, sử dụng dữ liệu JSON, cập nhật DOM trên frontend. | 0.1 |
| 5 | Phong cách lập trình: Sử dụng mẫu thiết kế, tách biệt mã tạo giao diện và mã xử lý nghiệp vụ, tổ chức gói thư viện, trình bày và chú thích mã, ... | 0.05 |
| 6 | Xử lý nhập liệu: Kiểm tra hợp thức, tự động điền, gợi ý, chuyển đổi, ... | 0.05 |
| 7 | An ninh: Xác thực, quản lý phiên, điều khiển truy cập, mã hóa, ... | 0.05 |
| 8 | Viết lại và/hoặc định tuyến URL | 0.05 |
| 9 | Thao tác CSDL theo lập trình hướng đối và độc lập CSDL | 0.05 |

## 3. Chức năng cho từng vai trò nghiệp vụ

Hệ thống gồm 2 vai trò nghiệp vụ:
● **Customer (Khán giả):**
○ Tìm kiếm, xem thông tin sự kiện và sơ đồ chỗ ngồi.


```
○ Chọn ghế, giữ chỗ (trong thời gian quy định) và thực hiện thanh toán.
○ Nhận và quản lý vé điện tử (QR Code).
● Admin (Chủ hệ thống kiêm Ban tổ chức): Có toàn quyền quản trị nền tảng.
○ Tạo mới sự kiện, cấu hình sơ đồ ghế (chia khu vực, gán giá tiền cho từng
loại ghế).
○ Theo dõi biến động doanh thu, tình trạng lấp đầy ghế theo thời gian thực
(Real-time Dashboard).
○ Thống kê khán giả theo độ tuổi, giới tính giúp ban tổ chức nắm được thị hiếu
của khách hàng.
```
## 4. Yêu cầu kỹ thuật

### 4.1. Trải nghiệm Sơ đồ ghế

```
● Frontend phải xây dựng được giao diện chọn ghế trực quan.
● Khi Admin thiết lập sự kiện, họ có thể khai báo một "Ma trận ghế" (Ví dụ: Khu A có
10 hàng, mỗi hàng 15 ghế). Khán giả click vào ghế để chọn.
● Giao diện tự động cập nhật trạng thái ghế (ví dụ: đang màu xanh chuyển sang màu
xám vì có người khác vừa giữ chỗ) mà không cần f5 lại trang (sử dụng Polling hoặc
WebSockets).
```
### 4.2. Tranh chấp Dữ liệu (Database Concurrency)

Đây là yêu cầu quan trọng đảm bảo một ghế không bán cho nhiều người:
● Bắt buộc áp dụng cơ chế Database Transaction / Row Locking khi xử lý hành động
"Click giữ ghế".
● Đảm bảo tuyệt đối không xảy ra "Race Condition": Nếu 2 người cùng click vào ghế
VIP-A1 lúc 09:00:00.001, chỉ 1 người được giữ ghế thành công.

### 4.3. Quản lý Vòng đời Vé

```
● Vé trải qua các trạng thái: Available -> Locked (Đang giữ chỗ để chờ thanh toán)
-> Sold (Đã thanh toán) / Released (Hết hạn giữ chỗ, nhả lại ra thị trường).
● Khán giả chỉ có 10 phút để thanh toán. Cần có một cơ chế (Cronjob hoặc
Background Worker) để quét và tự động "nhả" (release) các ghế đã quá thời gian
khóa mà chưa thanh toán.
● Lưu ý: KHÔNg phải làm chức năng thanh toán thật (liên thông với một cổng thanh
toán nào đó). Chức năng Thanh toán (Checkout) chỉ cần hiện ra đơn hàng (vé mua
thành công), bấm “XÁC NHẬN” thì coi như thanh toán thành công.
```
### 4.4. Thử thách Nâng cao: Hàng chờ Ảo (Virtual Queue)

Thiết kế thuật toán Virtual Queue:


● Khi lưu lượng truy cập đột biến vượt quá sức chịu đựng của Database, hệ thống
không bị sập mà tự động chuyển người dùng vào một trang "Phòng chờ" (Waiting
Room).
● Giao diện hiển thị: _"Bạn đang ở vị trí thứ 105 trong hàng đợi. Vui lòng không tải lại
trang..."_
● Hệ thống sẽ lần lượt cấp token/quyền truy cập đặt vé cho từng nhóm người dùng (ví
dụ 50 người/lượt) vào màn hình chọn ghế.
—----- Hết —----


