import fitz
import re
import os
import sys
import json
import hashlib
import csv
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding='utf-8')
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

pdf_path = "assets/600-cau-hoi-sat-hach.pdf"
doc = fitz.open(pdf_path)

output_img_dir = "public/images"
os.makedirs(output_img_dir, exist_ok=True)
os.makedirs("data", exist_ok=True)
os.makedirs("reports", exist_ok=True)

CRITICAL_60_2025 = {
    19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
    30, 32, 34, 35, 47, 48, 52, 53, 55, 58,
    63, 64, 65, 66, 67, 68, 70, 71, 72, 73,
    74, 85, 86, 87, 88, 89, 90, 91, 92, 93,
    97, 98, 102, 117, 163, 165, 167, 197, 198, 206,
    215, 226, 234, 245, 246, 252, 253, 254, 255, 260
}

# Official 2025 CSGT 600-Question Chapter Structure (Page 3 & CV 2262/CSGT-P5 Section I.1)
CHAPTERS = [
    {"id": 1, "name": "Quy định chung và quy tắc giao thông đường bộ", "category": "rules", "from": 1, "to": 180},
    {"id": 2, "name": "Văn hóa giao thông, đạo đức người lái xe, kỹ năng phòng cháy, chữa cháy và cứu hộ, cứu nạn", "category": "culture", "from": 181, "to": 205},
    {"id": 3, "name": "Kỹ thuật lái xe", "category": "drivingTechnique", "from": 206, "to": 263},
    {"id": 4, "name": "Cấu tạo và sửa chữa", "category": "structureRepair", "from": 264, "to": 300},
    {"id": 5, "name": "Báo hiệu đường bộ", "category": "signs", "from": 301, "to": 485},
    {"id": 6, "name": "Giải thế sa hình và kỹ năng xử lý tình huống giao thông", "category": "scenario", "from": 486, "to": 600}
]


def get_chapter(qnum):
    for ch in CHAPTERS:
        if ch["from"] <= qnum <= ch["to"]:
            return ch
    raise ValueError(f"Unknown chapter for question {qnum}")


