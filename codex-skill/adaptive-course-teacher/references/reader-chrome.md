# Book Reader Chrome: Integration Contract

Use when a book-reading site (several chapter pages plus a contents page) needs navigation. The chrome is the operating layer only: a top bar and a chapter footer shared by every book, so readers find the same controls in the same place. Each book keeps its own content layout, typography, illustrations, and contents-page artwork. It is an optional preset: use it when the learner has selected it (see `presets.md`), and keep a project's own navigation when the learner prefers that.

Design principle: paper first, app second. Controls, cards, and the image preview look like print on the book's paper — text, hairlines, accent underlines, faint contact shadows — never app widgets (filled pills, sliding thumbs, switches, checkboxes, native selects, frosted glass, heavy shadows, outlined hover states). Motion may be Apple-like: a critically damped spring (response 0.3 s) that starts from the current position, used sparingly and replaced by short fades under reduced motion. Transitions stay quiet: fade and settle rather than enlarging low-resolution page images into place.

## What Readers Get

Top bar (sticky, one line on every width):

- Left: `书架 / 书名`. 书架 returns to the library; the book name opens this book's contents page. On the contents page itself the book name is plain current-page text, not a link.
- Colour carries hierarchy: the bar is ink (书架 muted, book name and 本章目录 ink); accent marks only where the reader is (the current section in the dropdown) and the footer's chapter links. Do not colour every control accent.
- Right: book-specific tools, if any (language, furigana, view mode), then `本章目录 ▾`.
- `本章目录` is a dropdown panel listing only this chapter's sections (`#` anchors). Never append previous/next-chapter or "continue" links to it; chapter movement belongs to the footer. It closes on choosing a section, Esc, or a click outside, and marks the section being read with accent text and a 3px accent bar on its left (no fill).
- The bar steps aside while reading: it hides on scrolling down and returns on a small upward scroll, at the top of the page, while the dropdown is open, when the mouse reaches the window's top edge, or when keyboard focus enters it. After a jump from the dropdown it stays briefly so the reader sees where they landed.
- At 740px and below, book-specific tools move into the top of the dropdown panel.
- The book name shortens with an ellipsis when the bar is too narrow for it.
- Touch scrubber (phones and tablets): nothing shows while reading. A fast scroll (almost a screen height within 0.3 s) brings up faint horizontal section ticks at the right edge, set a little in from the edge so they do not fight the system back gesture, with the reading position shown by a small paper index tab (hairline border, two short grip lines) and a paper tag naming the current section; horizontal marks keep it from looking like a second scrollbar, and the tab reads as something to hold. It fades about a second after scrolling stops, stays hidden on short pages and while 本章目录 is open, and ignores touches during its first quarter second so a normal swipe cannot grab it. Holding the tab and dragging jumps section by section to each heading, with the tab landing exactly on that section's tick and the tag naming the section; the page never scrolls continuously under the finger.
- Section rail: a column of faint ticks at the right edge of the window that shows the chapter's structure, so the reader can see its shape and find their place at a glance. Sections from 本章目录 are long ticks labelled with their contents names; every other `h2`/`h3` inside `<main>` is a short tick labelled with its heading text (Japanese and furigana removed). Ticks are evenly spaced and capped at 70% of the viewport height (down to about 3px each), with a half-tick gap before each section so the chapter reads as groups. At rest the rail is quiet: heading ticks are barely visible, section ticks faintly so. When there is no hierarchy to show (every tick would be a section, or the page has no 本章目录), all ticks take the quiet heading style with no group gaps; a column of equally dark long ticks reads as a heavy ruler, not as structure. Contents pages have no rail or scrubber: the chapter list already is the overview. On hover the whole rail brightens, ticks near the pointer lengthen like a dock (a magnification that also makes dense ticks easy to hit), the hovered tick turns accent and shows its label on a small paper tag, and clicking jumps there. The position being read is a separate short ink marker that slides between ticks on the spring rather than jumping. There is no separate last-read mark: reopening a page already returns to the previous scroll position, so a dot for it only adds noise. The page does not scroll by itself. It appears whenever the blank margin to the right of the text column is wide enough (about 60px, measured from the actual content rather than a fixed window width) and hides otherwise; touch devices use the scrubber below instead. A heading counts as being read once its top passes the upper quarter of the viewport, which also keeps jump targets (bar clearance plus section margins) correctly marked.

