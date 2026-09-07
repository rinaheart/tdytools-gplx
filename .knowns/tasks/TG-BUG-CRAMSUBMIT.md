---
id: TG-BUG-CRAMSUBMIT
title: 'Sua loi man hinh trang sau khi nop bai Thi thu #1 trong Cram 120'
status: done
priority: critical
labels:
  - bug
  - cram-120
  - state-sync
createdAt: '2026-09-08T03:30:00.000Z'
updatedAt: '2026-09-08T04:15:00.000Z'
timeSpent: 35
---
# Sua loi man hinh trang sau khi nop bai Thi thu #1 trong Cram 120

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
Khắc phục lỗi màn hình trắng khi nộp bài thi thử #1 trong lộ trình Cấp tốc 120 phút (`Cram120Container.tsx`):
- Nguyên nhân: `Cram120Container` đọc `examHistory.find(e => e.id === session.exam1RecordId)` từ React Context `useApp()`, nhưng state này chưa kịp cập nhật lại từ IndexedDB ngay tại thời điểm render stage chuyển tiếp.
- Giải pháp:
  1. Thêm local state `localExams` trong `Cram120Container` để lưu ngay đối tượng `ExamRecord` vừa tạo.
  2. Thêm async fallback trực tiếp `db.examHistory.get(session.exam1RecordId)` bằng `useEffect` khi reload trang.
  3. Hiển thị loading spinner chuyển tiếp an toàn thay vì return null gây màn hình trắng.
  4. Cập nhật `updateCramSession()` trong `AppContext.tsx` để kích hoạt load lại toàn bộ `examHistory` và `progressMap`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] Nộp bài thi #1 lập tức chuyển sang màn hình phân tích lỗ hổng mà không bị trắng màn hình.
- [x] Khi F5 tải lại trang giữa chừng vẫn khôi phục chính xác bài thi từ IndexedDB.
<!-- AC:END -->
