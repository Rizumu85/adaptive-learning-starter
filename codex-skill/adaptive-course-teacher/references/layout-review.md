# Layout Review of a Reading Edition

Use when a learner says pictures in a reading edition are hard to interpret, too small, or cut loose from their text; when checking an edition another agent built; and before publishing any book whose pages are designed spreads (magazines, art books, guides, catalogues). The rule this enforces is in `book-learning.md` ("Read each page's layout before cutting it up").

The printed page is the specification. It says which pictures belong together and to which text. The web page must say the same thing at desktop, tablet and phone width. The text itself does not change in a layout review.

## Material

For one unit at a time:

```
python <skill>/assets/layout-review/layout_review.py --page local-reading/<unit>.html \
    --out work/qa/layout/<unit> --pdf <source.pdf> --pdf-pages <first>-<last>
```

It writes the printed pages as spreads (`book-NN.png`), the web page at 1440, 820 and 390 px in tiles (`w1440-NN.png` and so on), and `report.json` with findings: `small-alone` (a picture under 40% of the column with nothing beside it), `narrow-caption` (a caption under 220 px), `overflow`. Use `--images "<pattern with {page}>"` instead of `--pdf` when the source is page images. The sheets are whole-page renders: `--out` must be an ignored working folder, never the published reader.

The findings are where to start looking, not the verdict. A small picture alone can be right, and a broken composition can have no finding at all.

## Procedure

Work through one unit completely before starting the next.

1. **Read the printed pages first.** Open every `book-NN.png`. For each page, write down the groups: which pictures belong together, and what the page uses to say so (leader lines, numbers, a frame or tinted box, a picture set beside its note, items scattered around a title, arrows between steps, a before-and-after pair, rows and columns).
2. **Find each group on the web page.** Open the 1440 px tiles. For every group from step 1, check whether a reader can still tell that these pictures belong together and to which text.
3. **Give every group one verdict** from this list, and write it down before changing anything:

   | Verdict | When | What the page should do |
   | --- | --- | --- |
   | keep | The picture is an independent illustration and reads on its own | Nothing |
   | beside | A small picture belongs to one note or caption | Picture beside that text; stacked on a phone |
   | grid | Several sibling items, each with its own label | One cell per item, label under it |
   | around | A central picture with callouts or insets tied to places on it | Central picture with its entries in columns beside it on wide screens and below it on narrow ones; matching markers on the picture and on each entry |
   | steps, compare, table | A sequence, a pair, or rows and columns | The generator's step, comparison or table layout |
   | new layout needed | None of the above keeps the relation | Stop for this group; see "When nothing fits" |

4. **Apply the verdict through the project's generator.** Tag the source data with the layout fields the project already has (its `AGENTS.md` or `NOTES.md` lists them). Do not edit generated HTML, do not change any text, and do not recrop pictures in this pass.
5. **Rebuild, run the project's verification, and run the tool again.** Open the tiles at all three widths beside the book sheet. Accept the unit when:
   - every picture shows what it belongs to, at every width;
   - no caption is under 220 px outside a grid;
   - nothing is wider than the screen;
   - on the phone, a picture that stacks sits directly above or below its own text;
   - pages of other units changed only in their stylesheet version, if at all.
6. **Record and commit per unit.** In `NOTES.md`, one line per group: pages, figure ids, verdict, fields used. Then the open list from "When nothing fits".

## Markers in place of leader lines

Lines cannot follow a layout that reflows, so an "around" composition uses markers: the same letter on the picture and at the start of its entry. Use letters when the book already numbers things, so the two do not collide. Markers are layout, not book text; say so in `NOTES.md`. Keep them flat and quiet: translucent paper-coloured fill, a thin accent border, solid letter, no glow or shadow.

Place each marker on the point where the printed line starts, as a percentage of the picture's width and height. Measure on a copy of the picture with a 10% grid drawn over it, then check the screenshot: every marker must sit on its line's origin. Entries keep the book's order and side.

## When nothing fits

Do not force a composition into a layout that changes its meaning, and do not replace it with a scan of the whole page. Leave that group as it is, and add it to an open list in `NOTES.md`: unit, pages, figure ids, what the page ties together and how. Then go on with the other groups. A new layout in the generator is a separate task for a stronger model or the next session: it has to hold at all three widths, be named, and be recorded with its fields.

The same applies to marker positions you cannot measure with confidence: list the composition as open instead of guessing.

## Do not

- enlarge a small picture to fill the column to make it "readable"; it needs its companions or its text, not size;
- add explanations, numbering or headings the book does not have (markers excepted, as above);
- move text out of the book's reading order, apart from keeping a composition's entries together;
- mark a unit done from the findings list alone, without opening the printed pages and the screenshots.

## Report

Tell the learner, per unit: how many groups were reviewed, how many changed and into what, how many stay open and why, and which widths were checked by screenshot.