Book tools use only two controls, styled as print rather than app widgets (no filled pills, sliding thumbs, iOS-style switches, checkboxes, native `<select>` menus, or bordered hover states):

- Segmented choice for a few mutually exclusive options, such as a reading language: plain text options; the chosen one is ink with a thin accent underline that draws in, the others are muted.
  `<div class="rc-segmented" id="view" role="radiogroup" aria-label="阅读语言"><button type="button" role="radio" aria-checked="true" data-value="parallel">对照</button><button type="button" role="radio" aria-checked="false" tabindex="-1" data-value="zh">中文</button>…</div>`
- Toggle for one on/off setting, such as furigana: the same text treatment — on is ink with the underline, off is muted — separated from a preceding segmented choice by a hairline so it does not read as another option.
  `<button type="button" class="rc-toggle" id="furigana" role="switch" aria-checked="true">平假名</button>`

`reader-chrome.js` handles clicks and arrow keys and dispatches a bubbling `change` event on the control; state lives in `aria-checked`. The book's own script reads that state, applies it to the page, and may set `aria-disabled="true"` when a setting does not apply. Keyboard focus shows a thin accent ring; mouse clicks do not.

Page changes (library → contents → chapters and back) are quiet and fast: `reader-chrome.css` declares `@view-transition{navigation:auto}`, which needs the same declaration on both pages, so the library declares it too. The old page fades out in 160 ms; the new page fades in while settling 8 px upward on the spring. Reduced motion switches instantly. Smoothness comes mostly from not waiting: `reader-chrome.js` adds speculation rules that prerender a same-site page when the pointer rests on its link (`eagerness: moderate`; image-preview links and in-page anchors excluded), and the library prerenders the centred book's contents page after it has stayed centred for 600 ms. Opening a book lays a translucent paper veil over the shelf as immediate feedback instead of enlarging the cover.

Images above the fold on contents pages (thumbnails, title banners) are built as compressed copies at twice their displayed size, never the full reading or lossless source image. Hosted images carry a content hash (`?v=`) so the server can let browsers keep them.

Footer: `← 上一章 · 下一章 →` with the neighbouring chapter titles (top-aligned, so wrapped titles do not misalign), then any source credits. No back-to-top link: the top bar reappears on any upward scroll. No `本书目录` link in the footer; the top bar's book name covers it. Chapters marked pending are skipped.

References: when the text points at a figure ("如上图所示", "（左图）") or at another passage ("参考第198页", "前文"), and the target may be out of view, link the phrase so the reader never has to scroll away and back.

