"""Shared reader chrome: the top bar (书架 / 书名 · book tools · 本章目录) and the chapter footer.

This module is the only place the chrome markup is defined. Copy it into a book project
(e.g. tools/reader_chrome.py) next to a config such as tools/reader-chrome.json.

Two ways to use it:

* From a Python page generator, which knows its own section list and tools:
      cfg = reader_chrome.load(ROOT / 'tools/reader-chrome.json')
      page = reader_chrome.decorate(page, cfg, 'chapter-01.html', toc=links, tools=markup, credits=text)
      contents = reader_chrome.decorate_directory(contents, cfg)
* As a post-build step over pages already on disk:
      python reader_chrome.py tools/reader-chrome.json
  Section links come from a previous run, from a "legacy" adapter that removes the book's
  earlier navigation, or from each <section id> and its first <h2>.

Pages carry chrome between <!--rc:...--> markers, so every run replaces it. Only same-page
section links (#...) belong in 本章目录; moving between chapters is the footer's job.
Links between pages are computed from each page's published "url", so a deployment layout
may differ from the project layout.
"""
import json
import posixpath
import re
import sys
from html import escape
from pathlib import Path

# Lucide chevron-down (ISC license).
CHEVRON = ('<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
           'stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')
# 每本书的标签页图标：一本书（书架首页用三本书的书架图标，两者不混用）。
BOOK_ICON = ('<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E'
             '%3Crect x=%276%27 y=%273%27 width=%2721%27 height=%2726%27 rx=%272%27 fill=%27%23147d8f%27/%3E'
             '%3Cpath d=%27M11 3v26M15 11h8M15 16h8%27 stroke=%27%23f7f5ef%27 stroke-width=%272%27/%3E%3C/svg%3E">')
ICON = re.compile(r'<link\b[^>]*\brel="(?:shortcut )?icon"[^>]*>')
BAR = re.compile(r'<!--rc:bar-->.*?<!--/rc:bar-->', re.S)
FOOT = re.compile(r'<!--rc:foot-->.*?<!--/rc:foot-->', re.S)


def load(config_path):
    config_path = Path(config_path).resolve()
    cfg = json.loads(config_path.read_text(encoding='utf-8'))
    cfg['_root'] = (config_path.parent / cfg.get('root', '.')).resolve()
    return cfg


def rel(from_url, to_url):
    """Relative href between two published page urls."""
    if re.match(r'^[a-z]+:|^/', to_url):
        return to_url
    target = posixpath.relpath(to_url, posixpath.dirname(from_url) or '.')
    return target + '/' if to_url.endswith('/') and not target.endswith('/') else target


def section_links(fragment):
    links = re.findall(r'<a\b[^>]*href="(#[^"]+)"[^>]*>(.*?)</a>', fragment, re.S)
    return ''.join(f'<a href="{h}">{t}</a>' for h, t in links)


def sections_from(s):
    """本章目录取自正文：<main> 里每个带 id 的 <section> 及其第一个 <h2>。"""
    main = re.search(r'<main\b.*?</main>', s, re.S)
    found = re.findall(r'<section\b[^>]*\bid="([^"]+)"[^>]*>\s*<h2\b[^>]*>(.*?)</h2>', main.group(0) if main else '', re.S)
    return ''.join(f'<a href="#{i}">{t}</a>' for i, t in found)


# ---------- legacy adapters: remove a book's earlier navigation, return (page, toc) ----------

def legacy_stonehouse(s):
    toc = ''
    m = re.search(r'<div class="topbar">.*?<nav aria-label="阅读目录">(.*?)</nav></div></div>', s, re.S)
    if m:
        toc = section_links(m.group(1))
        s = s.replace(m.group(0), '')
    return re.sub(r'<footer>.*?</footer>', '', s, count=1, flags=re.S), toc


