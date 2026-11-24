# SPEC: tdytools-gplx

## §G: Goal
Build mobile-first PWA Web App for learning and simulating the Vietnam GPLX driving theory test (Focus: Class B):
- Separate Question Bank Sources (`600-cau-hoi-sat-hach.pdf` & CV 2262/CSGT-P5) from Regulatory Sources (CV 2262 & Thông tư 108/2026/TT-BCA).
- Single Source of Truth Manifest: `data/manifest.json` with embedded blueprint, critical set, and question bank metadata.
- Extract and validate all 600 questions, 318 images, official 2025 6-chapter boundaries (`1–180`, `181–205`, `206–263`, `264–300`, `301–485`, `486–600`), and underlined correct answers.
- Lock 60 critical questions from Appendix III of CV 2262/CSGT-P5 (`CRITICAL_60_2025`).
- Generate standard 30-question exam according to official Class B Blueprint (1 critical + 8 rules + 1 culture + 1 driving tech + 1 repair + 9 signs + 9 scenarios) with strict duplicate protection and Seeded RNG.
- Time-versioned models: `QuestionBankVersion` (`QB_600_2025`) and `ExamProfile` (`B_2025_TRANSITION` active, `B_2027_PLACEHOLDER` locked placeholder).
- Deterministic mastery (`consecutiveCorrect >= 2`) with immediate reset on mistake, and unified dynamic review queue.
- Blind-to-critical ExamMode via `ExamModePolicy`.
- Offline-capable PWA with Dexie.js (IndexedDB), session auto-recovery, Cram 120 accelerator workflow, and backup/restore JSON (`schemaVersion: 2`, backward-compatible with `v1`).

## §C: Constraints
- No AI guessing for critical questions, answers, or explanations: use exact Phụ lục III list, vector underlines, and truthful source page citations.
- Pure client-side execution on `port: 3000`.
- No "Điểm liệt" badge or visual hints in ExamMode.
- Zero orphan images (every extracted image belongs to a question; 100% of sign and scenario questions have an image).
- `B_2027_PLACEHOLDER` cannot generate exams until its question bank is officially released.

## §I: Interfaces
- `data/manifest.json`: Single source of truth manifest (documents, questionBanks, criticalSets, examProfiles).
- `data/chapters.json`: Official 6 chapters (CV 2262/CSGT-P5).
- `data/questions.json` & `data/questions.csv` (UTF-8 BOM): 600 question records.
- `public/images/`: 318 extracted sign, scenario, and diagram images.
- `public/icon.svg`, `public/manifest.webmanifest`, `public/sw.js`: Offline-first PWA shell (`tdytools-gplx-v3`).
- `scripts/`: Core reproducible pipeline (`extract_questions.py`, `validate_dataset.py`, `generate_golden_fixtures.py`, `test_exam_generator.py`).
- `tests/fixtures/`: 6 golden snapshot test cases.

## §V: Invariants
- `len(questions) == 600`
- `len(criticalQuestions) == 60` (`CRITICAL_60_2025`)
- Official chapter ranges: `Ch1: 1..180`, `Ch2: 181..205`, `Ch3: 206..263`, `Ch4: 264..300`, `Ch5: 301..485`, `Ch6: 486..600`.
- `all(q.isCritical == (q.criticalSetId === 'CRITICAL_60_2025') for q in questions)`
- Cross-consistency: `set(q.questionNumber for q in questions if q.criticalSetId === 'CRITICAL_60_2025') == set(manifest.criticalSets[0].questionNumbers)`
- Each question has exactly 1 verified correct answer and zero leaked PDF chapter headers.
- Each generated exam for `B_2025_TRANSITION` has exactly 30 questions, exactly 1 critical question, 0 duplicates (`len(set(ids)) == 30`), `criticalQuestionId NOT IN rulesQuestionIds`.
- 18 fixed training exams (`B-TRAIN-001` .. `B-TRAIN-018`) generated deterministically from seeds `10001` .. `10018`.
- Exam result: `passed = score >= 27 && !hasCriticalMistake`.
- Auto-submit when timer reaches 00:00.
