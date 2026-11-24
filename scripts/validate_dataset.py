import json
import os
import sys
import csv
import re

sys.stdout.reconfigure(encoding='utf-8')
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("=== BẮT ĐẦU KIỂM ĐỊNH TẬP DỮ LIỆU (DATASET QA) ===")

with open("data/questions.json", "r", encoding="utf-8") as f:
    questions = json.load(f)

with open("data/manifest.json", "r", encoding="utf-8") as f:
    manifest = json.load(f)

with open("data/chapters.json", "r", encoding="utf-8") as f:
    chapters = json.load(f)

failures = []

# Official CSGT 2025 chapter boundaries (Page 3 PDF & CV 2262/CSGT-P5 Section I.1)
OFFICIAL_CHAPTER_RANGES = {
    1: ("rules", 1, 180),
    2: ("culture", 181, 205),
    3: ("drivingTechnique", 206, 263),
    4: ("structureRepair", 264, 300),
    5: ("signs", 301, 485),
    6: ("scenario", 486, 600),
}

# Invariant 1: Exactly 600 questions
if len(questions) != 600:
    failures.append(f"FAIL Invariant 1: len(questions) = {len(questions)} != 600")
else:
    print("✓ Invariant 1: Đủ 600 câu hỏi (1..600 liên tục)")

# Invariant 2: Question numbers 1..600
qnums = [q["questionNumber"] for q in questions]
if qnums != list(range(1, 601)):
    failures.append("FAIL Invariant 2: questionNumber không liên tục từ 1 đến 600")
else:
    print("✓ Invariant 2: Số thứ tự 1 đến 600 liên tục không sót")

# Invariant 3: Exactly 60 critical questions
critical_in_q = [q["questionNumber"] for q in questions if q.get("isCritical")]
if len(critical_in_q) != 60:
    failures.append(f"FAIL Invariant 3: Có {len(critical_in_q)} câu critical != 60")
else:
    print("✓ Invariant 3: Đúng 60 câu điểm liệt")

# Invariant 4: Cross-consistency with manifest.json (Single Source of Truth)
manifest_crit_set = manifest["criticalSets"][0]["questionNumbers"]
if set(critical_in_q) != set(manifest_crit_set):
    failures.append("FAIL Invariant 4: Danh sách câu điểm liệt trong questions.json không khớp manifest.json")
else:
    print("✓ Invariant 4: Cross-consistency khớp 100% Phụ lục III CV 2262 (60/60 câu)")

# Invariant 5: criticalSetId presence
for q in questions:
    if q["isCritical"] and q.get("criticalSetId") != "CRITICAL_60_2025":
        failures.append(f"FAIL Invariant 5: Câu {q['questionNumber']} isCritical=True nhưng criticalSetId sai")
    if not q["isCritical"] and "criticalSetId" in q:
        failures.append(f"FAIL Invariant 5: Câu {q['questionNumber']} isCritical=False nhưng có criticalSetId")
print("✓ Invariant 5: criticalSetId liên kết chặt chẽ với cờ isCritical")

# Invariant 6: Exactly 1 correct answer per question & clean text (no leaked ALL-CAPS headers)
leaked_caps_re = re.compile(
    r"\b[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ]{2,}"
    r"(?:\s+[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ]{2,})+\b"
)
for q in questions:
    correct_opts = [o for o in q["options"] if o["isCorrect"]]
    if len(correct_opts) != 1:
        failures.append(f"FAIL Invariant 6a: Câu {q['questionNumber']} có {len(correct_opts)} đáp án đúng")
    for txt in [q["content"]] + [o["text"] for o in q["options"]]:
        if leaked_caps_re.search(txt):
            failures.append(f"FAIL Invariant 6b: Câu {q['questionNumber']} rò rỉ tiêu đề in hoa: {txt}")
print("✓ Invariant 6: 100% câu hỏi có đúng 1 đáp án chính xác và không rò rỉ header PDF")

