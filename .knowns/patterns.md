# Known Patterns (tdytools-gplx)

## 1. Knowns First Pattern
- Luôn kiểm tra và đối chiếu các quyết định trong `.knowns/decisions.md` trước khi triển khai tính năng.
- Sau mỗi phase công việc, cập nhật task board tại `.knowns/memory/tasks_state.md`.

## 2. PDF Extraction & Vector Underline Pattern
- Trích xuất đáp án đúng qua toạ độ đường kẻ gạch chân vector đen nằm trực tiếp dưới text của phương án trả lời.
- Toạ độ trục $Y$ của hình ảnh gắn trực tiếp với câu hỏi nằm ngay phía trên.

## 3. Exam Blueprint Duplicate Protection & Seeded RNG Pattern
- Rút câu critical theo đúng `criticalSetId` (1 câu) trước và đưa ID vào `selectedIds Set`.
- Khi rút các slot category tiếp theo, luôn lọc loại trừ `selectedIds` để triệt tiêu nguy cơ trùng lặp giữa critical pool và category pool.
- Toàn bộ thao tác sample và shuffle phải dùng chung con RNG được truyền vào (`createSeededRandom(seed)` hoặc `Math.random`).
- Invariant: `criticalQuestionId NOT IN rulesQuestionIds` và `len(set(examQuestionIds)) == 30`.

## 4. Exam Two-Tier Pass Evaluation Pattern
- Điểm đạt: `score >= passingScore && criticalMistake == false`.
- Sai câu điểm liệt = KHÔNG ĐẠT ngay lập tức, bất kể tổng điểm.

## 5. Exam Session Auto-Save & Recovery Pattern
- Trạng thái bài thi lưu tức thời vào IndexedDB (Dexie) mỗi khi chọn đáp án.
- Nếu người dùng reload (F5) hoặc màn hình điện thoại tắt, app khôi phục phiên thi dở dang không mất bài.
- Khi `timer = 00:00`, tự động submit và chấm điểm.
- Sau khi nộp: Chuyển `ActiveExamSession` thành `ExamRecord` bất biến kèm `profileSnapshot`.

## 6. Blind-to-Critical & ExamModePolicy Pattern
- Quản lý qua `EXAM_MODE_POLICY` (`showCriticalBadge = false`) và `PRACTICE_MODE_POLICY` (`showCriticalBadge = true`).
- Trong ExamMode: giấu toàn bộ badge "Điểm liệt", không đổi màu, không icon cảnh báo, không hiện đáp án giữa chừng.

## 7. Deterministic Mastery & Reset Pattern
- Trạng thái `mastered` đạt được khi đúng **2 lần liên tiếp** (`consecutiveCorrect >= 2`).
- Khi làm sai sau khi đã `mastered`: Reset ngay `consecutiveCorrect = 0` và rớt về status `review`.

## 8. Transparent Priority Review Scoring Pattern
- Tách riêng cấu hình trọng số `REVIEW_WEIGHTS`.
- Tính điểm `ReviewPriorityScore` minh bạch, sắp xếp ưu tiên ôn câu điểm liệt sai gần đây (+100), điểm liệt chưa làm (+90), câu sai nhiều lần (+70), câu lâu chưa ôn (+30).

## 9. Backup & Restore JSON Pattern
- Cung cấp tính năng tải file `tdytools-gplx-backup-YYYY-MM-DD.json` có định dạng `schemaVersion: 1`.
- Nhập file backup để khôi phục Dexie DB trên thiết bị mới.

## 10. Golden Test Fixtures Pattern
- Lưu snapshot 6 câu hỏi đại diện (`q-001`, `q-019`, `q-206`, `q-301`, `q-486`, `q-600`) trong `tests/fixtures/` để kiểm tra chống regression khi sửa đổi pipeline extractor.

## 11. Two-Way Global State Accelerator Pattern
- Chế độ cấp tốc (Cram 120) không tạo profile học riêng mà hoạt động như một accelerator layer trên cùng Global Learning Core.
- Đọc `UserProgress` + `AttemptHistory` + `ExamHistory` để xây dựng hàng đợi cá nhân hoá; ghi nhận kết quả học ngược trở lại tức thời sau mỗi câu trả lời.

## 12. Immutable Event Log & Materialized Projection Pattern
- `AttemptHistory` lưu trữ danh sách các hành vi trả lời thực tế (append-only immutable).
- `UserProgress` là hình chiếu tổng hợp (materialized summary) được cập nhật đồng thời qua atomic transaction.
- Khi cần kiểm toán hoặc phục hồi sự cố, hàm `rebuildProgressFromAttempts()` tái hiện 100% trạng thái tiến độ từ event log.