- Markup: `<a class="rc-ref" href="#figure-or-passage-id">左图</a>`; the target is a `<figure id>` (or an `<img id>`), which previews as a picture, or a passage (`<section id>`, `<p id>`, a page section), which previews as its heading and first lines even if it contains pictures. Cross-page targets (`chapter-01.html#s06`) work too.
- Behaviour (`reader-chrome.js`): mouse hover or keyboard focus shows a paper card beside the phrase — a figure appears smaller with its caption, a passage shows its heading and first lines. On touch, the first tap previews and the second jumps. Clicking the card's picture opens the image preview. Jumping scrolls the target to the middle and highlights it briefly; a `回到原文` chip with a line-drawn return arrow returns to the phrase and disappears once the phrase is back in view. Cross-page previews need the pages to be readable over http(s); on `file://` the link simply navigates.
- Several targets: when one phrase depends on knowledge spread over several places (a passage and a figure, or two figures in different sections), list them all: `<a class="rc-ref" href="#first" data-refs="#first #second">…</a>`. `href` stays the first target so the link still works without JavaScript; `data-refs` lists every target, space-separated, in reading order, and may include cross-page targets. The card shows each target in that order, separated by hairlines, each with its own jump link; the card scrolls when it gets tall. Clicking the phrase itself only opens the card, since there is no single destination.
- Figure actions: when a figure offers something to do with it (fill in a worksheet version of the form, download a blank copy), put those links in an element inside the `<figure>` marked `data-rc-actions`, below the caption. The card repeats them under the picture's caption, so a reader hovering any mention can act without scrolling to the figure. Keep it to one or two short labels with line icons.
- Link density: link a recurring name only where it helps. When the whole section around the figure is about that item, the figure is already in view; link its first mention in each later section instead of every mention.
- Bilingual pages (`body[data-view]`, see `bilingual-reader.md`): the card shows one language. Captions and passages that contain `.source` and `.target` show the translation in the parallel and translation-only views and the original in the original-only view, so a caption pair is not run together into one line.
- Style: accent text with a thin dotted underline, like a margin mark; solid underline on hover. The card has no glass or heavy shadow.
- Key-name marks (`class="rc-ref rc-key"`): use only when a study hint has chosen a few names the learner must learn from a dense passage (see "Filtering Dense Material" in `learning-engine.md`) and the source defines each name in one paragraph that can carry an id. Link the first mention of each chosen name in each later paragraph of that section to its definition; the link shows as a light marker stroke in the accent color instead of the dotted underline, meaning both "one of the few to learn" and "hover for the definition". Mark only the names the hint lists, never lookup-only names, and add no second highlight layer. Skip step-by-step pages where the name recurs in every step, names the whole section is about, and names that mostly occur inside longer names; the hint's own links cover those.
- Standalone use: references also work on pages without the bar and footer, such as a reading lesson or reference sheet. Copy `reader-chrome.css` and `reader-chrome.js` into the project, link them, and mark the phrases; the navigation code does nothing when there is no bar.
- Linking rules: link only when the target is certain. Resolve position words ("左图", "右上图", "（左）") against the figures of the same step or passage by their caption labels, and skip a word when two figures share the position. Resolve page references ("第198页") against the book's page markers. Do not link vague phrases ("后文中", "前面介绍过的内容"). Generators produce these links from data (caption labels, page markers, an explicit reference list) and fail the build when a listed phrase is missing, so edits to the text cannot leave a link pointing at the wrong thing. Multi-target links come only from the explicit list, where a phrase names all of its targets; never merge automatic matches into one link.

When building or reviewing a chapter, look for places where several targets help and add them to the explicit list yourself; the learner does not need to ask for each one. Good candidates:

- A cross-reference ("参考第146页") whose target page has both the text that explains the item and the figure that shows it.
- A phrase that relies on an explanation in one section and a picture in another, or on an idea split across two pages.
- A comparison whose two halves live in different places, such as male and female figures in separate sections.
- A recap sentence that names items taught across several earlier passages or steps.
- A step that says "像之前那样" when the earlier method is spread over two steps or a step and its figure.

For each candidate, read every target and confirm it is what the phrase needs. Put first whatever answers the phrase most directly: the labelled figure for a landmark name, the explanation for a concept. Keep it to two to four targets and use a single target when one place is enough. Do not add multi-target links to vague phrases or to insert teaching the source does not make. When the book's printed page number points to the wrong place, keep the book's text and ask the learner before redirecting the link. The build fails when a listed phrase or target is missing, and a test checks that every `data-refs` target resolves.

Cross-page targets need the other page to be readable; when none of a link's targets can be read (for example a local `file://` page), clicking falls back to following `href`.

