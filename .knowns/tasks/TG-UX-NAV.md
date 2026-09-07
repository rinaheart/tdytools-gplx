---
id: TG-UX-NAV
title: 'Toi uu dieu huong ban phim: Mui ten trai/phai & Sprint 1-4, ArrowRight'
status: done
priority: high
labels:
  - ux
  - keyboard
  - cram-120
createdAt: '2026-09-08T03:00:00.000Z'
updatedAt: '2026-09-08T04:55:00.000Z'
timeSpent: 45
---
# Toi uu dieu huong ban phim: Mui ten trai/phai & Sprint 1-4, ArrowRight

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
Nâng cao tốc độ làm bài thi và luyện tập cấp tốc không cần chuột:
1. Thi thử chuẩn (`ExamView.tsx`) & Thi thử Cram (`CramExamStage.tsx`): Hỗ trợ phím `ArrowLeft` (quay lại câu trước) và `ArrowRight` (tiến sang câu sau), có badge `<kbd>←</kbd> <kbd>→</kbd>`.
2. Sprint Vá Điểm Yếu (`WeaknessSprintStage.tsx`): Hỗ trợ phím `1`, `2`, `3`, `4` để chọn phương án; `ArrowRight`, `ArrowDown`, `Enter` để chuyển câu tiếp theo (`handleNext`) sau khi đã trả lời. Có badge gợi ý trên thanh banner và nút "Câu tiếp theo".
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] Nhấn phím mũi tên trái/phải di chuyển mượt mà giữa các câu trong bài thi.
- [x] Không xung đột khi focus vào input / textarea.
- [x] Sprint Vá Điểm Yếu cho phép bấm `1..4` chọn đáp án và `→` chuyển câu tiếp theo.
- [x] Build TypeScript & Vite kiểm thử thành công 100%.
<!-- AC:END -->
