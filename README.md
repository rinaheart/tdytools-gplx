# tdytools-gplx

Ứng dụng Web PWA luyện thi sát hạch lý thuyết lái xe ô tô **Hạng B** chuẩn **600 câu hỏi Cục Cảnh sát giao thông (Bộ Công an — CV 2262/CSGT-P5)**.

## 1. Điểm nổi bật
- **Chuẩn pháp lý 100%**: Bóc tách trực tiếp 600 câu hỏi, 318 hình ảnh minh họa, đáp án gạch chân vector và 60 câu điểm liệt theo Phụ lục III Công văn 2262/CSGT-P5 (bố cục 6 chương chính thức: `1–180`, `181–205`, `206–263`, `264–300`, `301–485`, `486–600`).
- **Phòng thi sát hạch chuẩn ma trận 30 câu**: 1 câu điểm liệt + 8 quy tắc + 1 văn hóa/PCCC + 1 kỹ thuật + 1 cấu tạo sửa chữa + 9 biển báo + 9 sa hình (20 phút, đạt ≥ 27/30 và không sai điểm liệt, ẩn nhãn điểm liệt khi thi).
- **18 Đề mẫu cố định & Lộ trình Cấp tốc 120 phút (Cram-120)**: Tích hợp 2 chiều với Global Learning State trên IndexedDB (Dexie.js).
- **Offline-First PWA**: Hoạt động không cần mạng sau lần tải đầu, tự động khôi phục bài thi dở dang và hỗ trợ sao lưu/khôi phục JSON.

## 2. Cấu trúc thư mục
```text
tdytools-gplx/
├── assets/                # Văn bản PDF gốc Cục CSGT & Bộ Công an
├── data/                  # manifest.json, chapters.json, questions.json, questions.csv
├── public/                # icon.svg, manifest.webmanifest, sw.js & 318 ảnh câu hỏi
├── scripts/               # Pipeline trích xuất & kiểm định bất biến dữ liệu
├── src/                   # Mã nguồn React 19 + TypeScript + Tailwind v4 + Dexie 4
└── tests/                 # Golden snapshot fixtures chống hồi quy dữ liệu
```

## 3. Lệnh phát triển & Kiểm định
```bash
npm run dev                              # Chạy dev server tại http://localhost:3000
npm run build                            # Kiểm tra TypeScript (tsc -b) & đóng gói Vite
python scripts/validate_dataset.py       # Kiểm định 10 invariants toàn vẹn dữ liệu
python tests/test_golden_fixtures.py     # Kiểm thử snapshot câu hỏi chuẩn
python scripts/test_exam_generator.py    # Kiểm thử mô phỏng 1.000 đề thi Blueprint
```
