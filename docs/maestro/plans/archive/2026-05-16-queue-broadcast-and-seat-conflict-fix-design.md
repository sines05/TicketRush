---
title: "Queue Broadcast & Seat Conflict Fix"
created: "2026-05-16T12:56:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "standard"
task_complexity: "medium"
---

# Queue Broadcast & Seat Conflict Fix Design Document

## Problem Statement

Hệ thống TicketRush cần giải quyết hai vấn đề quan trọng để đáp ứng khả năng mở rộng và cải thiện trải nghiệm người dùng:

1. **Nghẽn cổ chai (Bottleneck) khi Broadcast Hàng chờ**: Hiện tại, backend đang lặp qua toàn bộ người dùng trong Virtual Queue để gửi thông báo vị trí riêng lẻ (`QUEUE_UPDATE`) thông qua WebSocket. Khi lượng người dùng lên đến hàng ngàn, thao tác này gây tốn CPU, nghẽn Hub và tiêu tốn băng thông mạng không cần thiết.
2. **Trải nghiệm kém khi Tranh chấp Ghế (Seat Conflict)**: Khi hai người dùng (A và B) cùng thao tác trên một ghế, nếu A thanh toán trước, B sẽ nhận được lỗi hệ thống. Tuy nhiên, thay vì hiển thị thông báo thân thiện và cho phép B tiếp tục chọn ghế khác, hệ thống thiếu một Pop-up (Modal) bắt buộc người dùng xác nhận lỗi "Ghế đã bị đặt", dẫn đến trải nghiệm bị gián đoạn hoặc khó hiểu.

## Requirements

### Functional Requirements

1. **REQ-1 (Global Offset Broadcast)**: Backend phải phát sóng (broadcast) một thông báo duy nhất chứa số thứ tự đang được phục vụ (`current_processed_index`) thay vì gửi tin nhắn riêng lẻ cho từng người dùng.
2. **REQ-2 (Client-side Queue Calculation)**: Frontend (`VirtualQueue.jsx`) phải lưu số thứ tự gia nhập (Join Index) của người dùng và tự động tính toán, hiển thị vị trí hiện tại dựa trên `current_processed_index` nhận được từ WebSocket.
3. **REQ-3 (Conflict Pop-up)**: Frontend (`SeatMap.jsx`) phải hiển thị một Pop-up (Modal Dialog) với nút "Đóng" hoặc "Đồng ý" khi nhận lỗi `SEAT_ALREADY_TAKEN` (HTTP 409) từ thao tác giữ ghế (`POST /api/v1/orders/lock`).
4. **REQ-4 (Seamless Continuation)**: Sau khi đóng Pop-up lỗi, người dùng vẫn phải ở lại màn hình `SeatMap.jsx`, ghế bị lỗi phải được bỏ chọn hoặc làm mờ, và kết nối WebSocket vẫn phải tiếp tục cập nhật trạng thái các ghế khác bình thường.

### Non-Functional Requirements

1. **REQ-5 (Performance)**: Thao tác cập nhật hàng chờ (Worker Queue Update) phải có độ phức tạp thời gian là O(1) cho việc broadcast qua WebSocket, không phụ thuộc vào quy mô hàng chờ O(N).

### Constraints

- Hệ thống phải tiếp tục sử dụng Redis ZSET cho cấu trúc dữ liệu hàng chờ.
- Phải dùng các Components UI hiện có (ví dụ thư viện UI có sẵn trong `frontend/src/components/ui/`) để làm Pop-up Modal.

## Approach

### Selected Approach

**1. Tối ưu Broadcast (Global Offset)**
- *[Cải thiện hiệu năng xử lý O(N) thành O(1) để tránh sập Hub]*
Chúng ta sẽ chuyển từ mô hình "Unicast-style" sang "Global Broadcast". Backend (trong `internal/worker/worker.go`) sẽ chỉ tính toán chỉ số `current_processed_index` (tức là người vừa được chuyển vào trạng thái Active) và gửi một payload chung: `{ "type": "QUEUE_UPDATE", "current_index": X }` đến channel `event:{event_id}`. Frontend sẽ tự trừ vị trí gia nhập của mình để ra STT chờ hiện tại. 

**2. Modal Xử lý Tranh chấp Ghế (Conflict UI)**
- *[Ngăn trải nghiệm đứt gãy khi API trả lỗi 409]*
Thêm state `conflictSeats` vào component `SeatMap.jsx`. Khi API `LockSeats` thất bại vì `SEAT_ALREADY_TAKEN`, bắt lỗi này, xác định các ghế lỗi, và hiển thị Modal Dialog. Khi bấm "Đồng ý", Modal đóng, state `selectedSeats` được làm sạch khỏi các ghế lỗi, người dùng tiếp tục xem sơ đồ đang được update realtime.

