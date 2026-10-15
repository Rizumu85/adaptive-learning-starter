"""检查 books.json：必填字段、ID 唯一、资源文件存在；
有 preview.local.json 时，再检查每个章节在本机能否找到。

用法：python tools/check_books.py
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# edition 可选；目录要么用 directoryUrl（书自己的目录页），要么用 reader + chapters；category 在分排时才必填（见下）
REQUIRED = ("id", "title", "author", "size")


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
        if not book.get("directoryUrl") and not (book.get("reader") and book.get("chapters")):
            errors.append(f"{name}: 需要 directoryUrl，或者 reader 加 chapters")
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", book.get("id", "")):
            errors.append(f"{name}: id 只用小写字母、数字和连字符")
        if book.get("id") in seen:
            errors.append(f"{name}: id 重复")
        seen.add(book.get("id"))

        for label, src in (("cover.src", (book.get("cover") or {}).get("src")),
                           ("spine.art", (book.get("spine") or {}).get("art"))):
            if src and not (ROOT / src).is_file():
                errors.append(f"{name}: {label} 文件不存在：{src}")

        # 多册系列：至少两册，最前那册用书本身的封面；第二册起是 covers/<id>-v2.webp …
        volumes = book.get("volumes")
        if volumes is not None:
            if not isinstance(volumes, list) or len(volumes) < 2 or len(volumes) > 9:
                errors.append(f"{name}: volumes 要列 2–9 册")
            else:
                for n, volume in enumerate(volumes, start=1):
                    expected = (book.get("cover") or {}).get("src") if n == 1 else f"covers/{book.get('id')}-v{n}.webp"
                    if volume.get("cover") != expected:
                        errors.append(f"{name}: 第 {n} 册封面应为 {expected}")
                    elif not (ROOT / volume["cover"]).is_file():
                        errors.append(f"{name}: 第 {n} 册封面文件不存在：{volume['cover']}")
                    ratio = volume.get("ratio")
                    if not isinstance(ratio, (int, float)) or not 0.3 <= ratio <= 3:
                        errors.append(f"{name}: 第 {n} 册缺少合理的 ratio（封面宽÷高）")
                    if n > 1 and not volume.get("title"):
                        errors.append(f"{name}: 第 {n} 册缺少 title")

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

    # 书架到 searchFrom 本（默认 12）起按分类分排；只有一本的分类会孤零零占一排
    books = data.get("books", [])
    if len(books) >= (data.get("library") or {}).get("searchFrom", 12):
        counts = {}
        for book in books:
            if not book.get("category"):
                errors.append(f"{book.get('id', '?')}: 书架已按分类分排，缺少 category")
                continue
            counts[book.get("category")] = counts.get(book.get("category"), 0) + 1
        for category, count in counts.items():
            if count < 2:
                errors.append(f"分类“{category}”只有一本书：并入最接近的分类")

    if errors:
        print("\n".join(errors))
        sys.exit(1)
    print(f"books.json 通过检查：{len(seen)} 本书")


if __name__ == "__main__":
    main()
