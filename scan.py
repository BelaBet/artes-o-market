import re, os, glob

files = [f for f in glob.glob("src/**/*.tsx", recursive=True) if "/ui/" not in f]
inert = []

for f in sorted(files):
    src = open(f).read()
    lines = src.split("\n")
    # find each <button ...> opening tag (may span lines)
    for m in re.finditer(r"<button\b", src):
        start = m.start()
        # find end of opening tag, accounting for {...} braces
        i = m.end(); depth = 0
        while i < len(src):
            c = src[i]
            if c == "{": depth += 1
            elif c == "}": depth -= 1
            elif c == ">" and depth == 0: break
            i += 1
        tag = src[start:i+1]
        lineno = src[:start].count("\n") + 1
        has_handler = bool(re.search(r"\bon[A-Z]\w*\s*=", tag)) or 'type="submit"' in tag
        if not has_handler:
            # capture label: text until </button>
            end = src.find("</button>", i)
            label = re.sub(r"<[^>]+>", "", src[i+1:end]).strip()
            label = re.sub(r"\s+", " ", label)[:60]
            inert.append((f, lineno, label or "(sem texto)"))

print(f"BOTOES SEM HANDLER: {len(inert)}\n")
for f, l, lab in inert:
    print(f"{f}:{l}  →  {lab}")
