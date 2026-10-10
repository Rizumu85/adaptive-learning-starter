# Layout Review of a Reading Edition

Use when a learner says pictures in a reading edition are hard to interpret, too small, or cut loose from their text; when checking an edition another agent built; and before publishing any book whose pages are designed spreads (magazines, art books, guides, catalogues, design sketchbooks). This file is the one place these rules are written; `book-learning.md` and `media-workflow.md` point here.

The printed page is the specification. It says which pictures belong together, which text each belongs to, and what each note points at. The web page must say the same thing at desktop, tablet and phone width. The wording of the text does not change in a layout review.

| In a layout review you may change | You may not change |
| --- | --- |
| Layout fields on the source data | The wording of the original text |
| Which picture a caption or note is bound to, and where it sits | The wording of the translation |
| A block's kind (paragraph, caption, label) and a heading's level | Transcription: do not correct or add text |
| Crop boxes, including a recut (a cluster, a stroke no crop includes, a label cut off) | |
| The order of a composition's parts | |

What you notice but may not change (a misread hand-written word, an untranscribed label, an inconsistent term) goes on a list for the learner; a later proofreading pass fixes it.

**Everything here serves the person reading.** The aim is that someone reading the page understands it with no more effort than the printed page asks: they see at once what a picture belongs to and what a note points at, without matching a picture against a list, scrolling back, or guessing. Following the book's layout, keeping a cluster whole, splitting it, choosing a side or an order: each is right only when it makes reading easier. When two rules pull apart, or none fits, choose what the reader's eye finds easiest, and record what you chose and why. A rule applied in a way that makes the page harder to read has been applied wrongly.

**The test of a finished unit is the reader, not the procedure.** Cover the printed page and look only at the web page: for every picture, can you say what it belongs to, and for every note, what it points at? If not, the unit is not done, however many fields were set and however clean the findings list is. A review that changes little on a page the learner called unreadable has failed; say so instead of reporting completion.

## Two kinds of page design

Decide this first for every group of pictures; the two need opposite treatment.

- **Typeset composition.** The designer arranged printed text blocks and pictures: a map with inset photos and captions, a grid of products, a picture beside its paragraph. The text is type, so it must be transcribed, translated and readable as text. **Rebuild the arrangement in HTML** so it reflows.
- **Hand-annotated cluster.** The author drew or wrote on the page by hand: a sketch with hand-written labels and leader lines, a reference photo pasted beside it with a scribbled note, arrows and circles drawn across pictures. The handwriting and lines are part of the drawing, and no HTML layout keeps a hand-drawn line attached to the stroke it points at. **Keep the whole cluster as one picture**, handwriting, lines and pasted photos included. Its notes, transcribed and translated, become zones on the picture: the reader points at or taps the writing and reads it there (see "Notes on the picture"). With three notes or fewer, listing them under the picture in the order they read is enough. When the handwriting is already in the reader's language (a translated edition that re-letters the notes in the picture), nothing needs listing: the picture carries them. Do not cut the sketch, the photos and the notes into separate figures, and do not crop the handwriting off and retype it as a caption: that leaves lines pointing at nothing.

**A cluster is the smallest group that lines tie together, not everything drawn on one sheet.** A sketch, the photo pasted beside it and the notes whose lines reach it are one cluster. A sheet of separate objects, each with its own hand-written label and nothing joining one object to the next (a page of souvenirs, a catalogue of creatures, a set of props), is many small clusters: crop each object together with its own label and its own short leader lines, set them in a grid, and put each translation directly under its object. The handwriting still stays in the picture, and the reader never has to match a picture against a long list below it. Two objects joined by an arrow or a shared note stay together in one cell.

The reader should not have to cross-reference. When a cluster would carry more than about six notes, ask whether it can be split into smaller clusters without cutting a line; split it when it can. When it cannot (everything is tied to one central picture), keep it whole, give each note its zone, and keep the notes in the order the eye meets them, top to bottom and left to right: that is the order the reader steps through them.