def legacy_araki(s):
    toc = ''
    m = re.search(r'<aside>.*?</aside>', s, re.S)
    if m:
        inner = re.search(r'<div>(.*?)</div></details>', m.group(0), re.S)
        toc = section_links(inner.group(1)) if inner else ''
        s = s.replace(m.group(0), '')
    s = re.sub(r'(<header>)<a href="index\.html">[^<]*</a>', r'\1', s, count=1)
    s = re.sub(r'<script defer src="[^"]*reading\.js"></script>', '', s)
    return re.sub(r'<footer>.*?</footer>', '', s, count=1, flags=re.S), toc


LEGACY = {'stonehouse': legacy_stonehouse, 'araki': legacy_araki}


# ---------- markup ----------

def style(cfg, width=None):
    values = dict(cfg.get('vars', {}))
    if width or cfg.get('width'):
        values['--rc-width'] = width or cfg['width']
    return f' style="{";".join(f"{k}:{v}" for k, v in values.items())}"' if values else ''


def chapter_id(url):
    """Stable chapter id from its published path: ch05/ -> ch05, making2.html -> making2, index.html -> index."""
    path = re.sub(r'[?#].*$', '', url)
    path = re.sub(r'(^|/)index\.html$', r'', path).rstrip('/')
    name = re.sub(r'\.html$', '', path).split('/')[-1].lower()
    return re.sub(r'[^a-z0-9-]+', '-', name).strip('-') or 'index'


def catalog(cfg, page_url, current=None):
    """The book's published chapters for the "新" marks; only when the config names the book's shelf id."""
    if not cfg.get('id'):
        return ''
    data = {'book': cfg['id'], 'chapters': [
        {'id': chapter_id(c['url']), 'url': rel(page_url, c['url']), 'title': c['title']}
        for c in cfg['chapters'] if c.get('status') != 'pending']}
    if current:
        data['current'] = chapter_id(current['url'])
    text = json.dumps(data, ensure_ascii=False).replace('</', '<\/')
    return f'<script type="application/json" id="rc-chapters">{text}</script>'


def bar(cfg, page_url, toc='', tools='', here=False, width=None, extra=''):
    book = escape(cfg['book'])
    title = (f'<span class="rc-here" aria-current="page">{book}</span>' if here
             else f'<a class="rc-book" href="{rel(page_url, cfg["directory"]["url"])}">{book}</a>')
    right = ''
    if toc:
        book_tools = f'<div class="rc-book-tools">{tools}</div>' if tools else ''
        right = (f'<div class="rc-tools">{book_tools}<details class="rc-toc"><summary>本章目录{CHEVRON}</summary>'
                 f'<nav class="rc-toc-panel" aria-label="本章目录">{toc}</nav></details></div>')
    return (f'<!--rc:bar--><div class="rc-bar" role="banner"{style(cfg, width)}><div class="rc-bar-inner">'
            f'<nav class="rc-trail" aria-label="书籍导航"><a class="rc-shelf" href="{cfg.get("shelf", "/")}">书架</a>'
            f'<span class="rc-sep" aria-hidden="true">/</span>{title}</nav>{right}</div></div>{extra}<!--/rc:bar-->')


def foot(cfg, page_url, prev, nxt, credits=''):
    def cell(cls, chapter, label):
        if not chapter:
            return '<span class="rc-none"></span>'
        return (f'<a class="{cls}" href="{rel(page_url, chapter["url"])}"><small>{label}</small>'
                f'<span>{escape(chapter["title"])}</span></a>')
    credit = f'<p class="rc-credit">{credits}</p>' if credits else ''
    return (f'<!--rc:foot--><footer class="rc-foot"{style(cfg)}><nav class="rc-pager" aria-label="章节">'
            f'{cell("rc-prev", prev, "← 上一章")}{cell("rc-next", nxt, "下一章 →")}</nav>'
            f'{credit}</footer><!--/rc:foot-->')