## 13. Atomic Exam & Multi-Entity Transaction Pattern
- Khi nộp bài thi thử, toàn bộ các thực thể liên quan (`ExamRecord`, `AttemptRecord` cho từng câu đã làm, `UserProgress` cập nhật và `ActiveExamSession` xóa) được bọc trong 1 Dexie transaction nguyên tử duy nhất, loại bỏ hoàn toàn rủi ro lưu nửa chừng nếu reload/crash.

## 14. Dynamic Derived Review Queue Pattern
- Hàng đợi câu cần ôn (`getQuestionsNeedingReview`) là dynamic derived state tính toán trực tiếp từ `UserProgressItem` và `Question.isCritical`, không lưu mảng tĩnh câu sai.
- Khi người học sửa đúng 2 lần liên tiếp xuyên mode, câu tự động thoát khỏi hàng đợi cần ôn mà không cần logic xóa thủ công.

## 15. Baseline Snapshot & Before/After Delta Pattern
- Tại thời điểm bắt đầu phiên cấp tốc, chụp ảnh snapshot `baseline` các chỉ số cốt lõi.
- Tại màn hình kết quả, so sánh delta Before $\rightarrow$ After minh bạch giúp người học thấy rõ mức độ thu hẹp lỗ hổng kiến thức và sự tiến bộ cụ thể.

## 16. Static Asset Path Prefix Pattern
- `questions.json` lưu tên file ảnh độc lập (e.g. `q-400.png`), assets nằm trong `public/images/`.
- Mọi component render ảnh (`QuestionCard`, `ExamResultView`, các stage của `CRAM_120`) phải luôn chuẩn hóa đường dẫn: `src={question.image.src.startsWith('/') ? question.image.src : `/images/${question.image.src}`}` để tránh 404 từ static root.

## 17. Exam Record Local Cache & Fallback Pattern
- Khi hoàn thành bài thi trong session workflow (`CRAM_120`), lưu ngay `record` vào local state `localExams` để chuyển stage tức thời (`exam-1` $\rightarrow$ `analysis`), không phụ thuộc vào chu kỳ cập nhật props từ context cha.
- Bổ sung fallback truy vấn trực tiếp IndexedDB `db.examHistory.get(examId)` khi reload trang (F5) và render fallback loading thay vì màn hình trắng.
## 18. Sequential Cram Keyboard Navigation Pattern
- Các stage luyện tập/vá lỗi tuần tự (`WeaknessSprintStage`, `CramExamStage`):
  - Phím số `1`, `2`, `3`, `4`: Chọn nhanh phương án trả lời khi chưa làm.
  - Phím mũi tên phải (`ArrowRight`), mũi tên xuống (`ArrowDown`), hoặc `Enter`: Kích hoạt nút chuyển câu tiếp theo (`handleNext`) sau khi đã có phương án được chọn, giúp thao tác liên tục không cần chạm chuột.
  - Chèn badge gợi ý phím tắt (`<kbd>→</kbd>`) trên nút điều hướng và header để trực quan hóa UX.

## 19. Auto-Advance Debounce & User Preference Pattern
- Trong chế độ thi thử (`ExamView`, `CramExamStage`), người dùng khi bấm chọn đáp án mong muốn chuyển ngay sang câu tiếp theo mà không cần click nút Next hoặc phím mũi tên.
- Sử dụng debounce delay 250ms (`setTimeout`) qua `useRef` (`autoAdvanceTimerRef`) để người dùng kịp nhìn thấy hiệu ứng chọn đáp án trước khi đổi câu.
- Dọn dẹp timer trong `useEffect cleanup` tránh rò rỉ bộ nhớ hoặc nhảy câu sai khi unmount / chuyển stage.
- Lưu user preference vào `localStorage ('tdy_auto_advance_exam')` và cung cấp toggle switch trực quan tại góc điều khiển bài thi.

## 20. Dedicated Dev-Server Management Script Pattern
- Môi trường phát triển Windows thường gặp tình trạng cổng 3000 bị chiếm dụng bởi tiến trình Node nền cũ (zombie node processes).
- Cung cấp file script `run-gplx.cmd` tại root dự án với tính năng tự động nhận diện PID đang listen trên port 3000 via `netstat -ano`, giải phóng cổng an toàn (`taskkill /F /PID`), và khởi động `npm run dev -- --port 3000`.
- Hỗ trợ cả tương tác menu số (Start/Stop/Restart/Status) lẫn đối số dòng lệnh (`run-gplx.cmd start`, `stop`, `restart`, `status`).

