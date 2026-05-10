---
title: "Premium Search Hub Command Palette Refinement"
created: "2026-05-10T07:00:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "medium"
---

# Premium Search Hub Design Document

## Problem Statement (Refinement)

Giao diện tìm kiếm toàn màn hình hiện tại mang lại cảm giác quá áp đảo và làm mất ngữ cảnh của trang web phía dưới. Thay vì chiếm trọn màn hình, chúng ta cần một **Command Palette** hoặc **Floating Modal** cao cấp:
1. **Tiết kiệm diện tích:** Overlay chỉ nên chiếm một phần diện tích (ví dụ: tối đa 60% chiều rộng, 80% chiều cao) và nằm ở trung tâm màn hình.
2. **Giữ ngữ cảnh:** Người dùng vẫn thấy được nội dung trang web mờ mờ ở phía sau, tạo cảm giác liền mạch.
3. **Bố cục nén:** Bento grid và các khối discovery cần được sắp xếp lại một cách tinh gọn hơn để phù hợp with không gian nhỏ hơn.

## Requirements (Refined)

### Functional Requirements
1. **REQ-SEARCH-1 (Floating Modal):** Search Overlay biến thành một Modal nổi rộng tối đa `850px`, nằm cách top `10vh`.
2. **REQ-SEARCH-2 (Backdrop):** Nền mờ tối (`bg-black/40 backdrop-blur-md`) có chức năng click-to-close.
3. **REQ-SEARCH-3 (Internal Scrolling):** Cuộn độc lập bên trong Modal.

### Non-Functional Requirements
1. **REQ-SEARCH-4 (Compact Bento):** Chuyển từ 3 cột sang 2 cột chính (Main | Sidebar).
2. **REQ-SEARCH-5 (Animation):** Animation xuất hiện dạng "Scale-in" nhẹ nhàng.

## Approach

### Selected Approach

**The Glass Monolith**

Tái cấu trúc `SearchOverlay.jsx` thành một khối kính nổi ở giữa màn hình.
- **Vibe:** Floating Glass Panel với viền Double-Bezel rực rỡ.
- **Layout:** Sử dụng cấu trúc 2 cột nén (Main: Results/Trending | Sidebar: Recent/Filters).

## Architecture

### Component & Styling Updates
1. **`SearchOverlay.jsx` (Refactor):** 
    - Bao bọc toàn bộ nội dung trong một `div` chính với `max-w-[850px]`, `mx-auto`.
    - Thêm lớp `fixed inset-0` làm nền (`bg-black/40 backdrop-blur-md`).
    - Chuyển Bento Grid sang cấu trúc 2 cột linh hoạt.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | Refactor `SearchOverlay.jsx` sang dạng Modal nổi |
| 2     | tester   | No       | Kiểm tra UX & Backdrop |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Mobile Cut-off | HIGH | LOW | Quay lại Fullscreen trên thiết bị nhỏ (<768px). |
| Scroll Chaining | MEDIUM | MEDIUM | Khóa body scroll. |

## Success Criteria
1. Search Hub xuất hiện nổi bật ở giữa màn hình thay vì phủ kín.
2. Click ra ngoài vùng Modal sẽ đóng overlay.
3. Bố cục 2 cột hiển thị cân đối và rõ nét.
