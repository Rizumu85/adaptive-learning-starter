# Bookshelf Homepage: Integration Contract

Use when a learner has several reading editions and wants one entry point. The shelf shows real book covers in a row like a paper notebook app; the centered book is raised, others lean back slightly; clicking the centered book opens its contents. It only helps find a book and a chapter; it does not add introductions, statistics, or promotion.

## Files

`<skill>/assets/bookshelf/` is a complete static site. Copy the folder to a new location (not inside a book project):

- `index.html`, `assets/library.css`, `assets/library.js`: runtime.
- `books.example.json`: copy to `books.json` and replace the sample book.
- `covers/`: one real cover per book (`<id>.webp`), and optionally a small spine image (`<id>-spine.webp`) for the top of the spine.
- `tools/check_books.py`: checks required fields, duplicate ids, image files, and, when `preview.local.json` exists, that each chapter file exists locally.
- `tools/preview.py`: a read-only local server on 127.0.0.1. It serves the shelf and maps `/readers/<id>/` to the book projects listed in `preview.local.json` (copy `preview.local.example.json`), exposing only their `local-reading/` and `assets/` folders.
- `src/library.ts`: editable source. After changing it, run `npm ci` and `npm run build`; do not edit the generated JavaScript.

When the shelf is published on a private host, keep the host configuration, access checks, and upload tools in the shelf project (for example a `deploy/` folder beside `index.html`), never inside one of the books. Each book project only builds its own reading edition; the shelf project stages and uploads every book from there, so finishing or archiving one book never strands the site.

`books.json` cannot be read from `file://`; open the shelf through `tools/preview.py` or a web host.

## books.json

- `library.name`: the title shown on the shelf page. `library.storageKey`: a short unique key; the last opened book is remembered under it on the reader's device. `library.searchFrom`: from this many books on, a search box and category rows appear.
- Each book: `id` (stable, lowercase with hyphens), `title`, `author`, optional `originalTitle`, `subtitle`, `translator`, `edition`, `category`.
- Titles follow one rule on every book: `title` is the name in the reader's language (for a Chinese-reading shelf, the Chinese title, or a short Chinese name when the book has none) and goes on the spine; `originalTitle` holds the original-language title, shown as small text under it (`The Wild Garden · William Robinson 著`) and included in search; `subtitle` is only a real subtitle of the book (理解人体结构), never the original title or a translation of the title.
- The order of `books` is the order on the shelf. Insert a new book beside the books of the same `category` (or the nearest subject when its category is new), keeping each category together and placing closely related books next to each other (two anatomy books, two illustrators' art books). Do not append it at the end by default.
- `size` in millimetres (`width`, `height`, `thickness`) sets proportions; every book is shown at the same height.
- `cover.src` and `cover.fit` (`cover`, or `contain` for a cut-out figure); `spine.color`, `spine.ink`, optional `spine.art` and `spine.author`.
- Contents: either `directoryUrl`, which sends the reader to the book's own contents page, or `reader` plus `chapters` (`no`, `title`, `pages`, `href` relative to `reader`, optional `status: "pending"` for unfinished chapters, shown grey).

## Publishing Registry

A private shelf needs each book registered in several places: the staging allowlist, the upload scopes and directory order, the Worker's entry redirects, path prefixes, cover pattern and seen-chapter list, the shelf staging checks, the tests, `books.json` and the local preview map. Adding one book touched five files in eleven places on one shelf, and the test suite's fake storage answers every key, so a test that a `.png` path is "not published" passes falsely while `.json` and `.pdf` paths fail correctly only because the Worker has no content type for them. Keep one registry instead: a single list of `{id, project folder, reader directory, entry page}` that the staging script, the upload script, the Worker and the tests all read, so a new book is one entry plus one cover. Until a shelf has that, write the list of places to edit in its `deploy/README.md` and tick them off; and in the Worker tests, prove exclusion only with paths the Worker rejects on its own rules (no content type, hidden segments, unknown prefixes), not with extensions the fake storage would serve.

## New Chapters

On a signed-in private site, when a book whose contents page embeds the reader chrome's chapter list has chapters the reader has not yet seen on that contents page, the line under the centered book adds `新增：…` in small accent text. Opening the book's contents page clears it. If the reader never opens it, it disappears three hours after it first appeared and those chapters count as seen; a further new chapter restarts the three hours (the record keeps `shown` and `shownAt` for this). The shelf reads the list from each book's `directoryUrl` page and the reader's record from `/api/seen/<id>` (see "New chapters" in `reader-chrome.md`); `books.json` chapter lists are not used for this. Add `?preview-new` to the shelf URL to see the line on every book without writing anything. Local previews without the endpoint show nothing. Nothing is drawn on the books themselves.

## Look and Motion

The shelf follows the paper presets: flat colors, a real cover on the front face, a vertical title on the spine, a thin paper-colored page edge and top, a soft contact shadow on the cover plus a fainter shadow on the wall behind the book. Opening a book lays a translucent paper veil over the shelf and lets the page transition fade; it does not enlarge the cover. The centered book's contents page is prepared in the background after it stays centered for 600 ms. Wheel, drag, arrow keys, and Tab move between books.

The page's tab icon is the bookshelf icon in `index.html` (three spines in teal, slate, and gold); reading editions use the single-book icon from the reader chrome (see "Tab icon" in `reader-chrome.md`). Do not give a book page the shelf icon.

Typography uses the learner's reading preset when the fonts are installed and falls back to system fonts otherwise. Keep the page free of welcome text and cards.

## Verify

Run `python tools/check_books.py`, open the shelf through the preview server at desktop and 375px, move between books with click, wheel, drag, and keyboard, open a book with a contents page and one with `directoryUrl`, return with the browser back button, and confirm the console shows no errors.
