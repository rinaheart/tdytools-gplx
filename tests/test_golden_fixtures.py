import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("=== KIỂM THỬ SNAPSHOT GOLDEN FIXTURES ===")

with open("data/questions.json", "r", encoding="utf-8") as f:
    questions = json.load(f)

q_by_num = {q["questionNumber"]: q for q in questions}

target_nums = [1, 19, 206, 301, 486, 600]

for num in target_nums:
    fixture_path = f"tests/fixtures/question-{num:03d}.json"
    with open(fixture_path, "r", encoding="utf-8") as f:
        fixture_data = json.load(f)
    
    current_data = q_by_num[num]
    if fixture_data != current_data:
        print(f"FAIL: Câu {num} không khớp với golden fixture {fixture_path}!")
        sys.exit(1)
    print(f"✓ Câu {num:03d} khớp 100% golden fixture snapshot")

print("TẤT CẢ 6 GOLDEN FIXTURES ĐẠT 100% (PASS)")