### Alternatives Considered

#### Batch Array Broadcast (Cho bài toán Queue)

- **Description**: Trả về một mảng lớn chứa ID và thứ tự của mọi người đang chờ, sau đó broadcast mảng đó.
- **Rejected Because**: Không giải quyết được tận gốc vấn đề nghẽn cổ chai mạng (Bandwidth bottleneck) của hệ thống.

#### Global Notification Toast (Cho bài toán UI)

- **Description**: Dùng một Toast notification đỏ hiện ở góc màn hình báo lỗi, không làm mờ nền màn hình.
- **Rejected Because**: Tranh chấp ghế là lỗi luồng quan trọng (Critical UI State), bắt buộc người dùng phải xác nhận (Acknowledge) để dọn giỏ hàng.

### Architecture

### Component Diagram

```text
+-----------------------+              +------------------------+
|    Frontend (React)   |              |     Backend (Go)       |
|                       |              |                        |
|  +-----------------+  | HttpOnly     |  +------------------+  |
|  | VirtualQueue.jsx|<-+-(QUEUE_UPDATE)-+|  websocket/hub.go  |  |
|  | (Calc Offset)   |  |              |  +--------+---------+  |
|  +-----------------+  |              |           ^            |
|                       |              |           |            |
|  +-----------------+  |              |  +--------+---------+  |
|  | SeatMap.jsx     |<-+-(SEAT_LOCKED)--+| worker.go (B'cast) |  |
|  | (Modal Conflict)|--+-(Lock API)--+->|  order_service.go  |  |
|  +-----------------+  |              |  +------------------+  |
+-----------------------+              +------------------------+
```

### Data Flow

1. **Join Queue**: Khi user gọi `JoinQueue`, Redis `INCR` và trả về `join_index`. Trình duyệt lưu `join_index` này.
2. **Worker Broadcast**: Worker định kỳ quét số lượng ghế/users active. Nó sinh ra sự kiện `QUEUE_UPDATE` chứa `current_index` (chỉ số của người cuối cùng vừa được Active) và đẩy vào Global Channel (`event:{event_id}`).
3. **Queue Math**: Client tự tính: `Vị trí = my_join_index - current_index`.
4. **Lock Conflict**: User A và B gọi `LockSeats`. Database lock thành công cho A, B nhận lỗi HTTP 409.
5. **UI Handling**: `SeatMap.jsx` catch HTTP 409, bật Modal "Ghế đã bị đặt", giữ nguyên WebSocket connection để ghế cập nhật màu xám.

### Key Interfaces

```typescript
// Giao thức Broadcast Queue mới
interface QueueUpdateEvent {
  type: 'QUEUE_UPDATE';
  current_index: number;
}
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | `coder`  | No       | Sửa cơ chế phát sóng `QUEUE_UPDATE` trong `worker.go` và `service.go`. Thêm trả về `join_index` tại API JoinQueue. Cập nhật `VirtualQueue.jsx` ở Frontend. |
| 2     | `coder`  | No       | Thêm Pop-up Modal vào `SeatMap.jsx` để bắt lỗi `SEAT_ALREADY_TAKEN` và giữ vững state. |
| 3     | `tester` | No       | Dùng script giả lập (multi-account) để verify conflict UI và broadcast hiệu năng. |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Chỉ số `join_index` bị lệch do Redis reset | MEDIUM | LOW | Redis counter phải có TTL (hết hạn) bằng với thời gian kết thúc sự kiện để tránh rác, nhưng không được xóa giữa chừng. |
| Pop-up Modal loop vô hạn nếu component bị rerender | MEDIUM | LOW | Quản lý state của Modal bằng flag `isOpen` riêng biệt, không gắn trực tiếp vào WebSocket message. |

## Success Criteria

1. Khi bật 5000 users giả lập trong Queue, CPU backend không spike, lưu lượng mạng gửi từ server giảm từ (5000 msg/s xuống 1 msg/s).
2. Hai User cùng giữ 1 ghế: User A qua màn hình checkout. User B thấy Pop-up đỏ "Một vài ghế bạn chọn không available nữa...", bấm Đóng thì pop-up biến mất, ghế đó trên bản đồ chuyển sang màu xám (Lock).
