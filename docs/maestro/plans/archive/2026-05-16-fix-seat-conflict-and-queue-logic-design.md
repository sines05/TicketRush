---
title: "Fix Seat Conflict UX and Queue Index Logic"
created: "2026-05-16T14:00:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Fix Seat Conflict UX and Queue Index Logic Design Document

## Problem Statement

Sau khi triển khai tối ưu hóa Broadcast Queue và xử lý tranh chấp ghế, hệ thống vẫn tồn đọng hai lỗi logic quan trọng ảnh hưởng đến trải nghiệm người dùng:

1. **Lỗi UX Tranh chấp ghế (Cart Eviction)**: Khi người dùng A đặt thành công một ghế mà người dùng B đang có trong giỏ hàng, thông báo từ WebSocket gửi về cho B kích hoạt hàm `setError()`. Việc này dẫn đến việc toàn bộ giao diện sơ đồ ghế bị thay thế bằng một trang báo lỗi ("Không tải được sơ đồ ghế"), đẩy người dùng ra khỏi luồng đặt vé một cách thô bạo. Đúng ra, nó phải hiển thị dưới dạng một Pop-up Modal tại trang hiện tại.
2. **Lỗi Nhảy số thứ tự Hàng chờ (JoinIndex Bug)**: Hàm `JoinQueue` ở Backend đang gọi lệnh cấp số mới (`GetNextJoinIndex`) vô điều kiện mỗi khi có một request (ví dụ khi gọi lại API do retry hoặc reload). Điều này dẫn đến việc một người dùng có thể chiếm nhiều số thứ tự liên tiếp (VD: số 1 rồi tới 4 dù chỉ có 2 người), làm sai lệch chỉ số chờ và gây hoang mang.

Mục tiêu là khắc phục triệt để hai lỗi này, đảm bảo giao diện Modal được tái sử dụng đúng cách khi có xung đột từ WebSocket, và Backend cấp phát số thứ tự chính xác, không trùng lặp cho mỗi người dùng.

## Requirements

### Functional Requirements
1. **REQ-1 (Modal Integration in WebSocket)**: Frontend (`SeatMap.jsx`) phải sửa đổi logic trong handler WebSocket: thay vì gọi `setError`, hệ thống phải gọi `setConflictMessage` và `setIsConflictModalOpen(true)` để hiển thị pop-up Modal (Dialog) khi có thông báo ghế đã bị người khác chọn (`LOCKED`/`SOLD`).
2. **REQ-2 (Maintain SeatMap State)**: Khi Modal tranh chấp bật lên từ sự kiện WebSocket, sơ đồ ghế vẫn phải hiển thị ở background (làm mờ đi), và không chuyển hướng (redirect) hay render ra thẻ `<Card>` báo lỗi.
3. **REQ-3 (Idempotent Join Index)**: Backend (`internal/queue/service.go`) phải tái sử dụng `JoinIndex` nếu người dùng đã có một phiên (session) trong hàng chờ. Chỉ cấp số mới (`GetNextJoinIndex`) nếu đây là lần đầu tiên người dùng tham gia hàng chờ cho sự kiện này.
4. **REQ-4 (Simulation Testing)**: Cập nhật script `scratch/simulate_multi_booking.js` để có kịch bản test giả lập nhiều người dùng gọi API Queue nhiều lần nhằm xác thực việc số thứ tự không bị nhảy.

### Non-Functional Requirements
1. **REQ-5 (Consistency)**: Logic cấp số trong Queue phải đảm bảo tính nhất quán (Consistency) trong môi trường phân tán (Redis), không bị cấp trùng số nếu có thao tác đồng thời.

### Constraints
- Pop-up Modal phải sử dụng lại component `<Dialog>` đã được tích hợp trước đó trong `SeatMap.jsx`.
- Logic xử lý Queue không làm chậm luồng vào hàng chờ hiện tại.

## Approach

### Selected Approach

**1. Sửa lỗi UX Modal trong WebSocket Handler**
- *[Ngăn trang SeatMap bị crash thành trang lỗi]*
Trong `frontend/src/pages/Booking/SeatMap.jsx`, tại `useEffect` của WebSocket message (Cart Eviction logic), thay thế `setError("Một số ghế...")` bằng:
  - `setConflictMessage("Một số ghế bạn chọn đã được người khác giữ hoặc đặt mất.")`
  - `setIsConflictModalOpen(true)`
