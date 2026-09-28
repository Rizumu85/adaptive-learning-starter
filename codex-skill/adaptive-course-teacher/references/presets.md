# Optional Presets

Presets are ready-made visual and interaction choices that other learners can adopt as they are. None of them is required. Use a preset when the learner's profile or project names it, or offer it once when a new project needs that kind of artifact. Record the choice and its scope in the profile or project notes.

A preset never authorizes producing more material; it only decides how material looks once the learner has asked for it.

## Using and Sharing

- To adopt a preset, the learner names it ("use the book reader navigation preset") or accepts it when the agent offers it. Record it in the learner profile with its scope, for example "Chinese reading typography: book pages only".
- To opt out for one project, record the exception in that project's `DESIGN.md`.
- Sharing the whole skill shares every preset. A learner can also share just their selection by passing on the preset lines from their profile; the recipient's agent looks the names up here.
- To reuse one component outside this skill, copy its reference and asset folder together: `reader-chrome.md` with `assets/reader-chrome/`, or `image-preview.md` with `assets/image-preview/` and `scripts/install-image-preview.cjs`.
- Fonts are never shared with a preset. Each learner installs licensed fonts on their own devices; pages fall back to system fonts elsewhere.

## Paper Courseware

Scope: lessons, reference pages, interactive labs.
Where: `courseware-design.md` for tokens, layout, feedback, and motion; the bundled examples under `assets/examples/lessons/`.
Summary: warm paper canvas, dark ink, one teal accent, unframed reading text, panels only for controls and comparisons, calm motion.

## Stepped Interactive Lab

Scope: interactive HTML that teaches one relationship at a time.
Where: "Stepped Labs" in `interactive-courseware.md` and `assets/examples/lessons/0002-stepped-interactive.html`.
Summary: a step 0 baseline, one changed variable per step, continuous transitions, visible progress, a reset, and sub-steps only when the learner asks for them.

## Book Reader Navigation

Scope: multi-page reading editions and a library of books.
Where: `reader-chrome.md` and `assets/reader-chrome/`.
Summary: a quiet top bar with `书架 / 书名` and a chapter-contents dropdown, a chapter footer, a structure rail, and print-like controls. Usually paired with In-Text References below.

## In-Text References

Scope: any long page where the text points at a figure or another passage ("如上图所示", "参考第198页") that may be out of view: book readers, reading lessons, reference sheets.
Where: "References" in `reader-chrome.md`; the same two runtime files in `assets/reader-chrome/`. It works without the top bar and footer.
Summary: the phrase becomes a dotted accent link; hovering shows a floating paper card with the figure and caption or the passage's first lines; clicking jumps there with a brief highlight and a `↩ 回到原文` chip. One phrase can also point to several places at once, such as a passage and a figure in different sections; the card then lists each of them with its own jump link. Links are generated only when the targets are certain.

## Bilingual Reading Edition

Scope: reading editions that show an original text beside its translation.
Where: `bilingual-reader.md` and `assets/bilingual-reader/`; controls come from the reader chrome.
Summary: parallel, translation-only, and original-only views plus a furigana or other reading-aid toggle, remembered per book; paragraph pairs side by side on desktop and stacked on phones.

## Bookshelf Homepage

Scope: one entry point for several reading editions.
Where: `bookshelf.md` and `assets/bookshelf/`.
Summary: a row of real covers built as flat-colored 3D books, the centered one raised; clicking it opens the book's contents; the last opened book is remembered on the device; configured entirely by `books.json`.

## In-Reading Practice (guidance only)

Scope: checks placed inside a reading edition or long lesson.
Where: "Practice Inside Reading" in `learning-engine.md`. No reusable component is bundled yet; build checks for the project from those principles.

## Offline Image Preview

Scope: any HTML page with images worth inspecting.
Where: `image-preview.md` and `assets/image-preview/`.
Summary: a paper-style viewer with zoom, pan, paging, pull-to-close, and return to the reading position, working from `file://`.

## Chinese Reading Typography

Scope: reading pages and book editions only; not software follow-along interfaces.

- Headings: 朝華標題B (`ZhaohuaMinB`, full name `ZhaohuaMinB Black`, PostScript `ZhaohuaMinB-Black`), native weight 900, for page, chapter, and step headings only.
- Chinese body: 京华老宋 (`KingHwaOldSong`, `KingHwa_OldSong`, `京華老宋體`, `京華老宋体`). Check the family name actually installed.
- Controls the reader operates (navigation, contents toggles, chapter links, toolbar labels, language or furigana switches): MiSans Demibold at weight 600 through `local("MiSans Demibold"), local("MiSans-Demibold")`, falling back to the system sans. Reading text, headings, captions, and folios keep their reading fonts.
- Bilingual Japanese–Chinese editions use the same pairing for the Japanese side: 朝華標題B for Japanese headings, 京华老宋 for Japanese body text and furigana, with Japanese fonts only as fallback. Kanji then take this font's glyph forms. A learner who wants Japanese glyph shapes keeps a Japanese font for the Japanese side instead.
- When trying a font, keep sizes and layout unchanged so the learner judges only the font. Use local font lookup with a legible fallback, and check real loading and narrow-screen wrapping.
- Do not bundle, upload, or redistribute licensed fonts. Machine-specific font file fallbacks belong in ignored local configuration. A font installed on one device is not available on others.
