# tdytools-gplx

Bộ công cụ xử lý dữ liệu và thi thử sát hạch GPLX (600 câu hỏi sát hạch lý thuyết lái xe ô tô / mô tô).

## 1. Giới thiệu
- Dự án thuộc hệ sinh thái `tdytools`.
- Phân tích, bóc tách cấu trúc câu hỏi từ tài liệu gốc `assets/600-cau-hoi-sat-hach.pdf`.
- Cung cấp dữ liệu chuẩn hoá (JSON/CSV) và engine trắc nghiệm / hỗ trợ học tập.

## 2. Cấu trúc thư mục
```
tdytools-gplx/
├── .agents/               # Đồng bộ Knowns skills
├── .claude/               # Cấu hình Claude/Knowns
├── .knowns/               # Knowns single source of truth
│   ├── config.json        # Cấu hình dự án Knowns
│   ├── decisions.md       # Quyết định kỹ thuật
│   ├── patterns.md        # Các pattern kỹ thuật
│   ├── docs/              # Tài liệu kiến trúc
│   └── memory/            # Session brief & task board
├── assets/                # Tài liệu gốc (PDF 600 câu)
├── AGENTS.md              # Shim tương thích Agents
├── CLAUDE.md              # Shim tương thích Claude Code
├── KNOWNS.md              # Quy chuẩn Knowns trung tâm
├── README.md              # Giới thiệu dự án
└── SPEC.md                # Đặc tả chức năng dự án
```

## 3. Quản lý trạng thái dự án
- Sử dụng Knowns CLI (`knowns sync`, `knowns doc`, `knowns task`).
- Tuân thủ nguyên tắc `/caveman` và Karpathy Coding Guidelines.
