# Trạng thái công việc dự án (tdytools-gplx - Knowns Task Board)

## 1. Các công việc ĐÃ HOÀN THÀNH (DONE)
- [x] **TG-SETUP**: Khởi tạo hạ tầng dự án & chuẩn Knowns (v0.33.0).
- [x] **TG-LEGAL**: Đối soát và phân tách rõ ràng 2 nguồn quy chế CV 2262 & Thông tư 108/2026.
- [x] **TG-ARCH-V4.1**: Chốt đặc tả PLAN v4.1 Final Frozen Specification.
- [x] **TG-CTD61K**: Phase 1 — Trích xuất 600/600 câu hỏi, 318 hình ảnh, 60/60 điểm liệt, data/questions.json, data/questions.csv, extraction-report.json.
- [x] **TG-7JVCCH**: Phase 2 — Kiểm định QA dữ liệu đạt 10/10 Invariants, 6 golden snapshot test fixtures.
- [x] **TG-967Y0Y**: Phase 3 — Xây dựng Learning Engine (Dexie, Deterministic Mastery consecutiveCorrect >= 2, Next Best Action).
- [x] **TG-77QX29**: Phase 4 — Xây dựng Exam Engine sinh đề 30 câu theo Blueprint, chống duplicate, Seeded RNG & chấm 2 điều kiện (1.000 đề mô phỏng PASS 100%).
- [x] **TG-RKRASF**: Phase 5 — Xây dựng giao diện Web App Mobile-First (Dashboard, Chương, Luyện tập, Thi thử, 18 Đề chuẩn, Tra cứu).
- [x] **TG-PWA001**: Phase 6 — Cấu hình PWA Offline-First, Service Worker caching, Dexie Session Auto-Recovery & Backup/Restore JSON (schemaVersion: 1).
- [x] **TG-TEST01**: Phase 7 — Kiểm thử toàn diện E2E bằng Browser Subagent (Screen recording, DOM verification, npm run build thành công 100%).
- [x] **TG-CRAM120-CORE**: Add-on v4.2 — Thiết kế & triển khai Lộ trình Cấp tốc 120 phút CRAM_120_B (7 stages, adaptive budget, freeze timer, readiness heuristic).
- [x] **TG-CRAM120-DATA**: Add-on v4.2 — Tích hợp Dữ liệu Hai chiều CRAM_120_B và Global Learning State (AttemptHistory, Atomic Dexie v3, Before/After Delta).
- [x] **TG-AUDIT-FIX**: Khắc phục toàn bộ 7 lỗi Pre-Production Audit (PWA SW v2 precache/offline, timer closure fix, CSP header, Dexie v3 upgrade backfill, batch queries bulkAdd/bulkPut).
- [x] **TG-BUG-IMGPREFIX**: Khắc phục lỗi hình ảnh trong 5 stage CRAM 120 (chuẩn hóa tiền tố `/images/`).
- [x] **TG-DEV-CMD**: Xây dựng script `run-gplx.cmd` quản lý vòng đời dev server port 3000 trên Windows.
- [x] **TG-UX-NAV**: Chuẩn hóa điều hướng bàn phím (Arrow Left/Right cho bài thi, 1-4 & ArrowRight cho Sprint Vá Điểm Yếu).
- [x] **TG-BUG-CRAMSUBMIT**: Khắc phục lỗi màn hình trắng khi nộp bài Thi #1 trong CRAM 120 (3-Tier fallback: Local cache + Direct Dexie query + Loading fallback + Context sync).
- [x] **TG-UX-AUTOADVANCE**: Tùy chọn "Tự động chuyển câu" sau 250ms debounce khi chọn đáp án trong bài thi (localStorage persistence).

---

## 2. Các công việc TIẾP THEO (Giai đoạn sau / Optional)
- [ ] **TG-SYNC-CLOUD**: Đồng bộ Cloud / Multi-device (Hiện tại đã hoàn chỉnh PWA Offline-First + Dexie v3 + Backup JSON v2).
- [ ] **TG-2027-PROFILE**: Triển khai đề thi 50 câu Thông tư 108/2026/TT-BCA khi Bộ Công An công bố bộ 600 câu hỏi mới (Dự kiến trước 01/03/2027).



