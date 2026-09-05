with open("index.html", "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if 'id="view-' in line:
            print(f"Line {i+1}: {line.strip()}")
