# Session Handoff Summary — tdytools-gplx

> **Thời điểm cập nhật:** 08/09/2026  
> **Nguồn sự thật (Source of Truth):** `d:\Project\GAntigravity\Projects_Active\tdytools\tdytools-gplx\.knowns\`  
> **Chế độ giao tiếp mặc định:** `/caveman` (cô đọng, kỹ thuật chính xác, đại từ "bạn - tôi").

---

## 1. Project Snapshot
- **Tên dự án:** `tdytools-gplx` (Web App PWA Luyện thi lý thuyết sát hạch lái xe 600 câu Hạng B).
- **Tech Stack:** React 19 + TypeScript + Vite + Tailwind CSS + Dexie.js (IndexedDB v3) + Lucide Icons + PWA (Workbox Service Worker v2).
- **Cổng chạy Local Dev:** `port: 3000` (quản lý qua `run-gplx.cmd`).
- **Pháp lý & Dữ liệu:**
  - 600 câu hỏi chuẩn từ `600-cau-hoi-sat-hach.pdf`.
  - 60 câu điểm liệt khóa cứng theo Phụ lục III `CV 2262/CSGT-P5`.
  - Đề thi Hạng B hiện hành: 30 câu / 20 phút / Đạt >= 27 điểm & không sai câu điểm liệt.
  - Dự phòng Thông tư 108/2026/TT-BCA (50 câu / 33 phút) khóa ở trạng thái `B_2027_PLACEHOLDER` (chờ bộ đề mới trước 01/03/2027).

---

## 2. Active Decisions (DEC-01 đến DEC-34)
- **DEC-01 $\rightarrow$ DEC-22**: Xem chi tiết tại [decisions.md](file:///d:/Project/GAntigravity/Projects_Active/tdytools/tdytools-gplx/.knowns/decisions.md) (Knowns First, Blueprint 30 câu, Seeded RNG, Deterministic Mastery `>= 2`, Dexie DB, Blind-to-Critical).
- **DEC-23**: Lộ trình sư phạm 7 bước & 18 Đề luyện chuẩn (Fixed Seeds).
- **DEC-24**: Kiểm tra đối chiếu hai chiều `criticalSetId` (10/10 Invariants).
- **DEC-25**: Nguyên tắc dữ liệu cốt lõi CRAM_120_B (Hai chiều tức thì, không tạo profile cô lập).
- **DEC-26**: Chuẩn hóa taxonomy `ActivityMode` & Bảng `attempts` (Immutable event log).
- **DEC-27**: Official Question Data quyết định correctness, UI không can thiệp.
- **DEC-28**: Nộp bài thi nguyên tử `submitExamAtomically` (ExamRecord + attempts + userProgress).
- **DEC-29**: Dynamic Review View & Sửa lỗi đạt mastery xuyên mode.
- **DEC-30**: Chụp snapshot CramBaseline & So sánh Before/After delta.
- **DEC-31**: Nâng cấp BackupData schemaVersion: 2 kèm `AttemptRecord[]`.
- **DEC-32**: Khắc phục Lỗ hổng Tiền sản xuất (SW v2 precache, timer closure fix, CSP header, Dexie v3 migration backfill, `bulkAdd`/`bulkPut`).
- **DEC-33**: Tùy chọn "Tự động chuyển câu" (250ms debounce, lưu localStorage).
- **DEC-34**: Chuẩn hóa Điều hướng Bàn phím (`ArrowLeft`/`ArrowRight` bài thi, `1..4` và `ArrowRight`/`Enter` cho Sprint Vá Điểm Yếu).

---

## 3. Important Patterns (20 Patterns)
Chi tiết tại [patterns.md](file:///d:/Project/GAntigravity/Projects_Active/tdytools/tdytools-gplx/.knowns/patterns.md):
1. **Knowns First**: Đọc docs/tasks/decisions trước khi can thiệp mã nguồn.
2. **PDF Vector Underline**: Trích xuất đáp án bằng tọa độ gạch chân vector.
3. **Exam Blueprint Duplicate Protection & Seeded RNG**: Rút critical trước, loại trừ trong category pool.
4. **Two-Tier Pass Evaluation**: Đạt điểm và không sai điểm liệt.
5. **Exam Session Auto-Save & Recovery**: Lưu tức thời vào Dexie, F5 khôi phục bài dở dang.
6. **Blind-to-Critical & ExamModePolicy**: Ẩn badge điểm liệt lúc thi để bảo đảm tính khách quan.
7. **Deterministic Mastery & Reset**: Đúng 2 lần liên tiếp là `mastered`, sai reset về 0 và rớt về `review`.
8. **Backup & Restore JSON**: Xuất nhập backup có `schemaVersion: 2` (hỗ trợ đọc v1).
9. **Golden Test Fixtures**: 6 câu test snapshot cố định tại `tests/fixtures/`.
10. **Two-Way Global State Accelerator**: CRAM 120 đọc và ghi đồng bộ vào Global Learning Core.
11. **Immutable Event Log & Materialized Projection**: Bảng `attempts` lưu log, `UserProgress` chiếu tổng hợp.
12. **Atomic Multi-Entity Transaction**: Nộp bài thi trong 1 transaction nguyên tử Dexie.
13. **Dynamic Derived Review Queue**: Hàng đợi cần ôn tính động, không lưu mảng tĩnh.
14. **Baseline Snapshot & Before/After Delta**: Đo lường tiến bộ thực sự sau phiên cấp tốc.
15. **Context Overload Handling**: Tóm tắt state định kỳ tránh tràn context.
16. **Static Asset Path Prefix**: Luôn chuẩn hóa đường dẫn ảnh với `/images/`.
17. **Exam Record Local Cache & Fallback**: 3-Tier fallback chống stale state và màn hình trắng khi nộp bài thi.
18. **Sequential Cram Keyboard Navigation**: Phím `1..4` chọn đáp án, `ArrowRight`/`Enter` chuyển câu.
19. **Auto-Advance Debounce & User Preference**: Chuyển câu 250ms sau khi chọn, dọn dẹp timer unmount an toàn.
20. **Dedicated Dev-Server Management Script**: `run-gplx.cmd` kiểm soát port 3000 trên Windows.

---

## 4. Known Pitfalls & Debug Learnings
1. **Broken Image Paths in Sub-components**: Dữ liệu gốc trong `questions.json` chỉ chứa tên file (vd `q-400.png`). Khi render ở bất kỳ stage/view mới nào, luôn dùng pattern `src={q.image.src.startsWith('/') ? q.image.src : `/images/${q.image.src}`}`.
2. **Context Stale Propagation on Instant Stage Transitions**: Khi gọi action cập nhật IndexedDB rồi chuyển view ngay lập tức, React state trong Context cha có thể bị chậm 1 render cycle. Cần lưu local in-memory cache kết hợp direct DB fallback query.
3. **Timer Leaks in Fast-advancing UI**: Mọi timer tự động (`setTimeout` cho auto-advance) phải lưu vào `useRef` và dọn dẹp trong `useEffect cleanup`.
4. **Windows Node Port Conflicts**: Luôn chạy `run-gplx.cmd` hoặc `netstat -ano | findstr :3000` để tắt PID treo trước khi start server mới.

---

## 5. Current State (Task Board)

### Đã Hoàn Thành (DONE)
- [x] `TG-SETUP`: Khởi tạo hạ tầng & Knowns v0.33.0.
- [x] `TG-LEGAL`: Đối soát 2 nguồn quy chế CV 2262 & TT 108/2026.
- [x] `TG-CTD61K`: Phase 1 — Trích xuất 600 câu hỏi, 318 hình ảnh, 60 điểm liệt.
- [x] `TG-7JVCCH`: Phase 2 — QA 10/10 Invariants, 6 golden snapshot test fixtures.
- [x] `TG-967Y0Y`: Phase 3 — Learning Engine (Dexie, Deterministic Mastery & Reset).
- [x] `TG-77QX29`: Phase 4 — Exam Engine Blueprint 30 câu & chấm 2 tầng.
- [x] `TG-RKRASF`: Phase 5 — Web App Mobile-First hoàn chỉnh, tối ưu responsive.
- [x] `TG-PWA001`: Phase 6 — PWA Offline, Dexie Auto-Recovery & Backup/Restore JSON v2.
- [x] `TG-CRAM120-CORE`: Add-on v4.2 — Lộ trình Cấp tốc 120 phút (7 stages, adaptive budget, freeze timer).
- [x] `TG-CRAM120-DATA`: Add-on v4.2 — Tích hợp Dữ liệu Hai chiều CRAM 120 và Global Learning State.
- [x] `TG-AUDIT-FIX`: Khắc phục 7 lỗi Pre-Production Audit (SW v2, timer closure, CSP, bulkAdd/bulkPut).
- [x] `TG-BUG-IMGPREFIX`: Sửa lỗi hiển thị ảnh minh họa trong 5 stage CRAM 120.
- [x] `TG-DEV-CMD`: Tạo file `run-gplx.cmd` quản lý máy chủ dev port 3000.
- [x] `TG-UX-NAV`: Điều hướng phím mũi tên trái/phải bài thi & `1..4`, `ArrowRight`/`Enter` cho Sprint Vá Điểm Yếu.
- [x] `TG-BUG-CRAMSUBMIT`: Sửa lỗi màn hình trắng sau khi nộp bài thi #1 trong CRAM 120.
- [x] `TG-UX-AUTOADVANCE`: Thêm tùy chọn "Tự động chuyển câu" 250ms debounce khi làm bài thi.
- [x] `TG-TEST01`: Phase 7 — Kiểm thử E2E toàn diện bằng Browser Subagent (`npm run build` PASS 100%).

### Đang/Sắp Triển Khai (NEXT / OPTIONAL)
- [ ] `TG-SYNC-CLOUD`: Đồng bộ tiến độ đám mây (Cloud Sync / Multi-device).
- [ ] `TG-2027-PROFILE`: Cấu hình đề thi 50 câu theo Thông tư 108/2026/TT-BCA khi Bộ Công An ban hành bộ câu hỏi mới (trước 01/03/2027).

---

## 6. Next Starting Point
- **Ứng dụng hiện tại đã sẵn sàng 100% cho sản xuất / phát hành PWA.**
- **Lệnh chạy dev nhanh:** Chạy double click file `run-gplx.cmd` hoặc `.\run-gplx.cmd start`.
- **Lệnh build kiểm tra:** `npm run build` (kết quả 0 lỗi, bundle ~871 kB index JS, PWA Service Worker v2 sẵn sàng).
- **Khi bắt đầu session mới:** Gọi `/kn-init` hoặc đọc trực tiếp file này ([handoff.md](file:///d:/Project/GAntigravity/Projects_Active/tdytools/tdytools-gplx/.knowns/handoff.md)) để nắm toàn bộ bối cảnh mà không cần hỏi lại.
