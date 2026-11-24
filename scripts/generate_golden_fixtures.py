import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.makedirs("tests/fixtures", exist_ok=True)

with open("data/questions.json", "r", encoding="utf-8") as f:
    questions = json.load(f)

q_by_num = {q["questionNumber"]: q for q in questions}

target_nums = [1, 19, 206, 301, 486, 600]

for num in target_nums:
    q = q_by_num[num]
    filename = f"tests/fixtures/question-{num:03d}.json"
    with open(filename, "w", encoding="utf-8") as out:
        json.dump(q, out, ensure_ascii=False, indent=2)
    print(f"✓ Saved golden fixture: {filename}")

print("\nĐã tạo thành công 6 golden fixtures!")
