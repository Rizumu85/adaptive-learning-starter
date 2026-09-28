"""本地预览：只监听 127.0.0.1，只读。

- 书库自身：index.html、books.json、assets/、covers/
- /readers/<id>/...：映射到 preview.local.json 里登记的书籍项目目录，
  只开放 local-reading/ 与 assets/，不提供 PDF、JSON、脚本和字体。
- /readers/<id>/ 或 /readers/<id>/index.html 跳回书库里这本书的目录。

用法：python tools/preview.py [端口]
"""

import http.server
import json
import mimetypes
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "preview.local.json"

LIBRARY_FILES = {"index.html", "books.json", "robots.txt"}
LIBRARY_DIRS = ("assets/", "covers/")
READER_DIRS = ("local-reading/", "assets/")
BLOCKED_SUFFIXES = {
    ".pdf", ".json", ".py", ".pyc", ".md", ".mjs", ".ps1", ".sh",
    ".ttf", ".otf", ".woff", ".woff2", ".ttc", ".gz", ".zip", ".tar",
}

mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("text/javascript", ".js")


def load_readers():
    if not CONFIG.exists():
        return {}
    data = json.loads(CONFIG.read_text(encoding="utf-8"))
    return {key: Path(value).resolve() for key, value in data.get("readers", {}).items()}


def inside(base: Path, rel: str, allowed_dirs=()):
    """解析后的真实路径必须仍在允许的目录里，挡住 ../ 之类的绕行。"""
    target = (base / rel).resolve()
    roots = [(base / d).resolve() for d in allowed_dirs] or [base]
    ok = any(target.is_relative_to(root) for root in roots)
    return target if ok and target.is_file() else None


class Handler(http.server.SimpleHTTPRequestHandler):
    readers = {}

    def do_POST(self):
        self.send_error(405)

    do_PUT = do_DELETE = do_PATCH = do_POST

    def send_head(self):
        path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
        rel = path.lstrip("/")
        if rel == "":
            rel = "index.html"

        if rel.startswith("readers/"):
            parts = rel.split("/", 2)
            book_id = parts[1] if len(parts) > 1 else ""
            rest = parts[2] if len(parts) > 2 else ""
            if book_id in self.readers and rest in ("", "index.html"):
                self.send_response(302)
                self.send_header("Location", f"/#/book/{urllib.parse.quote(book_id)}")
                self.end_headers()
                return None
            base = self.readers.get(book_id)
            target = inside(base, rest, READER_DIRS) if base else None
        elif rel in LIBRARY_FILES:
            target = inside(ROOT, rel)
        else:
            target = inside(ROOT, rel, LIBRARY_DIRS)

        if target is None or target.suffix.lower() in BLOCKED_SUFFIXES and target != ROOT / "books.json":
            self.send_error(404)
            return None

        ctype = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype == "text/javascript":
            ctype += "; charset=utf-8"
        f = open(target, "rb")
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(target.stat().st_size))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Robots-Tag", "noindex, nofollow")
        self.end_headers()
        return f

    def log_message(self, fmt, *args):
        sys.stderr.write("%s\n" % (fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8421
    Handler.readers = load_readers()
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"书库预览：http://127.0.0.1:{port}/")
    for key, value in Handler.readers.items():
        print(f"  /readers/{key}/ -> {value}")
    server.serve_forever()


if __name__ == "__main__":
    main()