def with_assets(s, cfg, page):
    href = rel(page['url'], cfg['assets']).rstrip('/') + '/'
    s = re.sub(r'<link rel="stylesheet" href="[^"]*reader-chrome\.css">', '', s)
    s = re.sub(r'<script defer src="[^"]*reader-chrome\.js"></script>', '', s)
    s = ICON.sub('', s)
    s = s.replace('</head>', f'{BOOK_ICON}<link rel="stylesheet" href="{href}reader-chrome.css"></head>', 1)
    return s.replace('</body>', f'<script defer src="{href}reader-chrome.js"></script></body>', 1)


def insert_bar(s, markup):
    body = re.search(r'<body\b[^>]*>', s)
    skip = re.match(r'\s*<a class="skip"[^>]*>.*?</a>', s[body.end():], re.S)
    at = body.end() + (skip.end() if skip else 0)
    return s[:at] + markup + s[at:]


def insert_foot(s, markup):
    # 放在正文（及包住它的布局容器）之后、页尾脚本之前
    end = s.rfind('</main>')
    layout = re.match(r'</main>\s*</div>', s[end:])
    at = end + (layout.end() if layout else len('</main>'))
    return s[:at] + markup + s[at:]


# ---------- pages ----------

def page_entry(cfg, file):
    return next(c for c in cfg['chapters'] if c['file'] == file)


def neighbours(cfg, page):
    # 整理中的章节也用同一套控件，但别的章节不链到它
    order = [c for c in cfg['chapters'] if c.get('status') != 'pending' or c is page]
    j = order.index(page)
    return (order[j - 1] if j > 0 else None), (order[j + 1] if j + 1 < len(order) else None)


def decorate(s, cfg, file, toc='', tools='', credits=''):
    """Add the bar and footer to one generated chapter page."""
    page = page_entry(cfg, file)
    prev, nxt = neighbours(cfg, page)
    s = FOOT.sub('', BAR.sub('', s))
    s = insert_bar(s, bar(cfg, page['url'], toc or sections_from(s), tools, extra=catalog(cfg, page['url'], page)))
    s = insert_foot(s, foot(cfg, page['url'], prev, nxt, credits))
    return with_assets(s, cfg, page)


def decorate_directory(s, cfg):
    """Add the bar to the book's contents page; the book name is the current page."""
    directory = cfg['directory']
    s = insert_bar(BAR.sub('', s), bar(cfg, directory['url'], here=True, width=directory.get('width'),
                                     extra=catalog(cfg, directory['url'])))
    return with_assets(s, cfg, directory)


def apply(cfg):
    """Post-build step: decorate pages already on disk, keeping their section links and tools."""
    root = cfg['_root']
    legacy = LEGACY.get(cfg.get('legacy'))
    for page in cfg['chapters']:
        path = root / page['file']
        if not path.is_file():
            continue
        s = path.read_text(encoding='utf-8')
        old = BAR.search(s)
        toc = tools = credits = ''
        if old:
            panel = re.search(r'<nav class="rc-toc-panel"[^>]*>(.*?)</nav></details>', old.group(0), re.S)
            toc = section_links(panel.group(1)) if panel else ''
            kept = re.search(r'<div class="rc-book-tools">(.*)</div><details', old.group(0), re.S)
            tools = kept.group(1) if kept else ''
            credit = re.search(r'<p class="rc-credit">(.*?)</p>', s, re.S)
            credits = credit.group(1) if credit else ''
        elif legacy:
            s, toc = legacy(s)
        path.write_text(decorate(s, cfg, page['file'], toc, tools, credits), encoding='utf-8')
        print('chapter', page['file'])
    path = root / cfg['directory']['file']
    if path.is_file():
        path.write_text(decorate_directory(path.read_text(encoding='utf-8'), cfg), encoding='utf-8')
        print('directory', cfg['directory']['file'])


def run(config_path):
    apply(load(config_path))


if __name__ == '__main__':
    run(sys.argv[1])