A page can hold both: a typeset heading and body paragraphs around several hand-annotated clusters. Crop a cluster tightly, leaving out typeset body text, running heads and folios. When a whole page or spread is one hand-drawn sheet whose parts are tied by lines and arrows to a central picture, so that any split would cut a line, the sheet is one cluster: keep it whole, minus the typeset title, running head and folio, and say so in the record.

## Material

For one unit at a time:

```
python <skill>/assets/layout-review/layout_review.py --page local-reading/<unit>.html \
    --out work/qa/layout/<unit> --pdf <source.pdf> --pdf-pages <first>-<last>
```

It writes the printed pages as overview spreads (`book-NN.png`) and one large image per page (`pages/pNNNN.png`, for reading handwriting and following lines), the web page at 1440, 820 and 390 px in tiles (`w1440-NN.png` and so on), and `report.json` with findings: `small-alone` (a small picture with nothing beside it), `wordless-run` (pictures following one another with no words), `narrow-caption` (a caption under 220 px), `overflow`. When the source is page images, use `--images "work/pages/p{page:04}.png" --pdf-pages 34-39`: `--pdf-pages` is still needed, it names the pages (counted from 1, like `page` in the crop record; `34-36,40` is allowed). Other options: `--widths 1440,820,390`, `--scale 2` to judge small type, `--browser <path>` when Chrome or Edge is not found. These are whole-page renders: `--out` must be an ignored working folder, never the published reader.

To see where a whole book needs review, survey it first: `python <skill>/assets/layout-review/layout_review.py --survey local-reading --out work/qa/layout/_survey` lists the findings per page at 1440 px, most first, without screenshots.

`report.json` also lists `anchors`: the vertical position of every section and heading with an id, so a printed page can be found in the tiles. A figure inside an element with `data-layout-ok` is not reported.

For plate-like books (an atlas, a catalogue, a book of photographs), pictures without words are normal and `wordless-run` is mostly noise. Add `--crops local-reading/crops.json`: the tool then compares where the crop record places each picture on the printed page with where it sits on the wide screen, and reports `row-split` (two pictures printed side by side are no longer side by side) and `cut-frame` (two crops whose boxes touch along a whole edge, probably one printed frame cut into pieces). A third fault it cannot see must be looked for by eye: body text the book prints between two pictures moved above or below them.

A bilingual reader has more than one view: capture the view the learner reads in and the parallel view as well (`--view parallel`, `target` or `source`); a group that fits a single-language column can break in two columns.

The findings are where to start looking, not the verdict. A small picture alone can be right, and a broken composition can have no finding at all.

For the notes on a cluster there is a second tool, `python <skill>/assets/note-zones/note_boxes.py`: from an OCR draft of the page it proposes a box on the picture for every transcribed note and draws a check sheet with a grid; `--batch` does a whole book without anyone looking and lists what is left. See "Notes on the picture".

## Procedure

Work through one unit completely before starting the next.

1. **Read the printed pages first.** Open the overview, then every large page. For each page, write down the picture groups (pictures that belong together; unrelated to the `group` field of the crop record): which pictures belong together, and what the page uses to say so (leader lines, numbers, a frame or tinted box, a picture set beside its note, items scattered around a title, arrows between steps, a before-and-after pair, rows and columns, hand-written notes and lines).
2. **Find each group on the web page.** Open the 1440 px tiles and apply the reader test above to each group.
3. **Give every group one verdict** and write it down before changing anything:

   | Verdict | When | What the page should do |
   | --- | --- | --- |
   | keep | An independent illustration that reads on its own | Nothing |
   | cluster | Hand-annotated: sketch, pasted photos, hand-written notes, drawn lines or arrows, tied together by lines | One picture of the smallest tied group. Its notes are zones on the picture: pointing at or tapping the writing shows the original and the translation. The list underneath stays in page order and folds into one line that opens it, once every note has a zone |
   | item clusters | Hand-annotated: separate objects on one sheet, each with its own label, not joined to each other | One crop per object with its own label inside; a grid, each translation under its object |
   | cited | Typeset: pictures carry printed numbers and the text cites those numbers (tutorials, step-by-step) | Each picture directly after the paragraph that first cites it, its own caption under it; pictures the book sets side by side stay in a row |
   | beside | Typeset: a small picture belongs to one note or caption | Picture beside that text; stacked on a phone |
   | companions | Typeset: a main picture with its reference pictures or notes, or a row of stages the book prints side by side without numbers or arrows | The group in the book's columns and proportions on wide screens |
   | grid | Typeset: several sibling items, each with its own label | One cell per item, label under it |
   | around | Typeset: a central picture with callouts or insets tied to places on it | Central picture with its entries beside it on wide screens and below it on narrow ones; matching markers on the picture and on each entry |
   | steps, compare, table | A sequence, a pair, or rows and columns | The generator's step, comparison or table layout |
   | new layout | Typeset, and none of the above keeps the relation | See "When nothing fits" |

   These verdict names are for the review notes; a project's own field names may differ.

