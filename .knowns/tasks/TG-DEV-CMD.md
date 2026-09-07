---
id: TG-DEV-CMD
title: 'Tao file run-gplx.cmd quan ly may chu dev port 3000'
status: done
priority: medium
labels:
  - dev-tools
  - script
  - windows
createdAt: '2026-09-08T02:45:00.000Z'
updatedAt: '2026-09-08T03:15:00.000Z'
timeSpent: 15
---
# Tao file run-gplx.cmd quan ly may chu dev port 3000

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
Xây dựng script tiện ích `run-gplx.cmd` đặt tại root dự án giúp người dùng kiểm soát vòng đời máy chủ Vite trên Windows:
- Tự động quét và giải phóng cổng 3000 bị chiếm dụng bởi tiến trình Node nền cũ (`taskkill /F /PID`).
- Cung cấp menu tương tác trực quan:
  1. Chạy Web App (Port 3000)
  2. Dừng Server (Đóng port 3000)
  3. Khởi động lại Server
  4. Kiểm tra trạng thái cổng
- Hỗ trợ tham số dòng lệnh CLI: `run-gplx.cmd start`, `stop`, `restart`, `status`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] Chạy trực tiếp bằng cách double click trên Windows Explorer hoặc qua terminal.
- [x] Khởi động Vite chính xác tại cổng 3000 theo quy chuẩn Global Preferences.
- [x] Đóng server triệt để, không để lại zombie process.
<!-- AC:END -->