New chapters (optional, needs a signed-in private site): when the config has `id` (the book's shelf id), every chapter and contents page embeds the book's published chapters as `<script type="application/json" id="rc-chapters">` inside the bar markers, with ids taken from each chapter's path (`ch05/` becomes `ch05`, `making2.html` becomes `making2`). The site keeps, per signed-in reader, which chapters they have already seen listed on the contents page (`GET`/`PUT /api/seen/<book>` with `{"seen": [...]}`, stored under a hash of the email). On a reader's first visit every existing chapter counts as seen. Afterwards, chapters added since the reader last saw the contents page show a small accent `新` after the title; showing it records them as seen, so a refresh clears it. Chapter pages do not record anything. Add `?preview-new` to a contents page URL to see the mark on the last chapter without writing anything. On `file://` or without the endpoint nothing appears. Generate the contents rows with the chapter title in an element whose class ends in `-title` or `-name` (or as a leaf element whose text is the title) so the mark lands after the title without disturbing the row layout.

Flag this figure (optional, needs a signed-in private site): while a picture is enlarged in the shared image preview, the top bar shows a text button `标记这张` beside the counter. The reader presses it on a picture that needs fixing (a bad crop, leftover paper, a missing translation); it turns accent with a filled flag and reads `已标记`, and pressing again removes the flag. A flagged picture also shows `加说明` to its left: pressing it opens a one-line field under the bar where the reader may say what is wrong; Enter or pressing elsewhere keeps it, Escape drops the edit, and the bar then shows the note itself, cut short when long. The note is optional and goes away with the flag. While the field has focus its keys stay in the field, so typing does not zoom or page the preview. Nothing is marked on the page itself. The site keeps the list per signed-in reader and book: `GET`/`PUT /api/flags/<the book's site folder>` with `{"flags": [{"page", "image", "figure"?, "note"?, "at"}]}`, where `page` and `image` are paths inside the book folder, `figure` is the id of the enclosing `figure` when it has one, `note` is the reader's remark (at most 200 characters), and `at` is the time in milliseconds. The button appears only after the `GET` answers, so pages opened locally or on a site without the endpoint show nothing. When a save fails the button goes back to what the server holds and says so. Add `?preview-flag` to a page URL to see the button without a server; nothing is kept. The list is the worklist for fixing figures: read it before a round of fixes, fix those figures, and clear each flag once its figure is fixed. Style: the same plain text-and-line-icon control as `返回`, muted until pressed; no box, fill or shadow. The note field is the one floating surface, drawn like the reference card (paper, thin line, accent line while typing). After the field closes, focus returns to the preview itself, so no control is left with a focus ring.

Contents page: the same top bar without the dropdown. Chapter rows use number, title, source-page range, and `整理中` for unfinished chapters (not linked). Chapter titles use the book's reading body font; numbers and page ranges use the sans. Colour follows the bar's hierarchy: chapter titles are ink, numbers, page ranges and `整理中` are muted, and the accent is kept for small marks (the `新` mark, a hover underline, keyboard focus, the place the reader is). Do not leave the rows in the default link colour: a contents page whose titles are all accent loses the one colour that should stand out. In a bilingual book the original title under each chapter title is muted too. The title artwork and page composition stay the book's own.

Tab icon: every chapter and contents page carries the same small book icon (a teal book with a spine line and two text lines), and the library's homepage carries a bookshelf icon (three spines). The two are not swapped or mixed, so the browser tab tells the reader whether they are on the shelf or inside a book. `with_assets` in `apply_reader_chrome.py` replaces any icon the page already has with the book icon, so pages decorated by the chrome need nothing extra; a book page built without the chrome should copy `BOOK_ICON` from there.

Control text uses the `UIOption` interface font defined in `reader-chrome.css` (the book-typography preset's MiSans Demibold, looked up locally, falling back to the system sans).

## Files

`<skill>/assets/reader-chrome/`:

- `reader-chrome.css`, `reader-chrome.js`: runtime. Copy both into the book project's asset directory so pages work offline over `file://`. Do not load them from another project or a CDN.
- `apply_reader_chrome.py`: the only place the chrome markup is defined; copy it to the project as `tools/reader_chrome.py`. A Python generator that knows its section list and tools calls `decorate(page, cfg, file, toc, tools, credits)` and `decorate_directory(page, cfg)` after `cfg = load(config)`. Otherwise run it as a post-build step (`python tools/reader_chrome.py tools/reader-chrome.json`), which takes section links from a previous run, a legacy adapter, or each `<section id>` and its first `<h2>`.

Pictures in chapters use the shared image preview (`image-preview.md`): mark each figure link with `data-image-preview`.

Per-book variables go on the bar and footer through the config: `width` sets `--rc-width` to the content column width, and `vars` sets others, such as `--rc-gutter` / `--rc-gutter-narrow` when the book's column margins differ from 24px / 16px. The contents page may set its own `width` under `directory`. Override `--rc-accent`, `--rc-paper`, `--rc-line` in the book's own stylesheet only when its palette differs.

## Config

A JSON file in the book project, for example `tools/reader-chrome.json`:

```json
{
  "root": "../local-reading",
  "book": "示例书",
  "shelf": "/",
  "assets": "../assets/",
  "width": "828px",
  "directory": {"file": "index.html", "url": "index.html"},
  "chapters": [
    {"file": "preface.html", "url": "preface.html", "title": "前言"},
    {"file": "chapter-01.html", "url": "chapter-01.html", "title": "第一章"},
    {"file": "chapter-03.html", "url": "chapter-03.html", "title": "第三章", "status": "pending"}
  ]
}
```

- `file` is on disk relative to `root`; `url` is the published path. Links are computed from `url`, so a deployment layout may differ from the project layout.
- `legacy` names an adapter that removes a book's earlier navigation when the post-build step first runs (the adapters are listed in `LEGACY` in the script); omit it for new books.
- In the post-build step, section links for the dropdown come from a prior run, the legacy adapter, or the page's sections. Only `#` links survive.
- Reruns are idempotent: inserted chrome sits between `<!--rc:bar-->` / `<!--rc:foot-->` markers and is replaced.


## Page Requirements

- Chapter content lives in `<main>`; the footer is inserted after it (after the wrapping layout element if `</main>` is directly followed by `</div>`).
- A skip link `<a class="skip">` directly after `<body>` stays first; the bar goes after it.
- Remove any book script that injects its own back-to-library link, chapter navigation, or contents syncing; the chrome owns those. Book scripts may keep working with their own controls placed inside the bar's tools slot.
- The book's stylesheet must not position the bar or footer; if a generic `nav`, `footer`, or `.toc` rule leaks in, the chrome's selectors are already scoped one level deeper to win. When migrating, delete the book's old toolbar, contents, chapter-link, and footer rules rather than leaving them to be overridden.
- The last block of the chapter has no bottom rule: the footer brings its own divider, and two lines stacked read as a mistake.
- Figures that references point to carry stable ids (`<figure id="step-fig2">`), and figure links carry `data-image-preview`.

## Verification

Check one chapter and the contents page at desktop width and at 375px: bar on one line, dropdown aligned to the content column's right edge without horizontal overflow, bar hides and returns with scrolling, only the current section is accent in the open dropdown, footer labels aligned with a single divider above them, keyboard reaches every control, the tab shows the book icon (not the shelf icon), and the book's own tools still work. For references: hover shows the card beside the phrase, a multi-target card lists every target in order and each jump link works, a jump highlights the target, `回到原文` returns, and an automated pass confirms every link lands on the figure whose caption carries that label (or on the right page marker). Compare each rebuilt page's `<main>` text with the previous build so navigation changes cannot alter the book's text.
