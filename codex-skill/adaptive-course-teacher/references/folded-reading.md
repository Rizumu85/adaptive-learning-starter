# Making Folded Reading Data

How to produce the key sentences and gists that the chrome's folded reading shows (`references/reader-chrome.md`, "Folded reading"). Read this before adding folded reading to a book. The learner decides which books get it; a book whose rules forbid AI text in the reading edition needs their say-so for the gists.

## Shape

One file per book, `folds.json` beside the pages (force-add it to git if the reading folder is ignored):

```json
{"format": "folds/v2", "model": "<what wrote it>", "updated": "YYYY-MM-DD", "written": ["chapters", "sections"],
 "paragraphs": {"<paragraph id>": {"zh": [0, 2], "en": [0, 3]}},
 "sections":   {"<heading id>": "one line"},
 "chapters":   {"<unit id>": {"takeaway": "one line", "topics": ["…", "…"]}}}
```

Paragraphs store sentence indexes per language, never text. Without the file the build must produce exactly the pages it made before, so folded reading can be added and removed without touching anything else.

## Split once, in one place

Put sentence splitting, which blocks fold, the section walk and the gist markup in one small module (`tools/folds.py`) that both the build and the data tool import. If the two ever split differently, indexes point at the wrong sentences.

- Split each language with its own rule (CJK sentence ends with closing quotes and brackets; English with abbreviations and initials guarded). Joined, the pieces must equal the text exactly, spaces included.
- A piece with no letter or Han character (trailing spaces, a footnote number after a closing quote) joins the sentence before it; otherwise it becomes its own "sentence" and can be picked as a key sentence.
- A paragraph folds only when it has two or more sentences in both languages and rendering each sentence on its own, joined, gives exactly the paragraph's markup. Paragraphs whose markup spans sentences (links, special inline styles, a struck-out figure) stay whole.
- If a paragraph would need its rendering state reset per sentence (for example "first mention gets a link"), reset it the same way before the whole render and before the sentence-by-sentence render.
- When `folds.json` names a paragraph whose sentences no longer match (an index out of range, a different render), stop the build with "rerun the data tool" instead of guessing.

## What folds

- Body paragraphs only. Captions, lists, tables, timelines, glossaries, catalogues, plans, notes, bibliography, credits and plate-only units stay whole; boxed summaries are already the point.
- Section gists only for headed sections of at least about 300 characters of body text. The section under the chapter's own title gets none: the chapter gist covers it. Find that title heading as the first heading of the unit, not the first non-empty section, or a frontispiece before it makes a duplicate.
- Headings printed side by side as one group open no section.

## Prompts

- Send the original only and ask for JSON only: per unit a chapter takeaway (about 45 characters) with three to five short topics, a line per listed section (about 40 characters), and per numbered paragraph the key sentence indexes (one for two or three sentences, one or two for longer, three at most).
- The model picks sentences in the learner's reading language. When both languages split into the same number of sentences with similar running length shares (within about 0.2 at each sentence), reuse the same indexes for the original. Otherwise mark the paragraph and also send its original sentences, numbered, and ask for the matching original indexes.
- Include captions marked as captions and unfolded paragraphs as plain text, so gists are written from the whole chapter, not from its title alone.
- Put several units in one prompt up to a size the model handles well (about 40k characters worked), one answer file per batch. Leave out units that already have an answer, so a run cut short resumes where it stopped.

## Running through a chat page

When the model is used through a web chat in a browser rather than an API:

- Usage limits are not a fixed count; push until a batch fails, then resume after the window resets. Never save a reply if the chat switched to another model or mode while answering: a fallback answer looks valid and is worse.
- A reply can arrive split into several code blocks; try the longest block, then all blocks joined, then the whole reply text before calling it unreadable. A reply can also stall empty; move its raw text aside and rerun the batch.
- Answers may key units differently from the prompt (with or without a prefix); normalize keys on ingest.
- Queue several books in order and stop at the first failed batch. Publish finished chapters after each round instead of waiting for the whole book.

## Ingest and check

- Keep only in-range indexes, at most three per language; report each unit's missing paragraphs and section lines, and rerun those units rather than filling them in.
- Look over lines that run past the length asked for; a few characters over can stay.
- Rebuild and run the book's text check: folded paragraphs must still render the exact text.
- In a preview, look at one folded chapter and the contents page before the first publish: the gist slip sits in the text column, both halves of each pair carry `data-fold`, every folded paragraph has a key sentence. A hidden preview pane stalls the fold animation, so the switch can look dead; check the fold state by its classes, or reload with the switch's saved state set.
- After publishing, compare the live contents page and a couple of chapters with the local pages: same number of folded paragraphs, every gist line present, images loading.
