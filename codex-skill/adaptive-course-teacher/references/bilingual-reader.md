# Bilingual Reading Edition: Integration Contract

Use when a reading edition shows the original text beside a translation, such as Japanese with Chinese. It adds three views (parallel, translation only, original only) and an optional reading-aid toggle such as furigana, remembered per book on the reader's device. Translation rules are in `book-learning.md` ("Reading Editions"); this file covers the page.

## Files

`<skill>/assets/bilingual-reader/`:

- `assets/bilingual.css` and `assets/bilingual.js`: runtime. Copy both into the book project's asset directory next to the reader chrome files.
- `src/bilingual.ts`: editable source. After changing it, run `npm ci` and `npm run build` in that folder; do not edit the generated JavaScript.

The controls rely on `reader-chrome.js` for clicks, arrow keys, and the `change` event (`reader-chrome.md`, "Book tools").

## Markup

Put the controls in the reader chrome's tools slot. They only respond inside the top bar (`.rc-bar`), which also moves them into the contents panel on narrow screens:

```html
<div class="rc-segmented" data-bilingual-view role="radiogroup" aria-label="阅读语言">
  <button type="button" role="radio" aria-checked="true" data-value="parallel">对照</button>
  <button type="button" role="radio" aria-checked="false" tabindex="-1" data-value="target">中文</button>
  <button type="button" role="radio" aria-checked="false" tabindex="-1" data-value="source">日文</button>
</div>
<button type="button" class="rc-toggle" data-bilingual-ruby role="switch" aria-checked="true">平假名</button>
```

Give `<body>` a stable `data-bilingual-key` (for example the book id) so books keep separate preferences. Pair every paragraph:

```html
<div class="bilingual">
  <p class="source" lang="ja"><ruby>宝石<rt>ほうせき</rt></ruby>箱の…</p>
  <p class="target" lang="zh-CN">宝石箱的……</p>
</div>
```

Headings that exist in both languages use `.source-heading` and `.target-heading`; each is hidden in the view that does not show its language. Leave out the toggle when the source language has no reading aid.

## Behavior and Layout

- Desktop parallel view: two columns, each original paragraph level with its translation. Single-language views narrow to one reading column.
- Narrow screens: each original paragraph followed by its translation, marked with a thin left rule; source order is kept.
- The reading-aid toggle hides `rt` without changing layout, and is disabled in the translation-only view.
- Set fonts with `--bilingual-source-font` and `--bilingual-target-font` on `:root`. Sizes default to 20px source and 22px translation on desktop; adjust in the book stylesheet if the learner's confirmed sizes differ.
- Figures, captions, and step structure stay outside `.bilingual` rows and follow the book's own layout.

## Verify

Switch all three views and the toggle on desktop and at 375px; reload to confirm the choice persists; confirm paragraph pairs stay aligned and no text is lost in any view; check that the toggle is disabled in the translation-only view and that keyboard arrows move between views.