def normalize_vietnamese_text(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    # Fix PDF line-break split inside word on Page 5 Question 3 Option 2 ("đường b\nộ")
    cleaned = cleaned.replace("đường b ộ", "đường bộ")
    return cleaned


# Step 1: Collect vector underlines from question pages (pages 5..188)
print("Step 1: Quét vector gạch chân đáp án đúng...")
page_drawings = {}
for pno in range(4, len(doc)):
    page = doc[pno]
    drawings = page.get_drawings()
    underlines = []
    for d in drawings:
        fill = d.get("fill")
        rect = d["rect"]
        if fill is not None and len(fill) >= 3 and max(fill[:3]) < 0.3 and rect.height <= 2.0:
            underlines.append(rect)
    page_drawings[pno] = underlines

# Step 2: Collect all text lines with bounding boxes
print("Step 2: Quét toàn bộ dòng văn bản...")
all_lines = []
for pno in range(4, len(doc)):
    page = doc[pno]
    blocks = page.get_text("dict")["blocks"]
    for b in blocks:
        if "lines" in b:
            for l in b["lines"]:
                line_text = "".join(span["text"] for span in l["spans"]).strip()
                if line_text:
                    all_lines.append({
                        "page": pno,
                        "bbox": l["bbox"],
                        "text": line_text
                    })

page_words = {}
for pno in range(4, len(doc)):
    page_words[pno] = doc[pno].get_text("words")

q_pattern = re.compile(r'^Câu\s+(\d+)[\.\:](.*)', re.IGNORECASE)
opt_pattern = re.compile(r'^([1-4])[\.\:](.*)')
chapter_heading_pattern = re.compile(r'^CHƯƠNG\s+[IVXLC]+[\.\:]', re.IGNORECASE)
pure_image_caption_nums = re.compile(r'^\d+(?:\s+\d+)*$')


def parse_line_options(item, page_words):
    text = item["text"]
    pno = item["page"]
    bbox = item["bbox"]

    matches = list(re.finditer(r'(?:^|\s{4,})([1-4])[\.\:]\s+', text))
    if len(matches) <= 1:
        om = opt_pattern.match(text)
        if om:
            opt_id = int(om.group(1))
            rem_opt = om.group(2).strip()
            return [(opt_id, rem_opt, item)]
        return None

    results = []
    line_words = [w for w in page_words.get(pno, []) if abs((w[1] + w[3]) / 2.0 - (bbox[1] + bbox[3]) / 2.0) <= 5.0]
    line_words.sort(key=lambda w: w[0])

    for i, m in enumerate(matches):
        opt_id = int(m.group(1))
        content_start = m.end()
        content_end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        sub_text = text[content_start:content_end].strip()

        num_pos = m.start(1)
        x0_approx = bbox[0] + (num_pos / len(text)) * (bbox[2] - bbox[0])
        x1_approx = bbox[0] + (content_end / len(text)) * (bbox[2] - bbox[0])

        matched_w = [w for w in line_words if w[0] >= x0_approx - 15 and w[2] <= x1_approx + 15]
        if matched_w:
            sub_bbox = (matched_w[0][0], bbox[1], matched_w[-1][2], bbox[3])
        else:
            sub_bbox = (x0_approx, bbox[1], x1_approx, bbox[3])

        results.append((opt_id, sub_text, {"page": pno, "bbox": sub_bbox, "text": sub_text}))

    return results


# Step 3: Group lines into questions (ignoring multi-line chapter banners & page numbers)
print("Step 3: Nhóm nội dung câu hỏi và các phương án trả lời...")
parsed_questions = {}
current_q = None
current_opt = None

for item in all_lines:
    t = item["text"]

    # When hitting a chapter header (e.g. CHƯƠNG II...), close current question until next Câu X.
    if chapter_heading_pattern.match(t):
        current_q = None
        current_opt = None
        continue

    qm = q_pattern.match(t)
    if qm:
        qnum = int(qm.group(1))
        current_q = qnum
        current_opt = None
        rem_title = qm.group(2).strip()
        parsed_questions[current_q] = {
            "qnum": qnum,
            "page": item["page"] + 1,
            "title_parts": [rem_title] if rem_title else [],
            "options": {},
            "option_lines": {}
        }
        continue

    if current_q is not None:
        # Ignore standalone page numbers or multi-sign numeric captions (e.g. "1     2" under Q362)
        if pure_image_caption_nums.match(t):
            continue

        multi_opts = parse_line_options(item, page_words)
        if multi_opts:
            for opt_id, opt_text, opt_item in multi_opts:
                current_opt = opt_id
                if opt_id not in parsed_questions[current_q]["options"]:
                    parsed_questions[current_q]["options"][opt_id] = []
                    parsed_questions[current_q]["option_lines"][opt_id] = []
                if opt_text:
                    parsed_questions[current_q]["options"][opt_id].append(opt_text)
                parsed_questions[current_q]["option_lines"][opt_id].append(opt_item)
        elif current_opt is not None:
            parsed_questions[current_q]["options"][current_opt].append(t)
            parsed_questions[current_q]["option_lines"][current_opt].append(item)
        else:
            parsed_questions[current_q]["title_parts"].append(t)

# Step 4: Map images to questions
print("Step 4: Ánh xạ và trích xuất hình ảnh...")
q_pos_list = []
for pno in range(4, len(doc)):
    page = doc[pno]
    blocks = page.get_text("dict")["blocks"]
    for b in blocks:
        if "lines" in b:
            for l in b["lines"]:
                line_text = "".join(span["text"] for span in l["spans"]).strip()
                qm = q_pattern.match(line_text)
                if qm:
                    qnum = int(qm.group(1))
                    q_pos_list.append({"qnum": qnum, "page": pno, "y0": l["bbox"][1]})

q_pos_list.sort(key=lambda x: (x["page"], x["y0"]))

q_to_images = {}
for pno in range(4, len(doc)):
    page = doc[pno]
    imgs = page.get_image_info(xrefs=True)
    if not imgs:
        continue
    qs_on_page = [q for q in q_pos_list if q["page"] == pno]
    for img in imgs:
        iy_mid = (img["bbox"][1] + img["bbox"][3]) / 2.0
        assigned = None
        if qs_on_page:
            if iy_mid < qs_on_page[0]["y0"]:
                first_idx = q_pos_list.index(qs_on_page[0])
                if first_idx > 0:
                    assigned = q_pos_list[first_idx - 1]["qnum"]
            else:
                for q in qs_on_page:
                    if q["y0"] <= iy_mid:
                        assigned = q["qnum"]
                    else:
                        break
        else:
            prev_qs = [q for q in q_pos_list if q["page"] < pno]
            if prev_qs:
                assigned = prev_qs[-1]["qnum"]
        if assigned:
            q_to_images.setdefault(assigned, []).append((pno, img))

saved_images_count = 0
for qnum, img_entries in q_to_images.items():
    img_filename = f"q-{qnum}.png"
    img_path = os.path.join(output_img_dir, img_filename)

    if not os.path.exists(img_path):
        if qnum == 362:
            pno = img_entries[0][0]
            page = doc[pno]
            clip_rect = fitz.Rect(90, 630, 295, 740)
            pix = page.get_pixmap(clip=clip_rect, dpi=150)
            pix.save(img_path)
        else:
            pno, img_info = img_entries[0]
            xref = img_info["xref"]
            pix = fitz.Pixmap(doc, xref)
            if pix.n >= 5:
                pix = fitz.Pixmap(fitz.csRGB, pix)
            pix.save(img_path)
    saved_images_count += 1

print(f"Đã xác nhận {saved_images_count} file ảnh tại {output_img_dir}/")

# Step 5: Build final structured questions
print("Step 5: Xây dựng cấu trúc dữ liệu chuẩn và kiểm tra đáp án đúng...")
final_questions = []
csv_rows = []
errors = []

for qnum in range(1, 601):
    if qnum not in parsed_questions:
        errors.append(f"Câu {qnum}: Không tìm thấy trong nội dung trích xuất")
        continue

    pq = parsed_questions[qnum]
    ch = get_chapter(qnum)
    content = normalize_vietnamese_text(" ".join(pq["title_parts"]))

    options = []
    correct_opts = []
    for opt_id in sorted(pq["options"].keys()):
        opt_text = normalize_vietnamese_text(" ".join(pq["options"][opt_id]))
        is_correct = False
        opt_lines = pq["option_lines"][opt_id]

        for line in opt_lines:
            pno = line["page"]
            l_bbox = line["bbox"]
            underlines = page_drawings.get(pno, [])
            for u in underlines:
                y_dist = abs(u.y0 - l_bbox[3])
                if y_dist <= 3.5:
                    overlap_x = max(0, min(u.x1, l_bbox[2]) - max(u.x0, l_bbox[0]))
                    if overlap_x > 10.0:
                        is_correct = True
                        break
            if is_correct:
                break

        if is_correct:
            correct_opts.append(opt_id)

        options.append({
            "id": opt_id,
            "text": opt_text,
            "isCorrect": is_correct
        })

    if len(correct_opts) != 1:
        errors.append(f"Câu {qnum}: Phát hiện {len(correct_opts)} đáp án đúng: {correct_opts}")

    is_critical = qnum in CRITICAL_60_2025
    critical_set_id = "CRITICAL_60_2025" if is_critical else None

    img_obj = None
    if qnum in q_to_images:
        img_type = "sign" if ch["category"] == "signs" else ("scenario" if ch["category"] == "scenario" else "diagram")
        img_obj = {
            "src": f"q-{qnum}.png",
            "type": img_type
        }

    hash_payload = f"{qnum}:{content}:" + "|".join(f"{o['id']}:{o['text']}:{o['isCorrect']}" for o in options)
    content_hash = hashlib.sha256(hash_payload.encode('utf-8')).hexdigest()

    q_dict = {
        "id": f"q-{qnum}",
        "questionNumber": qnum,
        "chapterId": ch["id"],
        "chapterName": ch["name"],
        "category": ch["category"],
        "content": content,
        "contentHash": content_hash,
        "options": options,
        "isCritical": is_critical,
        "source": {
            "document": "DOC_600_PDF_2025",
            "page": pq["page"]
        }
    }
    if critical_set_id:
        q_dict["criticalSetId"] = critical_set_id
    if img_obj:
        q_dict["image"] = img_obj

    final_questions.append(q_dict)

    correct_opt_id = correct_opts[0] if correct_opts else 0
    opts_dict = {o["id"]: o["text"] for o in options}
    csv_rows.append({
        "id": f"q-{qnum}",
        "questionNumber": qnum,
        "chapterId": ch["id"],
        "chapterName": ch["name"],
        "category": ch["category"],
        "content": content,
        "option1": opts_dict.get(1, ""),
        "option2": opts_dict.get(2, ""),
        "option3": opts_dict.get(3, ""),
        "option4": opts_dict.get(4, ""),
        "correctOption": correct_opt_id,
        "isCritical": "TRUE" if is_critical else "FALSE",
        "criticalSetId": critical_set_id or "",
        "imageSrc": img_obj["src"] if img_obj else "",
        "page": pq["page"],
        "contentHash": content_hash
    })

# Step 6: Save outputs
print("Step 6: Xuất file data/questions.json và data/questions.csv...")
with open("data/questions.json", "w", encoding="utf-8") as f:
    json.dump(final_questions, f, ensure_ascii=False, indent=2)

csv_fields = [
    "id", "questionNumber", "chapterId", "chapterName", "category", "content",
    "option1", "option2", "option3", "option4", "correctOption",
    "isCritical", "criticalSetId", "imageSrc", "page", "contentHash"
]
with open("data/questions.csv", "w", encoding="utf-8-sig", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=csv_fields)
    writer.writeheader()
    writer.writerows(csv_rows)

# Step 7: Generate extraction report
print("Step 7: Sinh extraction-report.json...")
ch_breakdown = {}
for ch in CHAPTERS:
    ch_breakdown[ch["id"]] = {
        "chapterId": ch["id"],
        "name": ch["name"],
        "category": ch["category"],
        "range": f"{ch['from']}-{ch['to']}",
        "totalQuestions": sum(1 for q in final_questions if q["chapterId"] == ch["id"]),
        "criticalQuestions": sum(1 for q in final_questions if q["chapterId"] == ch["id"] and q["isCritical"]),
        "questionsWithImages": sum(1 for q in final_questions if q["chapterId"] == ch["id"] and "image" in q)
    }

report = {
    "reportId": "EXTRACTION_REPORT_600_2025",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "sourcePdf": pdf_path,
    "totalPages": len(doc),
    "totalQuestions": len(final_questions),
    "totalImagesSaved": saved_images_count,
    "criticalQuestions": sum(1 for q in final_questions if q["isCritical"]),
    "criticalSetId": "CRITICAL_60_2025",
    "answerDetection": {
        "success": sum(1 for q in final_questions if sum(1 for o in q["options"] if o["isCorrect"]) == 1),
        "failed": len(errors)
    },
    "errors": errors,
    "chaptersBreakdown": ch_breakdown
}

with open("reports/extraction-report.json", "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

print("\n=== HOÀN TẤT EXTRACTION ===")
print(f"Tổng câu hỏi: {len(final_questions)} / 600")
print(f"Tổng câu điểm liệt: {report['criticalQuestions']} / 60")
print(f"Tổng ảnh đã lưu: {saved_images_count}")
print(f"Lỗi phát sinh: {len(errors)}")
if errors:
    sys.exit(1)
