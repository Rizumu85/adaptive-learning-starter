# Learning From a Book

## First Session

Read the project instructions and inspect the contents plus one candidate section. Separate the learner's long-term goal from today's scope. If the starting point is unknown, propose one short unit and ask whether the learner has already read it; do not assume chapter one or transfer progress from another subject.

Deliver the unit as a reading edition of its pages (see "Reading Editions" below); a book not in the learner's language gets a bilingual edition from the first unit. In conversation, say which pages the unit covers and where to stop. Do not write a separate reading-map file: viewing maps belong to video and software courses. Stop after handing over this unit. Do not process later chapters to keep working while the learner reads. A requested whole-book outline may cover headings, but is not authorization to summarize every page or build every lesson.

## Source Locations

For scans, inspect actual page images before attributing claims to the book. Keep PDF page numbers and printed page labels distinct. Record verified pairs; never generalize one offset across the book without evidence. When locations conflict, flag them and verify the next unit before issuing exact reading instructions.

Keep source claims, paraphrases, and supplemental explanations distinguishable. Do not convert an illustrative claim into a numerical simulation unless the model is justified and its limits are clear. Passing implementation tests does not validate the science or interpretation.

## Reading Loop

1. Hand over the reading edition for the selected short unit and name the stopping point in conversation. A whole chapter is not the default unit.
2. Let the learner read and report what they noticed or where they became confused.
3. Reconstruct the missing reasoning with concrete observations appropriate to this subject, then name the concept. Do not reuse a fixed analogy across topics.
4. When useful, suggest one small application suited to the learner's goal. For drawing, this could be identifying a visible landmark or making a quick structural sketch; do not prescribe the same exercise for every section.
5. Choose what is worth retaining with the learner. Start with the lightest sufficient medium; build an interactive artifact only for a specific obstacle or an explicit request.
6. Record the learner's confirmed reading position, attempt, unresolved question, and next action. Source inspected by the agent, artifact completed, learner read, and learner demonstrated understanding are different states.

## Dense Sections

When a section lists more names, variations, or steps than the learner's goal needs, apply "Filtering Dense Material" in `learning-engine.md` before the learner tries to memorize it. A learner saying a section is "too detailed" or "I can't tell what matters" is the signal. Keep the book's text complete; change the emphasis and the check, not the source.

## Reading Editions

A book project's units are delivered as reading editions by default: each unit's pages as a web page, with the original beside a translation when the book is not in the learner's language. The learner profile or the project's `AGENTS.md` may turn this off. The edition is the source, not the teaching.

- Keep the original text and the book's structure. Do not insert AI explanations, reading questions, or editorial notes into the edition. Orientation and teaching stay in conversation.
- Verify every page against the scan before calling it checked. OCR and text layers are drafts. Keep printed page labels and PDF indices distinct, and record verified pairs rather than a global offset.
- Draft text from scans and image-only books with PP-OCRv5 through RapidOCR: `assets/ocr/ocr_draft.py` runs it locally and offline on PDF pages or page images and writes each page's lines with boxes on the 1000-wide scale of `crops.json`. One recognizer covers simplified and traditional Chinese, Japanese and English. On verified pages from three books (2026-09) it missed or misread 3 of 2440 characters on simplified scans (PP-OCRv4: 20), 4 of 972 on traditional Chinese and English captions (PP-OCRv4: 17), and 55 of 2632 on Japanese (Windows OCR: 335), at about five seconds a page. Use a text layer instead when the PDF has a reliable one. The output is still a draft: check every line against the page, and look by eye at reading order across columns, ruby, text over drawings, light text on dark ground and handwriting. Record the engine and version in the project's notes.
- Crop figures from the source as described in `media-workflow.md`, keep them beside the passage they illustrate, and make them inspectable with `image-preview.md`.
- With two translations, compare them passage by passage and choose the clearer wording without blending them into a text neither translator wrote. Keep the changes and reasons in a local editorial file.
- For a machine translation, send short batches, keep the raw output and the reviewed version separately, and review against the source for omissions, invented content, terms, numbering, and image correspondence. Preserve the author's voice: first person stays first person, hedges and feelings stay, and splitting a paragraph into points is paragraphing, not summarizing.
- For Japanese with furigana, bind each reading to its word with semantic `ruby`, choose readings from context, and leave uncertain proper-noun readings unannotated rather than guessing.
- Keep the source's own sidebars (tips, boxed notes) as distinct asides with a light background, including continuations on later pages; keep main prose outside them.
- A reading aid for rare characters is optional: when the learner reads in a language whose text includes rare or commonly misread characters (for example uncommon anatomical characters in Chinese), annotate them with `ruby` at their first appearance in each chapter only, leave the text itself unchanged, and skip added practice blocks. Ask before adding it to a new book.
- Regenerate pages from data and validate that every source paragraph and translation appears exactly once and in order; a navigation or styling change must not change the text.
- When the text keeps naming things the learner cannot picture (plants, species, minerals, historical figures) and the book itself has a catalogue of them elsewhere, connect the two: append to each chapter a short section built from the book's own catalogue entries for the names that chapter mentions (its photo and opening description, translated), link every mention to it, and let the reference card show it in place. Mark the few names worth learning (those in the chapter's own pictures) with a short study hint, set apart from the source by its tinted box and side rule rather than by a "not part of the book" label, and the `rc-key` marker; the rest stay lookup-only. First used for plant names in an English gardening book, 2026-10-01.
- Use the shared navigation in `reader-chrome.md` for multi-page readers. Link references in the text to their figures and passages, and add multi-target references where one phrase needs a passage and a figure (or several figures) from different places; `reader-chrome.md` ("References") lists when to add them.
- Record every figure cut from the book in `local-reading/crops.json` (see "Crop Record" in `media-workflow.md`) and run the crop audit before publishing a chapter.
- Keep source text, translations, crops, and editorial data in ignored local directories. Host them only as `private-delivery.md` allows.

Reading-edition typography is a learner choice; see `presets.md` for the bundled Chinese reading pairing.

## Existing Projects

Keep existing materials. If their accuracy or authorization is unclear, label them as drafts or historical records rather than silently deleting them or counting them as learned. Do not overwrite a claimed learning history with invented certainty in either direction. Resume from the learner's last confirmed checkpoint.
