---
title: "Advanced Search Overlay UI Upgrade"
created: "2026-05-10T06:00:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "complex"
---

# Advanced Search Overlay Design Document

## Problem Statement

Chức năng tìm kiếm hiện tại chỉ là một ô input đơn giản trong Navbar, lọc dữ liệu trực tiếp trên client. Để đạt được đẳng cấp của **TicketMaster**, chúng ta cần một hệ thống tìm kiếm thông minh và có tác động thị giác mạnh mẽ hơn:
1. **Thiếu trải nghiệm tập trung:** Ô search nhỏ không đủ không gian để hiển thị các gợi ý (Autocomplete).
2. **Thiếu bộ lọc chuyên sâu:** Người dùng chưa thể lọc theo Ngày, Địa điểm ngay khi đang gõ.
3. **Thiếu tính nghệ thuật (Cinematic):** Tìm kiếm nên là một trải nghiệm "khám phá" thay vì chỉ là công cụ lọc text.

## Requirements

### Functional Requirements
1. **REQ-SEARCH-1 (Cinematic Overlay):** Click Search sẽ hiện lớp phủ Glassmorphism toàn màn hình.
2. **REQ-SEARCH-2 (Intelligent Autocomplete):** Hiển thị gợi ý ngay khi gõ, phân loại theo "Sự kiện", "Địa điểm".
3. **REQ-SEARCH-3 (Smart Filters):** Chọn nhanh thời gian (Hôm nay, Cuối tuần) trong Overlay.
4. **REQ-SEARCH-4 (Recent Searches):** Lưu từ khóa tìm kiếm gần đây vào LocalStorage.

### Non-Functional Requirements
1. **REQ-SEARCH-5 (Visual Identity):** Tuân thủ ngôn ngữ "Ethereal Glass" và viền "Double-Bezel".
2. **REQ-SEARCH-6 (Responsiveness):** Trượt từ dưới lên trên Mobile.

## Approach

### Selected Approach

**Cinematic Glass Overlay**

Xây dựng một component `SearchOverlay.jsx` được kích hoạt từ Header. 
- **Giao diện:** Phủ mờ toàn màn hình (`backdrop-blur-3xl`). Ô nhập liệu trung tâm với font lớn.
- **Dữ liệu:** Hiển thị 3 khối (Top Matches, Recent/Trending, Quick Filters).

## Architecture

### Component & State Flow
1. **`SearchOverlay.jsx`:** Quản lý input và hiển thị kết quả.
2. **`App.jsx`:** Quản lý state `isSearchOpen` toàn cục.
3. **`Portal`:** Đưa overlay lên lớp cao nhất của DOM.

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | coder    | No       | Khung UI `SearchOverlay.jsx` |
| 2     | coder    | Yes      | Logic Autocomplete & LocalStorage |
| 3     | coder    | Yes      | Tích hợp Filters Ngày/Thể loại |
| 4     | tester   | No       | Kiểm thử tương tác & Performance |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Z-Index Conflicts | MEDIUM | HIGH | Sử dụng React Portal. |
| Memory Leak | LOW | MEDIUM | Xóa keydown listeners khi unmount. |

## Success Criteria
1. Nhấn `Cmd+K` hoặc icon Search mở được Overlay toàn màn hình.
2. Kết quả hiển thị tức thì khi người dùng nhập liệu.
3. Các tìm kiếm gần đây được lưu lại và hiển thị chính xác.
