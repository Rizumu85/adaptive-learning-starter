"""检查 books.json：必填字段、ID 唯一、资源文件存在；
有 preview.local.json 时，再检查每个章节在本机能否找到。

用法：python tools/check_books.py
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REQUIRED = ("id", "title", "author", "edition", "category", "reader", "size", "chapters")


def main():
    data = json.loads((ROOT / "books.json").read_text(encoding="utf-8"))
    local = ROOT / "preview.local.json"
    readers = json.loads(local.read_text(encoding="utf-8")).get("readers", {}) if local.exists() else {}
    errors, seen = [], set()

    for i, book in enumerate(data.get("books", [])):
        name = book.get("id") or f"第 {i + 1} 条"
        for key in REQUIRED:
            if not book.get(key):
                errors.append(f"{name}: 缺少 {key}")
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", book.get("id", "")):
            errors.append(f"{name}: id 只用小写字母、数字和连字符")
        if book.get("id") in seen:
            errors.append(f"{name}: id 重复")
        seen.add(book.get("id"))

        for label, src in (("cover.src", (book.get("cover") or {}).get("src")),
                           ("spine.art", (book.get("spine") or {}).get("art"))):
            if src and not (ROOT / src).is_file():
                errors.append(f"{name}: {label} 文件不存在：{src}")

        base = readers.get(book.get("id"))
        for chapter in book.get("chapters", []):
            title = chapter.get("title", "?")
            if chapter.get("status") == "pending":
                continue
            href = chapter.get("href", "")
            if not href:
                errors.append(f"{name} / {title}: 缺少 href（未整理的章节写 status: pending）")
            elif base and not re.match(r"^[a-z][a-z0-9+.-]*:", href, re.I):
                if not (Path(base) / href.split("#")[0]).is_file():
                    errors.append(f"{name} / {title}: 本机找不到 {href}")

    if errors:
        print("\n".join(errors))
        sys.exit(1)
    print(f"books.json 通过检查：{len(seen)} 本书")


if __name__ == "__main__":
    main()