# Invariant 7: Official CSGT 2025 Chapter & Category Boundaries
for ch in chapters:
    exp = OFFICIAL_CHAPTER_RANGES.get(ch["id"])
    if not exp or (ch["category"], ch["fromQuestion"], ch["toQuestion"]) != exp:
        failures.append(f"FAIL Invariant 7a: chapters.json chương {ch['id']} lệch chuẩn CV 2262: {ch}")
    if ch["totalQuestions"] != ch["toQuestion"] - ch["fromQuestion"] + 1:
        failures.append(f"FAIL Invariant 7b: chapters.json chương {ch['id']} sai totalQuestions")

for q in questions:
    qn = q["questionNumber"]
    exp_cat, exp_from, exp_to = OFFICIAL_CHAPTER_RANGES[q["chapterId"]]
    if not (exp_from <= qn <= exp_to) or q["category"] != exp_cat:
        failures.append(f"FAIL Invariant 7c: Câu {qn} sai chương/category ({q['chapterId']}, {q['category']})")
print("✓ Invariant 7: 100% câu hỏi và chapters.json khớp chuẩn bố cục 6 chương CV 2262/CSGT-P5")

# Invariant 8: Zero orphan images & 100% signs/scenarios have images
disk_images = set(os.listdir("public/images"))
referenced_images = set()
for q in questions:
    if "image" in q:
        src = q["image"]["src"]
        referenced_images.add(src)
        if src not in disk_images:
            failures.append(f"FAIL Invariant 8a: Ảnh {src} của câu {q['questionNumber']} không tồn tại trên đĩa")
    elif q["category"] in ("signs", "scenario"):
        failures.append(f"FAIL Invariant 8c: Câu {q['questionNumber']} thuộc {q['category']} nhưng thiếu ảnh")

orphan_images = disk_images - referenced_images
if orphan_images:
    failures.append(f"FAIL Invariant 8b: Phát hiện {len(orphan_images)} ảnh mồ côi: {orphan_images}")
elif manifest["questionBanks"][0]["totalImages"] != len(disk_images):
    failures.append(f"FAIL Invariant 8d: manifest totalImages != {len(disk_images)}")
else:
    print(f"✓ Invariant 8: 0 ảnh mồ côi ({len(disk_images)}/{len(disk_images)} ảnh khớp manifest, 100% câu biển báo & sa hình có ảnh)")

# Invariant 9: CSV UTF-8 with BOM and row match
with open("data/questions.csv", "rb") as f:
    if f.read(3) != b'\xef\xbb\xbf':
        failures.append("FAIL Invariant 9a: data/questions.csv không có UTF-8 BOM")
    else:
        print("✓ Invariant 9a: data/questions.csv có UTF-8 BOM chuẩn")

with open("data/questions.csv", "r", encoding="utf-8-sig") as f:
    csv_rows = list(csv.DictReader(f))
    if len(csv_rows) != 600:
        failures.append(f"FAIL Invariant 9b: CSV có {len(csv_rows)} dòng != 600")
    else:
        print("✓ Invariant 9b: CSV có đúng 600 dòng khớp với JSON")

# Invariant 10: Blueprint slot sums match ExamProfile questionCount
for p in manifest["examProfiles"]:
    if p.get("blueprint"):
        b_sum = sum(slot["questionCount"] for slot in p["blueprint"])
        if b_sum != p["questionCount"]:
            failures.append(f"FAIL Invariant 10: Profile {p['id']} blueprint sum {b_sum} != {p['questionCount']}")
        else:
            print(f"✓ Invariant 10: Profile {p['id']} sum(blueprint) = {b_sum} === {p['questionCount']}")

print("\n=== KẾT QUẢ KIỂM ĐỊNH ===")
if failures:
    print(f"CÓ {len(failures)} LỖI:")
    for err in failures:
        print("  -", err)
    sys.exit(1)
else:
    print("TẤT CẢ INVARIANTS ĐẠT 100% (PASS)")
