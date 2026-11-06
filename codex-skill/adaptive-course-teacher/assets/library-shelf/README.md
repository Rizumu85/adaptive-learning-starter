# Library shelf

A one-page home for a collection of reading editions. Each book stands as a 3D book (real cover in front, a spine with vertical title, page edges and top) in a carousel, the current one in the middle, lifted, with its title and author under it. With enough books there is one row per category, a search, and a large library word behind the first row: the books stand in front of it and it sinks back as you scroll.

It is a front end only: three files and a catalog. It works on any static host. Access control, storage and upload are up to you.

The sample catalog uses placeholder covers and made-up titles. Replace them with your own.

## Try it

`fetch` cannot read `books.json` from a `file://` page, so serve the folder:

```
python -m http.server 8000
```

then open http://localhost:8000/.

## Files

- `index.html`: the page shell.
- `assets/library.css`: everything visual. Colours, fonts and sizes are tokens at the top (`:root`).
- `assets/library.js`: rendering, the carousel (wheel, drag, arrow keys, snap), search, a book's contents view, the entrance.
- `assets/icon.svg`: tab icon.
- `books.json`: the catalog.
- `covers/`: cover images (WebP).

## books.json

```json
{
  "library": { "name": "Library · 书架", "mark": "LIBRARY", "giant": "书架", "searchFrom": 8 },
  "books": [ { "id": "color-notes", "title": "色彩笔记", "author": "…", "category": "绘画", "...": "…" } ]
}
```

`library`:
- `name`: the page title. Without `mark`, the part before `·` is used as the small Latin mark.
- `mark` (optional): the small letter-spaced mark at the top left. The reader chrome in this skill reads the same field, so book pages show it before `书架` in their top bar.
- `giant` (optional): the large word behind the first row. Defaults to the part of `name` after `·`, or the whole name. `false` turns it off; titles then sit above each row.
- `searchFrom`: from this many books on, the page shows search, the category tabs and one row per `category`. With fewer books it is one row with no masthead.

Each book:
- `id`: lowercase letters, digits and hyphens, unique.
- `title`, `author`, `edition`, `category`. Optional: `subtitle`, `originalTitle`, `translator`.
- `size`: `{ "width", "height", "thickness" }` in millimetres. Books are drawn to scale against each other.
- `cover`: `{ "src": "covers/<id>.webp", "fit": "cover" }`.
- `spine`: `{ "color", "ink", "author" }`: the spine colour (take it from the cover), its text colour, and the author line. Optional `art`: a small image for the top of the spine.
- `reader`: the book's folder.
- `directoryUrl` (optional): the book's own contents page. Clicking the book goes there. Without it, the shelf shows a plain contents view built from `chapters`.
- `chapters`: `{ "no", "title", "pages", "href" }`. A chapter with `"status": "pending"` and no `href` shows greyed as not yet ready.
- `volumes` (optional): a multi-volume set shown as one stacked book. `[{ "title", "cover", "ratio" }]`, first volume first; `ratio` is cover width ÷ height.

## Making it yours

You don't need to keep it identical. Things meant to change:
- The words: `name`, `mark`, `giant`, the categories.
- Colours: `--paper`, `--ink`, `--muted`, `--accent` and the shadow tokens in `library.css`.
- Fonts: the page asks for locally installed fonts by name (`@font-face` with `local()`): a display serif for titles and the giant word, an old-style song face, and a UI sans. It falls back to system fonts. Nothing is bundled, so change the names to fonts you have; don't publish font files you are not licensed to share.
- The carousel feel: `--book-h` (book height), `--current-scale` and `--current-lift` (how much the middle book grows and rises).

Keep these when you change things, or the 3D breaks:
- No opacity or filter animation on any ancestor of the book row. Opacity under 1 flattens 3D in Chrome and it may not come back. Animate the books themselves (transform), or the individual faces.
- Covers load first, then the row appears. Each cover fades in on load, so books never pop in.
- The shelf is built once and kept when you open a book's contents view, so the drawn 3D covers are not recreated.

## Optional server features

If the site has them, the page uses them. Without them, nothing shows and nothing errors.
- `GET`/`PUT /api/seen/<book>`: per-reader record of chapters already seen, for a “新增：…” line under a book that has new chapters. It needs book contents pages built with this skill's reader chrome (`#rc-chapters`).
- Last opened book is remembered in the browser (`localStorage`), so the shelf returns to it.

## Covers and rights

Real book covers are someone's artwork. Use them on a private site for books you own; don't put them in a public repository.