4. **Apply the verdict through the project's generator and source data.** Never edit generated HTML and never change the wording of the text.
   - Layout fields, and which picture a caption is bound to, are both layout: bind each note to the picture it describes, and place it where the book prints it.
   - A cluster needs a new crop: one box around the whole cluster in the crop record, the piece crops it replaces removed, every note of the cluster bound to it, then recut and run the crop audit. Where two clusters' boxes overlap, exclude the neighbour's part.
   - A group that can be partly restored should be: put the companions together now, and record what is still missing (for example "the three lines' landing points are not shown"). Leaving pictures scattered because the full relation cannot be rebuilt is the worse outcome.
   - Captions are bound to their pictures even when the source data lists them as loose text: a caption line that floats away from its picture is a layout fault. Moving or rebinding a caption block is allowed when its wording stays the same; update any review hash or order record that depends on it and note the move.
   - Pictures that follow one another without words are fine when each carries a printed number the text cites, or when the book itself prints them as a plate. After checking them against the printed page, mark them reviewed (`layout_ok` on the figure, written out by the generator as `data-layout-ok`) so the tool stops reporting them.
   - A block's kind is layout too: a colour name printed under a swatch that was recorded as a paragraph is that swatch's caption. Changing its kind and binding is allowed when the wording stays the same; note it.
   - A number or letter the book prints on a picture and repeats beside an entry (a numbered recipe, a keyed part) stays where it is printed: when the crop does not carry it legibly, the layout shows it at the printed position as a marker, once, not once per language.
   - Caption widths: a caption standing under or beside its own picture is at least 220 px wide (the tool's `narrow-caption` threshold), however small the picture; in a grid, a cell that holds a description is at least about 180 px, with fewer columns on narrower screens and one column on a phone when the text is more than a name.
   - A printed box (tip, memo, note) that was split into several blocks is one box again, with its title inside; a picture the book prints inside the box goes inside it.
   - Heading levels are layout. A printed label inside a group (a category tag over a few items, a tab on a boxed note) is not a chapter heading: give it the level of a label, so it reads as part of its group and stays out of the page's contents list. The wording does not change.
   - A table row that holds running text (a comparison table whose last row is a paragraph per column) stays in the table. On a phone its cells stack, each under its column's name, which the layout repeats from the header; a column name is never entered a second time in the data to label them.
   - A printed arrow, rule or bracket that ties pictures together may be redrawn by the layout (an arrow between a before and an after picture); like markers, it is layout and is recorded as such.
   - A typeset diagram that was cropped as one picture with its printed labels still inside, untranscribed, is a transcription gap first: list it. Once its labels are transcribed and translated it becomes an "around" composition.
   - Do not use a layout whose meaning is wrong (a "steps" container for things that are not steps) without recording that it is used only as a container; prefer adding a neutral one.
5. **Rebuild, run the project's verification, and run the tool again.** Open the tiles at all three widths beside the large printed pages. Accept the unit when the reader test passes at every width and these hold:

   At every width:
   - captions meet the widths in step 4, and nothing is wider than the screen;
   - the page is written in reading order (heading, text, picture), so narrow screens and assistive readers get the order right;
   - every row was looked at: a picture placed in a row is no longer reported by the tool, so check that nothing in it became too small to read.

   On wide screens:
   - sides and order follow the book. When the two languages of a bilingual view already take the width, the book's left and right give way and only the order is kept.

   On the phone:
   - each picture sits directly above or below its own text. This comes before keeping the book's left and right: reorder a group if a picture would otherwise read as belonging to its neighbour;
   - pictures with hand-written notes stack at full width; a plain comparison row may stay side by side if each picture is still clear.

   Other units:
   - their pages changed only in the stylesheet version, if at all. A general fix in the generator that improves every unit is welcome, but then open those units too before publishing them, or switch the fix on unit by unit.
6. **Record and commit per unit.** In `NOTES.md`, one line per group: pages, figure ids, verdict, what was done, what is still missing. Then the open list.

## Notes on the picture

A cluster with many hand-written notes used to be one picture with the transcribed notes listed under it. That keeps every line attached, but the reader then holds a translation in one hand and hunts through the picture for the writing it belongs to. With zones the reader points at the writing and reads it where it is: each note has a box on the picture, and pointing at it, tapping it or reaching it with Tab shows that note's typed original and translation in a card. The list under the picture stays in the page (search, copying and screen readers use it) and folds into one line once it is no longer needed for reading.

| The picture | What to do |
| --- | --- |
| Hand-annotated cluster with four or more notes | Zones. When every note has one, the list folds into a single line that says what to do and opens the list |
| Hand-annotated cluster with three notes or fewer | The list under the picture already reads without matching; leave it visible (zones may still be added) |
| Typeset composition | Rebuild it in HTML as before; zones do not replace a layout that can reflow |
| "Around" composition with lettered markers | Both: the markers stay (on a touch screen they are the visible way in), and the printed labels get zones |
| Some notes of a cluster have no box yet | Fine: those with a box are zones, the rest stay listed under the picture |

The script, styles, box-finding tool and data fields are in `assets/note-zones/` (read its `README.md`). What the reader gets:

| Device | Behaviour |
| --- | --- |
| Mouse | A zone is invisible until the pointer rests on it; then a flat, light tint on the writing and a card beside it. Moving away closes it. Left and right arrows step through the notes in reading order. Elsewhere on the picture a click still opens the preview |
| Keyboard | Tab reaches every zone in reading order, Escape closes the card |
| Touch, wide screen | A tap pins the card; a tap elsewhere closes it. Each zone can be hit in an area at least 28 px square; where two overlap, the nearer wins |
| Phone (720 px and under) | Nobody has to hit a small target: a tap anywhere on the picture opens the nearest note in a sheet at the bottom, with an enlarged view of the place, the text, previous / next and a count; swipe to step, swipe down or tap outside to close |
| Enlarged preview | The same zones, the same card and sheet |

The card may not cover the note it belongs to and may not leave the screen. Of the places below, above, right and left of the note it takes the first where it hides no other note, and failing that the one where it hides least. Check this in screenshots of the interactive states, not only of the page at rest: a note at each edge, one at the bottom of the screen, and the two notes that sit closest together.

**Where the boxes come from.** Run OCR on the page rendered at 2300 px wide or more (`assets/ocr/ocr_draft.py --fast`), then `assets/note-zones/note_boxes.py`, which pairs the lines it finds inside the picture with the notes already transcribed and says how sure it is:

| Verdict | What it means | What to do |
| --- | --- | --- |
| auto | The writing was read as this note and the amount of text fits | Accept after a glance at the check sheet |
| doubtful | Something was found, but too little, or the match is weak or shared | Look at the check sheet, then accept or redraw |
| none | Nothing was found | Draw the box on the grid of the check sheet |

Printed labels are nearly always found. Handwriting on a small scan is found for roughly two notes in three; the rest are placed by hand. A box goes round the whole note, all its lines; a label written in several places gets a box at each.

**First what a script can do, then only what is asked for.** A rule added to this skill is not a reason for a model to look at a whole book again. When a book already has its clusters and transcribed notes, run the batch mode (`note_boxes.py --batch`) over all of it: it needs no model and no one looking, keeps only boxes whose writing was read almost character for character, writes nothing it is unsure of, and lists what is left, picture by picture, most missing first. That gives every picture the zones that are certain. The remainder waits until the learner names a page or a picture; then that picture is finished on its check sheet. The same order holds for any rule that can be applied by a script: apply it mechanically, list what remains, and spend a model only on the part of the list someone asks for.

**A spread wider than the column.** A picture is never shown above about 1.35 times its scan pixels. For a spread whose two halves together are wider than the text column even at that size, the column makes it smaller than its pixels. On a wide screen let such a spread reach past the column by the same amount on both sides, no wider than the window less a margin that keeps it clear of the reader's own controls, 1.35 times its pixels, and what 80% of the window height allows. A single page never qualifies.

**Reader test.** Cover the list under the picture. With only the picture and the card, read every note: on a desktop by pointing, on a phone by stepping from the first to the last. A note with no way in, a card that hides the writing it explains, or a card off the screen means the picture is not done.

## Markers in place of leader lines

Only for typeset "around" compositions. Lines cannot follow a layout that reflows, so the same letter goes on the picture and at the start of its entry. Use letters when the book already numbers things. Markers are layout, not book text; say so in `NOTES.md`. Keep them flat and quiet: translucent paper-coloured fill, a thin accent border, solid letter, no glow or shadow.

Place each marker where the printed line starts, as a percentage of the picture's width and height. Measure on a copy of the picture with a 10% grid drawn over it, then check the screenshot: every marker must sit on its line's origin. Entries keep the book's order and side.

## When nothing fits

A typeset composition that no existing layout keeps needs a new named layout in the generator. Who may add one:

| Situation | May the generator change? |
| --- | --- |
| The learner or the project's `AGENTS.md` said not to | No. Restore what existing layouts can, and put the group on the open list |
| You are one of several agents working on the same book in parallel | No. Put the group on the open list for the main session; a parallel agent's generator changes are not merged |
| You cannot check a new layout at all three widths | No. Open list |
| Otherwise | Yes: a named, reusable layout driven by fields in the source data (never one page's HTML), holding at 1440, 820 and 390 px, with its fields documented in the project's `AGENTS.md` or `NOTES.md` |

An entry on the open list in `NOTES.md` says: unit, pages, figure ids, what the page ties together and how, and what kind of layout would keep it. A typeset diagram whose printed labels were never transcribed also goes there: it becomes an "around" composition in a later pass, after proofreading has transcribed and translated the labels.

Never force a composition into a layout that changes its meaning, and never replace it with a scan of the whole page. Marker positions you cannot measure with confidence go on the open list instead of being guessed.

## Do not

- enlarge a small picture to fill the column to make it "readable"; it needs its companions or its text, not size (a cluster may be shown a little above scan size so its handwriting is legible);
- add explanations, numbering or headings the book does not have (markers excepted);
- move text out of the book's reading order, apart from keeping a composition's parts together;
- mark a unit done from the findings list alone, without opening the large printed pages and the screenshots;
- go through a whole book again because a rule was added: apply the rule by script where one can, list what remains, and work on the part someone asks for;
- fix transcription or translation in this pass (see the table at the top). A stroke or label that no crop includes is a crop fault, and you do fix that.

## Several agents on one book

Give each agent its own working copy (a git worktree with its own scratch folder and local config) and a fixed list of units; they must not share helper-script names in a common scratch folder. Agents commit locally and never publish. The main session takes from each branch only the source data, images and notes of the units that agent finished, then regenerates what is derived (the pages; and the crop record when the project's script writes it from the source data, otherwise the crop record is merged entry by entry and never overwritten whole) once, runs verification and the crop audit on the merged result, and publishes. Derived files are never merged by hand. A generator that stores computed values only in the derived record must carry them over for entries a partial run does not touch.

## Report

Tell the learner, per unit: the groups found, each verdict, what changed, what stays open and why, which widths were checked by screenshot, and the result of the reader test in plain words, including where it still fails.
