# Kiến trúc Tương tác Điều hướng Bàn phím & Trải nghiệm Thi thử

## 1. Bối cảnh & Mục tiêu
Khi làm bài thi sát hạch lý thuyết 30 câu hoặc tham gia các sprint ôn tập cấp tốc (CRAM 120), thao tác bằng chuột thường tạo độ trễ và gián đoạn nhịp tư duy của người học. Tài liệu này chuẩn hóa cơ chế điều hướng bàn phím, tự động chuyển câu và chuyển trạng thái stage an toàn.

---

## 2. Chuẩn hóa Điều hướng Bàn phím

### 2.1. Chế độ Thi thử (`ExamView.tsx` & `CramExamStage.tsx`)
- **Phím mũi tên trái (`ArrowLeft`)**: Chuyển về câu trước đó (`currentIndex - 1`). Giới hạn chặn dưới `0`.
- **Phím mũi tên phải (`ArrowRight`)**: Chuyển sang câu kế tiếp (`currentIndex + 1`). Giới hạn chặn trên `questions.length - 1`.
- **Bảo vệ Focus Input**: Tự động bỏ qua sự kiện bàn phím nếu target là `HTMLInputElement` hoặc `HTMLTextAreaElement`.
- **Visual Cue**: Hiển thị badge `<kbd>←</kbd> <kbd>→</kbd>` tại thanh điều khiển chuyển câu.

### 2.2. Chế độ Sprint Tuần tự (`WeaknessSprintStage.tsx`)
- **Chọn phương án**: Nhấn phím số `1`, `2`, `3`, `4` tương ứng với đáp án cần chọn khi câu hỏi chưa được trả lời (`!isAnswered`).
- **Chuyển câu kế tiếp**: Sau khi đã chọn đáp án (`isAnswered === true`), nhấn `ArrowRight`, `ArrowDown`, hoặc `Enter` để kích hoạt `handleNext()`.
- **An toàn chống nhảy cóc**: Không cho phép nhấn mũi tên nhảy qua câu khi chưa trả lời, nhằm bảo toàn mục tiêu sư phạm là vá dứt điểm câu sai.

---

## 3. Cơ chế Tự động Chuyển câu (Auto-Advance)

### 3.1. Nguyên lý Hoạt động
- Người dùng bấm chọn đáp án $\rightarrow$ `onSelectOption()` kích hoạt.
- Nếu `autoAdvance === true`, một timer 250ms được tạo qua `autoAdvanceTimerRef`.
- Sau 250ms, hệ thống tự động nhảy sang câu kế tiếp nếu chưa phải câu cuối cùng (`currentIndex < total - 1`).

### 3.2. Quản lý Bộ nhớ & Tránh Stale Timer
```tsx
const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  return () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
  };
}, []);
```
- Khi component unmount (người dùng nộp bài, chuyển tab, hoặc thoát), timer được dọn dẹp triệt để, không gây nhảy câu ngoài mong muốn.
- User preference được lưu bền vững vào `localStorage ('tdy_auto_advance_exam')`.

---

## 4. Chuyển tiếp Trạng thái Thi thử An toàn trong Cram 120

### 4.1. Vấn đề Stale State trong React Context
- Khi hoàn thành bài thi #1 trong `Cram120Container`, hàm `submitExamAtomically()` ghi dữ liệu vào Dexie DB.
- Tuy nhiên, React Context props (`examHistory`) có thể chưa hoàn thành chu kỳ re-render kịp lúc `Cram120Container` chuyển sang stage `analysis`.

### 4.2. Kiến trúc 3 Lớp Bảo vệ (3-Tier Fallback)
1. **Lớp 1 (Local In-Memory Cache)**: Lưu ngay instance `ExamRecord` vừa tạo vào state nội bộ `localExams: Record<string, ExamRecord>`.
2. **Lớp 2 (Direct IndexedDB Query)**: Nếu local cache không có, `useEffect` chủ động truy vấn trực tiếp `db.examHistory.get(session.exam1RecordId)`.
3. **Lớp 3 (Graceful Loading Fallback)**: Trong thời gian chờ dữ liệu, render spinner tải thay vì trả về `null` gây màn hình trắng.
4. **Context Re-sync**: Hàm `updateCramSession()` trong `AppContext.tsx` tự động load lại `examHistory` và `progressMap` để đồng bộ toàn cục.

---

## 5. Chuẩn hóa Đường dẫn Static Asset Hình ảnh
- Tất cả các stage hiển thị câu hỏi có ảnh phải áp dụng chuẩn:
```tsx
src={currentQ.image.src.startsWith('/') ? currentQ.image.src : `/images/${currentQ.image.src}`}
```
- Đảm bảo tương thích cả môi trường local dev (`http://localhost:3000/`) lẫn khi build PWA deploy tĩnh trên sub-path hoặc CDN.
