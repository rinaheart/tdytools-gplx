---
id: TG-BUG-IMGPREFIX
title: 'Sua loi hien thi anh minh hoa trong 5 stage cua Cram 120'
status: done
priority: high
labels:
  - bug
  - assets
  - cram-120
createdAt: '2026-09-08T02:30:00.000Z'
updatedAt: '2026-09-08T03:00:00.000Z'
timeSpent: 20
---
# Sua loi hien thi anh minh hoa trong 5 stage cua Cram 120

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
Khắc phục lỗi hình ảnh không hiển thị (broken image icons) trong các giai đoạn học của Cram 120:
- Nguyên nhân: `currentQ.image.src` trong dữ liệu gốc là tên file tương đối (vd: `q-400.png`), nhưng các stage gán trực tiếp vào thẻ `img src={...}` thay vì trỏ vào thư mục `/images/`.
- Giải pháp: Chuẩn hóa đường dẫn hiển thị ảnh tại 5 stage:
  - `CramExamStage.tsx`
  - `CriticalRepairStage.tsx`
  - `CriticalTriageStage.tsx`
  - `FinalSafetyCheckStage.tsx`
  - `WeaknessSprintStage.tsx`
  Cú pháp chuẩn: `src={currentQ.image.src.startsWith('/') ? currentQ.image.src : `/images/${currentQ.image.src}`}`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] Toàn bộ hình ảnh biển báo, sa hình hiển thị sắc nét, đúng tỷ lệ trong cả 5 stage.
- [x] Không còn lỗi 404 hình ảnh trong tab Network.
<!-- AC:END -->
