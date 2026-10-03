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

**The test of a finished unit is the reader, not the procedure.** Cover the printed page and look only at the web page: for every picture, can you say what it belongs to, and for every note, what it points at? If not, the unit is not done, however many fields were set and however clean the findings list is. A review that changes little on a page the learner called unreadable has failed; say so instead of reporting completion.

## Two kinds of page design

Decide this first for every group of pictures; the two need opposite treatment.

- **Typeset composition.** The designer arranged printed text blocks and pictures: a map with inset photos and captions, a grid of products, a picture beside its paragraph. The text is type, so it must be transcribed, translated and readable as text. **Rebuild the arrangement in HTML** so it reflows.
- **Hand-annotated cluster.** The author drew or wrote on the page by hand: a sketch with hand-written labels and leader lines, a reference photo pasted beside it with a scribbled note, arrows and circles drawn across pictures. The handwriting and lines are part of the drawing, and no HTML layout keeps a hand-drawn line attached to the stroke it points at. **Keep the whole cluster as one picture**, handwriting, lines and pasted photos included, and list the transcribed notes with their translations under it, in the order they read on the page. When the handwriting is already in the reader's language (a translated edition that re-letters the notes in the picture), nothing needs listing: the picture carries them. Do not cut the sketch, the photos and the notes into separate figures, and do not crop the handwriting off and retype it as a caption: that leaves lines pointing at nothing.

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

## Procedure

Work through one unit completely before starting the next.

1. **Read the printed pages first.** Open the overview, then every large page. For each page, write down the picture groups (pictures that belong together; unrelated to the `group` field of the crop record): which pictures belong together, and what the page uses to say so (leader lines, numbers, a frame or tinted box, a picture set beside its note, items scattered around a title, arrows between steps, a before-and-after pair, rows and columns, hand-written notes and lines).
2. **Find each group on the web page.** Open the 1440 px tiles and apply the reader test above to each group.
3. **Give every group one verdict** and write it down before changing anything:

   | Verdict | When | What the page should do |
   | --- | --- | --- |
   | keep | An independent illustration that reads on its own | Nothing |
   | cluster | Hand-annotated: sketch, pasted photos, hand-written notes, drawn lines or arrows | One picture of the whole cluster; its notes transcribed and translated underneath, in page order |
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
- fix transcription or translation in this pass (see the table at the top). A stroke or label that no crop includes is a crop fault, and you do fix that.

## Several agents on one book

Give each agent its own working copy (a git worktree with its own scratch folder and local config) and a fixed list of units; they must not share helper-script names in a common scratch folder. Agents commit locally and never publish. The main session takes from each branch only the source data, images and notes of the units that agent finished, then regenerates what is derived (the pages; and the crop record when the project's script writes it from the source data, otherwise the crop record is merged entry by entry and never overwritten whole) once, runs verification and the crop audit on the merged result, and publishes. Derived files are never merged by hand. A generator that stores computed values only in the derived record must carry them over for entries a partial run does not touch.

## Report

Tell the learner, per unit: the groups found, each verdict, what changed, what stays open and why, which widths were checked by screenshot, and the result of the reader test in plain words, including where it still fails.
