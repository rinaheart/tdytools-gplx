---
id: TG-UX-AUTOADVANCE
title: 'Tuy chon Tu dong chuyen cau trong che do thi thu'
status: done
priority: medium
labels:
  - ux
  - exam
  - settings
createdAt: '2026-09-08T03:45:00.000Z'
updatedAt: '2026-09-08T04:45:00.000Z'
timeSpent: 30
---
# Tuy chon Tu dong chuyen cau trong che do thi thu

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
Thêm tùy chọn "Tự động chuyển câu" khi làm bài thi thử:
- Khi người dùng bấm chọn một đáp án, hệ thống giữ lại 250ms để hiển thị phản hồi trực quan, sau đó tự động chuyển sang câu tiếp theo.
- Cung cấp toggle switch trực quan tại góc phải thanh công cụ.
- Trạng thái được lưu trong `localStorage ('tdy_auto_advance_exam')`, mặc định bật (`true`).
- Triển khai đồng bộ trên cả `ExamView.tsx` và `CramExamStage.tsx`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] Toggle switch hiển thị rõ ràng, dễ thao tác trên mobile và desktop.
- [x] Chọn đáp án tự động nhảy câu tiếp theo sau 250ms.
- [x] Đổi câu cuối cùng không nhảy vượt biên index.
- [x] Dọn dẹp timer khi component unmount để tránh rò rỉ bộ nhớ.
<!-- AC:END -->
