# SPEC: tdytools-gplx

## §G: Goal
Build mobile-first PWA Web App for learning and simulating the Vietnam GPLX driving theory test (Focus: Class B):
- Separate Question Bank Sources (`600-cau-hoi-sat-hach.pdf` & CV 2262/CSGT-P5) from Regulatory Sources (CV 2262 & Thông tư 108/2026/TT-BCA).
- Source Manifest: `data/manifest.json` with embedded blueprint.
- Extract and validate all 600 questions, 295 images, and underlined correct answers.
- Lock 60 critical questions from Appendix III of CV 2262/CSGT-P5 (`CRITICAL_60_2025`).
- Generate standard 30-question exam according to official Class B Blueprint (1 critical + 8 rules + 1 culture + 1 driving tech + 1 repair + 9 signs + 9 scenarios) with strict duplicate protection and Seeded RNG.
- Time-versioned models: `QuestionBankVersion` (`QB_600_2025`) and `ExamProfile` (`B_2025_TRANSITION` active, `B_2027_PLACEHOLDER` locked placeholder).
- Deterministic mastery (`consecutiveCorrect >= 2`) with immediate reset on mistake, and transparent priority review queue.
- Blind-to-critical ExamMode via `ExamModePolicy`.
- Offline-capable PWA with Dexie.js (IndexedDB), session auto-recovery, and backup/restore JSON (`schemaVersion: 1`).

## §C: Constraints
- No AI guessing for critical questions or answers: use exact Phụ lục III list and vector underlines.
- Pure client-side execution on `port: 3000`.
- No "Điểm liệt" badge or visual hints in ExamMode.
- Zero orphan images (every extracted image belongs to a question; every question with hasImage has an image).
- `B_2027_PLACEHOLDER` cannot generate exams until its question bank is officially released.

## §I: Interfaces
- `data/manifest.json`: Full auditable source manifest with embedded blueprint.
- `data/question-banks.json`: Question bank versions.
- `data/questions.json`: 600 question records.
- `data/critical-sets.json`: 60 critical question numbers.
- `data/exam-profiles.json`: Exam configuration blueprints.
- `public/images/`: Extracted sign and scenario images.
- `reports/extraction-report.json`: Audit log of extraction.
- `tests/fixtures/`: 6 golden snapshot test cases.

## §V: Invariants
- `len(questions) == 600`
- `len(criticalQuestions) == 60`
- `criticalQuestions == OFFICIAL_CRITICAL_SET_2025`
- `all(q.category == EXPECTED_CATEGORY[q.chapterId] for q in questions)`
- `all(q.isCritical == (q.criticalSetId === 'CRITICAL_60_2025') for q in questions)`
- Cross-consistency: `set(q.questionNumber for q in questions if q.criticalSetId === 'CRITICAL_60_2025') == set(criticalSet.questionNumbers)`
- Each question has exactly 1 verified correct answer.
- Each generated exam for `B_2025_TRANSITION` has exactly 30 questions, exactly 1 critical question, 0 duplicates (`len(set(ids)) == 30`).
- `criticalQuestionId NOT IN rulesQuestionIds`.
- 18 fixed training exams (`B-TRAIN-001` .. `B-TRAIN-018`) generated deterministically from seeds `10001` .. `10018`.
- Exam result: `passed = score >= 27 && !hasCriticalMistake`.
- Auto-submit when timer reaches 00:00.

## §T: Tasks
| ID | Description | Status |
|:---|:---|:---:|
| §T.0 | Khởi tạo cấu trúc Knowns & đặc tả versioning CV 2262 / TT 108 / Manifest v4.1 | DONE |
| §T.1 | Trích xuất dữ liệu 600 câu hỏi và 318 hình ảnh từ PDF & sinh extraction report | DONE |
| §T.2 | Xây dựng bộ kiểm định QA dữ liệu (600 câu, 60 điểm liệt, mapping chapter, 0 orphan ảnh) & golden fixtures | DONE |
| §T.3 | Xây dựng Learning Engine (Dexie, Deterministic Mastery & Reset, Next Best Action) | DONE |
| §T.4 | Xây dựng Exam Engine sinh đề 30 câu theo Blueprint, chống duplicate, Seeded RNG & chấm 2 điều kiện (1.000 đề PASS) | DONE |
| §T.5 | Xây dựng giao diện Web App Mobile-First (Dashboard, Chương, Luyện tập, Thi thử, 18 Đề, Tra cứu) | DONE |
| §T.6 | Cấu hình PWA & Offline Storage (Dexie, Session Recovery, Backup/Restore JSON schema v1, SW) | DONE |
| §T.7 | Kiểm thử toàn diện & Build verification (npm run build & browser subagent E2E PASS) | DONE |
