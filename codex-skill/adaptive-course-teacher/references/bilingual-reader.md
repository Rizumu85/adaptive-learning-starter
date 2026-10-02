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
- Set fonts with `--bilingual-source-font` and `--bilingual-target-font` on `:root` in the book's stylesheet. `bilingual.css` declares no `:root` defaults (it falls back inside `var()`), so stylesheet order cannot override the book's choice. A copy made before 2026-10-01 still carries `:root{--bilingual-source-font:serif;…}`: if the translation renders in the system serif instead of the book's font, that is why; replace the copy from the skill, or load `bilingual.css` before the book's stylesheet. Sizes default to 20px source and 22px translation on desktop; adjust in the book stylesheet if the learner's confirmed sizes differ.
- A Latin-script original (English and the like) keeps a Latin serif on the source side; see "Chinese Reading Typography" in `presets.md`. The reading-aid toggle is left out for such a source.
- In Chinese/Latin parallel reading, give shared list markers such as `●` the Latin reading font on both sides, with the same explicit size and regular weight. CJK and Latin fonts draw the same marker differently; do not inherit each paragraph's font for it. Style the marker alone (for example, a span around the existing character), preserve the original text and Chinese body font, and avoid adding a second CSS marker. Use the Latin paragraph's marker size as the reference, including on translation-comparison pages; verify both markers' computed font, size and weight.
- Figures, captions, and step structure stay outside `.bilingual` rows and follow the book's own layout.
- Figure width follows the text it sits in. A landscape figure (wider than tall) spans the full two-column width in the parallel view and narrows to the single reading column (760px) in either single-language view, so its edges always line up with the paragraphs above and below. A portrait figure stays narrower (at most 620px) and left-aligned in every view. Decide landscape or portrait from the final crop, after transparent padding is trimmed. First set in a gardening book's reader and confirmed again in a drawing book, 2026-10-02.
- Bilingual captions need their own design; earlier books had no captions or only one language, so this was first met on 2026-10-01. A caption pair beside a wide figure can sit in two columns like the body. When the pair stacks (a narrow or portrait figure, and every caption on narrow screens), the two languages run together unless they are told apart: original lighter and a size smaller, translation a little darker, a 10px gap, and the same thin left rule that marks the translation in stacked body text. Drop the rule in single-language views. Latin names inside the translated caption take the Latin font (see `presets.md`), and the spaces around them become a small margin (about 0.3em), since a space in either font reads too wide between Latin and CJK.

## Verify

Switch all three views and the toggle on desktop and at 375px; reload to confirm the choice persists; confirm paragraph pairs stay aligned and no text is lost in any view; check that the toggle is disabled in the translation-only view and that keyboard arrows move between views. Read `getComputedStyle` of one `.source` and one `.target` paragraph in a real browser and confirm the font-family is the book's, not a bare `serif`.
