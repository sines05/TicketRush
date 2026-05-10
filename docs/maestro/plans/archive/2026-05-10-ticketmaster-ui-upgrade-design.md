---
title: "TicketMaster UI Upgrade"
created: "2026-05-10T05:00:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "complex"
---

# TicketMaster UI Upgrade Design Document

## Problem Statement

Hiện tại, giao diện TicketRush sử dụng các lưới 3-4 cột cơ bản (`grid-cols-4`) và các thẻ sự kiện (`EventCard`) dạng phẳng (flat) hoặc border tiêu chuẩn. Mặc dù đã có một số hiệu ứng glassmorphism, nhưng tổng thể UX vẫn còn mang cảm giác "template" thông thường, thiếu sự phân cấp hình ảnh (visual hierarchy) sâu sắc và chuyển động vật lý cao cấp cần có của một nền tảng bán vé hàng đầu như TicketMaster.

Để đạt được "hướng TicketMaster" kết hợp với các tiêu chuẩn thiết kế cao cấp (Awwwards-tier), chúng ta cần giải quyết các vấn đề sau:
1. **Thiếu chiều sâu không gian (Spatial Rhythm & Depth):** Các card sự kiện đang nằm phẳng trên nền.
2. **Thiết kế lưới quá đối xứng (Symmetrical Grid):** Lưới hiển thị sự kiện đều nhau gây nhàm chán, không tạo được điểm nhấn cho các sự kiện nổi bật.
3. **Chuyển động tuyến tính (Linear Motion):** Các animation đang dùng `ease-in-out` cơ bản thay vì đường cong cubic-bezier để tạo cảm giác quán tính vật lý.

## Requirements

### Functional Requirements
1. **REQ-1 (Layout Variance)**: Áp dụng bố cục bất đối xứng (Asymmetrical Bento) cho danh sách sự kiện (Home page) thay vì lưới grid cứng nhắc.
2. **REQ-2 (Component Architecture)**: Các thẻ (EventCard) và input phải sử dụng kiến trúc "Double-Bezel" (viền kép) để tạo cảm giác "vật lý" (machined hardware).
3. **REQ-3 (Micro-interactions)**: Nút bấm (CTA) và thẻ (Cards) phải có phản hồi nhấn vật lý và hiệu ứng hover từ tính.

### Non-Functional Requirements
1. **REQ-4 (Performance)**: Các animation phải **GPU-Safe**. Chỉ được phép animate các thuộc tính `transform` và `opacity`.
2. **REQ-5 (Responsiveness)**: Mọi bố cục bất đối xứng phải tự động thoái lui (collapse) về dạng cột đơn với khoảng cách dọc rộng trên thiết bị di động (<768px).

### Constraints
- Giữ nguyên cấu trúc dữ liệu và API fetch hiện tại trong các Component.
- Việc thay thế Icon/Font phải sử dụng các tài nguyên hiện có hoặc dễ dàng import qua Tailwind/CSS.

## Approach

### Selected Approach

**The Ethereal Glass Bento**

Sự kết hợp giữa **Vibe: Ethereal Glass** (Màu tối sâu thẳm, thẻ bài bằng kính với viền sáng mỏng) và **Layout: The Asymmetrical Bento** (Lưới Bento bất đối xứng). 
- Trang chủ sẽ chia thành các khối grid đa dạng.
- Các Card sẽ áp dụng "Double-Bezel". 
- Motion sử dụng `cubic-bezier(0.32,0.72,0,1)` thay cho `ease-in-out`.

### Alternatives Considered

#### Soft Structuralism Cascade
- **Description**: Sử dụng tông nền trắng/bạc, các thẻ sự kiện xếp chồng lên nhau theo trục Z.
- **Rejected Because**: Mạo hiểm về mặt UX trên thiết bị di động, không toát lên vẻ "sôi động/sự kiện" như TicketMaster.

### Decision Matrix

| Criterion | Weight | Ethereal Glass Bento | Soft Structuralism Cascade |
|-----------|--------|----------------------|----------------------------|
| **Visual Impact (Premium Feel)** | 35% | 5: Hiện đại, sâu thẳm. | 5: Độc đáo, có chiều sâu. |
| **Information Density (Ticketing UX)**| 35% | 5: Bento grid giúp gom nhóm thông tin tốt. | 2: Xếp chồng làm che lấp thông tin sự kiện. |
| **Mobile Responsiveness** | 30% | 4: Dễ dàng chuyển về cột đơn. | 2: Khó xử lý góc nghiêng trên màn hình nhỏ. |
| **Weighted Total** | | **4.7** | **3.05** |

## Architecture

### Component Structure Updates
1.  **`Home.jsx` (The Asymmetrical Bento)**:
    - Thay thế lưới `grid-cols-4` bằng kiến trúc lưới bất đối xứng.
    - Sự kiện nổi bật (Featured) chiếm không gian lớn (`col-span-2 row-span-2`).
2.  **`EventCard.jsx` (The Double-Bezel)**:
    - Xóa border và shadow tĩnh mặc định.
    - Áp dụng một `div` vỏ ngoài và lõi trong đồng tâm.
    - Nút bấm bên trong Card sử dụng cấu trúc "Button-in-Button".
3.  **`HeroSlider.jsx` & `App.jsx` (Motion & Spacing)**:
    - Khoảng trắng vi mô (Macro-Whitespace): Đẩy padding các section lên `py-24` hoặc `py-32`.
    - Animations: Cập nhật `tailwind.config.js` để thêm các utility classes cho `cubic-bezier(0.32,0.72,0,1)`.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | Cập nhật `tailwind.config.js` & `index.css` |
| 2     | coder    | Yes      | Refactor `Home.jsx`, `EventCard.jsx` |
| 3     | coder    | Yes      | Refactor `HeroSlider.jsx`, `App.jsx` |
| 4     | tester   | No       | Audit UI |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Vỡ Layout Mobile | HIGH | MEDIUM | Đảm bảo mọi rule `col-span` đều có modifier màn hình lớn (`md:col-span-2`). |
| Hiệu năng Render | MEDIUM | LOW | Chỉ animate `transform` và `opacity`. Không sử dụng `backdrop-blur` trên scroll elements. |

## Success Criteria
1. Bố cục Bento Grid hiển thị chính xác trên Desktop và thành cột đơn trên Mobile.
2. Thẻ EventCard và HeroSlider có animation mượt mà (không dùng linear easing).
3. Đảm bảo cấu trúc Double-Bezel được áp dụng cho EventCard.