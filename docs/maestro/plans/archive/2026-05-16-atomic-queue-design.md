---
title: "Redis Atomic & ZSET Optimization"
created: "2026-05-16T13:30:00Z"
status: "approved"
authors: ["TechLead", "User"]
type: "design"
design_depth: "quick"
task_complexity: "simple"
---

# Design & Plan

## Objective
Khắc phục 2 lỗi Major từ code review:
1. Race Condition khi Process Queue (chuyển sang Lua Script).
2. Hiệu năng quét session hết hạn (chuyển từ SCAN sang ZSET).

## Approach
1. **Lua Script for ProcessQueue**: Trong `repository.go`, thêm hàm `PopAndIncrement` dùng `EVAL`.
2. **ZSET for Sessions**: Lưu session với score là timestamp. Worker lấy `ZRANGEBYSCORE` nhỏ hơn `now` để xóa.

## Agent Team
1. `coder` - Sửa `internal/queue/` và `worker.go`.
