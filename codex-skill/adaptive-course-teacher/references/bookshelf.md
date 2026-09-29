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

`books.json` cannot be read from `file://`; open the shelf through `tools/preview.py` or a web host.

## books.json

- `library.name`: the title shown on the shelf page. `library.storageKey`: a short unique key; the last opened book is remembered under it on the reader's device. `library.searchFrom`: from this many books on, a search box and category rows appear.
- Each book: `id` (stable, lowercase with hyphens), `title`, `author`, optional `subtitle`, `translator`, `edition`, `category`.
- `size` in millimetres (`width`, `height`, `thickness`) sets proportions; every book is shown at the same height.
- `cover.src` and `cover.fit` (`cover`, or `contain` for a cut-out figure); `spine.color`, `spine.ink`, optional `spine.art` and `spine.author`.
- Contents: either `directoryUrl`, which sends the reader to the book's own contents page, or `reader` plus `chapters` (`no`, `title`, `pages`, `href` relative to `reader`, optional `status: "pending"` for unfinished chapters, shown grey).

## New Chapters

On a signed-in private site, a book whose contents page embeds the reader chrome's chapter list shows a thin accent bookmark ribbon above its top edge when the reader has chapters they have not opened, and the line under the centered book adds `新增：…`. The shelf reads the list from each book's `directoryUrl` page and the reader's record from `/api/seen/<id>` (see "New chapters" in `reader-chrome.md`); `books.json` chapter lists are not used for this. Local previews show nothing.

## Look and Motion

The shelf follows the paper presets: flat colors, a real cover on the front face, a vertical title on the spine, a thin paper-colored page edge and top, a soft contact shadow on the cover plus a fainter shadow on the wall behind the book. Opening a book lays a translucent paper veil over the shelf and lets the page transition fade; it does not enlarge the cover. The centered book's contents page is prepared in the background after it stays centered for 600 ms. Wheel, drag, arrow keys, and Tab move between books.

Typography uses the learner's reading preset when the fonts are installed and falls back to system fonts otherwise. Keep the page free of welcome text and cards.

## Verify

Run `python tools/check_books.py`, open the shelf through the preview server at desktop and 375px, move between books with click, wheel, drag, and keyboard, open a book with a contents page and one with `directoryUrl`, return with the browser back button, and confirm the console shows no errors.
