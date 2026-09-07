# Session Brief - tdytools-gplx

## 1. Overview
- **Dự án**: `tdytools-gplx` — PWA Web App Luyện thi lý thuyết GPLX 600 câu hỏi (trọng tâm Hạng B).
- **Thư mục làm việc**: `d:\Project\GAntigravity\Projects_Active\tdytools\tdytools-gplx\`
- **Nguồn sự thật (Source of Truth)**: `d:\Project\GAntigravity\Projects_Active\tdytools\tdytools-gplx\.knowns\`
- **Căn cứ pháp lý & Nguồn dữ liệu đã đối soát**:
  - *Question Bank Sources*: `assets/600-cau-hoi-sat-hach.pdf` và `CV 2262/CSGT-P5` (Phụ lục III: 60 câu điểm liệt).
  - *Regulatory Sources*: `CV 2262/CSGT-P5` (hiện hành 30 câu / 20 phút / 27 điểm đạt) và Thông tư `108/2026/TT-BCA` (Phụ lục III: 50 câu / 33 phút / 45 điểm đạt từ 01/03/2027).
- **Quy chuẩn giao tiếp**: `/caveman` (cô đọng, kỹ thuật chính xác, đại từ bạn - tôi).

## 2. Priorities
1. Duy trì Knowns làm nguồn sự thật duy nhất.
2. Tách biệt `QuestionBankVersion` (`QB_600_2025`) và `ExamProfile` (`B_2025_TRANSITION` vs `B_2027_PLACEHOLDER` không có blueprint và không cho sinh đề).
3. Triển khai Exam Engine sinh đề Blueprint 30 câu (1 critical + 8 rules + 1 culture + 1 tech + 1 repair + 9 signs + 9 scenario) match đúng `criticalSetId`, loại trừ duplicate 100%, dùng Seeded RNG chung.
4. Xây dựng Learning Engine với Dexie DB, định nghĩa thành thạo rõ ràng (`consecutiveCorrect >= 2`, sai rớt về `review`) và hàng đợi Smart Review minh bạch.
5. Cung cấp tính năng khôi phục bài thi dở dang (Session Recovery), lưu `profileSnapshot` bất biến, và sao lưu/phục hồi dữ liệu (Backup/Restore JSON có `schemaVersion: 1`).

## 3. Decisions
- Xem chi tiết tại [decisions.md](file:///d:/Project/GAntigravity/Projects_Active/tdytools/tdytools-gplx/.knowns/decisions.md) (DEC-01 đến DEC-22):
  - **DEC-01**: Knowns single source of truth.
  - **DEC-02**: Tách biệt Nguồn câu hỏi & Nguồn quy chế sát hạch.
  - **DEC-03**: Chuẩn hoá đầu ra dữ liệu JSON và CSV UTF-8 with BOM.
  - **DEC-04**: Khóa cứng 60 câu điểm liệt từ Phụ lục III CV 2262.
  - **DEC-05**: Bật `/caveman` full, đại từ "bạn - tôi".
  - **DEC-06**: Cấu trúc đề thi Hạng B 30 câu theo Blueprint CV 2262.
  - **DEC-07**: Tách biệt QuestionBankVersion & ExamProfile; khóa sinh đề với `B_2027_PLACEHOLDER`.
  - **DEC-08**: Không hiển thị badge "Điểm liệt" trong ExamMode (blind-to-critical).
  - **DEC-09**: Lưu trữ IndexedDB (Dexie) cho tiến độ & sao lưu Backup/Restore JSON (`schemaVersion: 1`).
  - **DEC-10**: Thuật toán sinh đề match `criticalSetId`, rút critical trước và loại trừ khỏi category pool.
  - **DEC-11**: Định nghĩa thành thạo (`mastered`): đúng 2 lần liên tiếp; làm sai reset về 0 và rớt về `review`.
  - **DEC-12**: Lưu exam snapshot mảng `questionIds`, `profileSnapshot` và tự động khôi phục session.
  - **DEC-13**: Hỗ trợ Seeded RNG cho Exam Generator dùng chung mọi hàm sampling/shuffle.
  - **DEC-14**: Phân định rõ `attemptedCount` (Đã làm) vs `masteredCount` (Thành thạo).
  - **DEC-15**: Tách rời cấu hình `ReviewWeights` khỏi engine tính điểm.
  - **DEC-16**: Đóng gói Source Manifest auditable trong `data/manifest.json`.
  - **DEC-17**: Mã băm `contentHash` (SHA-256) cho mỗi câu hỏi.
  - **DEC-18**: Metric Khuyến nghị sẵn sàng thi: `Mức độ sẵn sàng: CAO`.
  - **DEC-19**: Nhúng blueprint trực tiếp vào manifest profile.
  - **DEC-20**: Chốt thư viện Dexie.js.
  - **DEC-21**: Chốt styling Tailwind CSS + CSS variables tokens.
  - **DEC-23**: Lộ trình sư phạm 7 bước & 18 Đề luyện chuẩn (Fixed Seeds).
  - **DEC-24**: Kiểm tra đối chiếu hai chiều criticalSetId (Cross-Consistency Invariant).
  - **DEC-25**: Nguyên tắc dữ liệu cốt lõi CRAM_120_B (No isolated profile, hai chiều tức thì).
  - **DEC-26**: Chuẩn hóa taxonomy ActivityMode & Bảng attempts (Immutable event log).
  - **DEC-27**: Official Question Data quyết định correctness, UI không can thiệp.
  - **DEC-28**: Nộp bài thi nguyên tử submitExamAtomically (ExamRecord + attempts + userProgress).
  - **DEC-29**: Dynamic Review View & Sửa lỗi đạt mastery xuyên mode.
  - **DEC-30**: Chụp snapshot CramBaseline & So sánh Before/After delta.
  - **DEC-31**: Nâng cấp BackupData schemaVersion 2 kèm AttemptRecord[].
  - **DEC-32**: Khắc phục Lỗ hổng Tiền sản xuất (Pre-Production Hardening: SW v2, timer closure fix, CSP, bulkAdd/bulkPut).
  - **DEC-33**: Tùy chọn Tự động chuyển câu (Exam Auto-Advance: 250ms debounce, localStorage toggle).
  - **DEC-34**: Chuẩn hóa Điều hướng Bàn phím (Keyboard Navigation: ArrowLeft/Right bài thi, 1-4 & ArrowRight/Enter Sprint Vá Điểm Yếu).

## 4. Patterns
- Xem chi tiết tại [patterns.md](file:///d:/Project/GAntigravity/Projects_Active/tdytools/tdytools-gplx/.knowns/patterns.md):
  - **Knowns First**: Đọc decisions/tasks trước khi code.
  - **PDF Vector Underline**: Nhận diện đáp án đúng bằng toạ độ vector gạch chân.
  - **Exam Blueprint Duplicate Protection & Seeded RNG**: Rút critical trước, filter exclude trong pool category, hỗ trợ seed.
  - **Two-Tier Pass Evaluation**: Đạt điểm và không sai câu điểm liệt.
  - **Exam Session Auto-Save & Recovery**: Lưu tức thời vào Dexie, F5 khôi phục.
  - **Blind-to-Critical & ExamModePolicy**: Tách bạch hiển thị UI và engine.
  - **Deterministic Mastery & Reset**: `consecutiveCorrect >= 2`, sai rớt về `review`.
  - **Backup & Restore JSON**: Xuất nhập file sao lưu dữ liệu có `schemaVersion: 2` (hỗ trợ đọc v1).
  - **Golden Test Fixtures**: Snapshot 6 câu hỏi cố định trong `tests/fixtures/`.
  - **Two-Way Global State Accelerator**: Cấp tốc 120 phút đọc và ghi vào Global Learning Core.
  - **Immutable Event Log & Materialized Projection**: `attempts` (append-only) kết hợp `rebuildProgressFromAttempts()`.
  - **Atomic Multi-Entity Transaction**: Nộp bài thi bọc trong 1 Dexie transaction nguyên tử.
  - **Dynamic Derived Review Queue**: Hàng đợi cần ôn tính động, không lưu mảng tĩnh.
  - **Baseline Snapshot & Before/After Delta**: Đo lường sự tiến bộ thực sự sau phiên cấp tốc.
  - **Static Asset Path Prefix**: Luôn chuẩn hóa đường dẫn ảnh với tiền tố `/images/`.
  - **Exam Record Local Cache & Fallback**: 3-tier fallback chống stale state và màn hình trắng khi nộp bài thi.
  - **Sequential Cram Keyboard Navigation**: Điều hướng siêu tốc `1..4` chọn đáp án, `ArrowRight`/`Enter` chuyển câu.
  - **Auto-Advance Debounce & User Preference**: Tự động chuyển câu sau 250ms debounce và dọn dẹp timer unmount an toàn.
  - **Dedicated Dev-Server Management Script**: File `run-gplx.cmd` giải phóng zombie Node process và chạy cổng 3000.

## 5. Completed & Active Tasks
- [x] `TG-SETUP`: Khởi tạo hạ tầng dự án & Knowns v0.33.0.
- [x] `TG-LEGAL`: Đối soát 2 nguồn quy chế CV 2262 & TT 108/2026.
- [x] `TG-CTD61K`: Phase 1 — Trích xuất 600 câu hỏi, 318 hình ảnh, 60 điểm liệt.
- [x] `TG-7JVCCH`: Phase 2 — Kiểm định QA dữ liệu 10/10 Invariants.
- [x] `TG-967Y0Y`: Phase 3 — Xây dựng Learning Engine (Dexie, Deterministic Mastery & Reset).
- [x] `TG-77QX29`: Phase 4 — Xây dựng Exam Engine sinh đề Blueprint 30 câu & chấm 2 tầng.
- [x] `TG-RKRASF`: Phase 5 — Xây dựng Web App Mobile-First hoàn chỉnh, tối ưu bottom nav & responsive.
- [x] `TG-PWA001`: Phase 6 — PWA Offline, Dexie Auto-Recovery & Backup/Restore JSON v2.
- [x] `TG-CRAM120-CORE`: Add-on v4.2 — Lộ trình Cấp tốc 120 phút (Orchestrator 7 stages, adaptive budget, freeze timer).
- [x] `TG-CRAM120-DATA`: Add-on v4.2 — Tích hợp Dữ liệu Hai chiều CRAM_120_B và Global Learning State (AttemptHistory, Atomic Dexie v3, Before/After Delta).
- [x] `TG-AUDIT-FIX`: Khắc phục toàn bộ 7 lỗi Pre-Production Audit (SW v2, timer closure, CSP, bulkAdd/bulkPut).
- [x] `TG-BUG-IMGPREFIX`: Khắc phục lỗi hình ảnh trong 5 stage CRAM 120 (chuẩn hóa `/images/`).
- [x] `TG-DEV-CMD`: Script `run-gplx.cmd` quản lý dev server port 3000 trên Windows.
- [x] `TG-UX-NAV`: Điều hướng bàn phím `ArrowLeft`/`ArrowRight` bài thi và `1..4`, `ArrowRight`/`Enter` Sprint Vá Điểm Yếu.
- [x] `TG-BUG-CRAMSUBMIT`: Khắc phục màn hình trắng nộp bài Thi #1 trong CRAM 120 (3-Tier fallback).
- [x] `TG-UX-AUTOADVANCE`: Tùy chọn Tự động chuyển câu 250ms debounce trong bài thi.
- [x] `TG-TEST01`: Phase 7 — Kiểm thử E2E toàn diện bằng Browser Subagent (Screen recording, DOM verification, npm run build thành công 100%).