Điều này đảm bảo luồng UX giống hệt với khi nhấn nút "Thanh toán" mà bị lỗi 409: một Pop-up hiện lên trên sơ đồ, các ghế đang chọn bị xoá khỏi giỏ, và người dùng vẫn thấy trạng thái các ghế khác bình thường.
- *Rationale: Tái sử dụng Component Dialog có sẵn để nhất quán giao diện và trải nghiệm (Traces To: REQ-1, REQ-2).*

**2. Idempotent Join Queue (Kiểm tra trước khi INCR)**
- *[Sửa lỗi nhảy số thứ tự]*
Trong `internal/queue/service.go`, hàm `JoinQueue`:
  - Trước khi gọi `s.repo.GetNextJoinIndex()`, ta sẽ lấy session bằng `s.repo.GetSessionByEventAndUser()`.
  - Nếu session đã tồn tại và `JoinIndex` > 0, hệ thống không cấp số mới mà gán `joinIndex` bằng giá trị đã lưu.
  - Chỉ khi User là người mới (hoặc session cũ chưa được cấp số), hệ thống mới gọi `s.repo.GetNextJoinIndex()`.
- *Rationale: Tránh việc người dùng reload trang làm tăng vọt Redis counter, giữ cho số thứ tự được liên tục (Traces To: REQ-3, REQ-5).*

### Alternatives Considered

#### Xóa State Error hoàn toàn khỏi SeatMap (SeatMap)
- *Description*: Bỏ hẳn logic `if (error) return <Card...>` để màn hình không bao giờ chuyển sang lỗi.
- *Rejected Because*: Cần thiết cho các lỗi nghiêm trọng (Critical errors) như mất mạng, không tải được API sơ đồ lúc đầu. Tranh chấp ghế chỉ là một sự kiện nghiệp vụ (Business event), không phải lỗi nghiêm trọng hệ thống.

#### Cập nhật Counter trong `getOrCreateSession` (Backend)
- *Description*: Gom logic sinh số `JoinIndex` vào hàm `getOrCreateSession` luôn.
- *Rejected Because*: Hàm `getOrCreateSession` đang được dùng bởi cả `GetStatus`, nó chỉ nên quản lý việc tạo/lấy session, không nên mang theo logic sinh số thứ tự (trách nhiệm của luồng `JoinQueue`).

### Architecture

### Component Diagram

```text
[Frontend: SeatMap.jsx]
   |
   | (WebSocket: SEAT_LOCKED/SOLD msg)
   v
[Cart Eviction Logic]
   | (if seat in cart)
   v
[setConflictMessage & setIsConflictModalOpen(true)] ---> [Show Modal (Dialog)]
   |
[Remove seat from Cart]

[Backend: service.go]
   |
   | (JoinQueue called)
   v
[Check existing Session] ---> (if session & joinIndex > 0) ---> Return existing JoinIndex
   |
   | (if no session or joinIndex == 0)
   v
[GetNextJoinIndex (Redis INCR)] ---> Return new JoinIndex
```

### Data Flow
1. **Queue Fix**: User F5 -> API `JoinQueue` -> Backend tìm thấy session cũ -> Lấy `joinIndex` cũ từ Redis/Memory -> Không gọi lệnh `INCR`.
2. **UX Fix**: WebSocket đẩy event `LOCKED` -> User B bị bắt trùng ghế -> Mở Modal (không kích hoạt biến `error` global).

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Sửa `SeatMap.jsx` để hiển thị Modal thay vì trang lỗi; Sửa `service.go` để tái sử dụng `JoinIndex`. |
| 2     | `tester` | No       | Cập nhật và chạy kịch bản E2E kiểm chứng việc F5 không bị nhảy số và việc bung Modal thành công. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Cấp sai số (JoinIndex = 0) nếu redis thiếu data | MEDIUM | LOW | Trong luồng lấy Session cũ, luôn kiểm tra nếu `JoinIndex == 0` thì vẫn gọi sinh số mới để phòng ngừa. |
| Modal không bung khi Component bị Unmount | LOW | LOW | Sơ đồ vẫn hiển thị mờ đằng sau, Component `SeatMap` không bị Unmount nên Modal `Dialog` vẫn hoạt động tốt. |

## Success Criteria
1. Khi có 2 user vào hàng đợi, user A nhận số 1, user B nhận số 2. Nếu B tải lại trang nhiều lần vẫn ở vị trí số 2 (Join Index = 2).
2. Khi B đang chọn ghế X, ghế X chuyển màu hồng (Locked) do A bấm thanh toán. B sẽ thấy thông báo pop-up "Một số ghế bạn chọn đã được người khác giữ hoặc đặt mất" chứ không văng ra trang lỗi toàn màn hình.
