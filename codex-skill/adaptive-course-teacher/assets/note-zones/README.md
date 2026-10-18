# Note zones

A picture that carries many notes (a sketch with hand-written labels and leader lines, a plan with call-outs) stays one image, and each note is a zone on it. The reader points at the writing, taps it or reaches it with Tab, and reads that note's typed original and translation in a card, instead of matching the picture against a list under it. When and why: `references/layout-review.md`, "Notes on the picture".

| File | What it is |
| --- | --- |
| `note-zones.js` | The behaviour. No dependencies, works offline. Copy it into the reader and load it with `defer`, after `image-preview.js` when the page uses the shared preview |
| `note-zones.css` | The styles. Colours and fonts come from custom properties with fallbacks (listed at its top) |
| `note_boxes.py` | Finds the boxes: pairs an OCR draft of the page with the transcribed notes, draws a check sheet, and has a batch mode for a whole book. `python note_boxes.py --help`; the file's docstring has the details |
| `tests/` | Tests of the pairing, on hand-written drafts (no OCR model needed) |

## Data

The fields live on the note (the caption or label block bound to the picture), in the same units as the picture's own `bounds`: page coordinates on a page 1000 units wide.

| Field | On | Meaning |
| --- | --- | --- |
| `note_box: [x0, y0, x1, y1]` | a note | The box round this note's writing on the picture, all its lines |
| `note_boxes: [[...], [...]]` | a note | The same label written in several places: one box each |
| `breakout: true` | the left half of a spread | The spread may reach past the text column on a wide screen (below) |

For a spread, a note's box is in the coordinates of the half the note is bound to.

## What the generator does

1. Turn each box into a percentage of the cropped picture. A crop that trims its paper margin is smaller than `bounds`: use the crop record's canvas and trim sizes. For a spread, percentages are of the two halves side by side.
2. Refuse a box that is not inside the `bounds` of its picture (a build error, and a check in the reader's verifier).
3. Write the zones over the picture and leave the text where it is. The note's text appears once in the page; the card clones it, so text counts and exact-text checks are unchanged.
4. Fold the list when it is no longer needed for reading: with four or more notes placed, those notes go inside the `<details>` and any without a box stay visible after it.

```html
<figure>
  <div class="note-frame">
    <a href="images/room.webp" data-image-preview><img src="images/room.webp" width="672" height="451" alt="..."></a>
    <button type="button" class="note-zone" data-note="n1" aria-label="Note on the picture: (the translation)"
            style="left:61.2%;top:3.1%;width:9.4%;height:8.2%"></button>
    <!-- one button per box; several buttons may share one data-note -->
  </div>
  <figcaption class="note-list">
    <details class="note-details">
      <summary class="note-hint"><span>19 notes on the picture: point at or tap the writing to read it</span>
        <span class="note-toggle" aria-hidden="true" data-closed="Show the list" data-open="Hide the list"></span></summary>
      <div id="n1"><p class="source" lang="ja">(original)</p><p class="target">(translation)</p></div>
    </details>
  </figcaption>
</figure>
```

- `.note-frame` is exactly as large as the picture, or as the two halves of a spread side by side.
- The element with the note's `id` holds the text; its element children are cloned into the card with their classes, so whatever shows and hides languages on the page does the same in the card.
- A list with class `note-list` (or the attribute `data-note-list`) is linked both ways with the picture.
- An `<a href="#n1">` inside the frame, such as a lettered marker, is another way into that note; give the zones of such a picture `tabindex="-1"`, the markers are already in the Tab order.
- The interface words in the card follow the page language (Chinese when `<html lang>` starts with `zh`, English otherwise); the hint line and its two toggle labels are written by the generator.
- `<body data-note-narrow="720">` moves the width at which the bottom sheet replaces the floating card.

## A long note

The floating card never grows past the room it has. When a note is too long to fit whole beside its zone, the card takes the place with the most room (usually right or left of the zone, the full height of the window below any fixed top bar), is cut there with a quiet fade, and one line under the text says how to read on ("Click the note to read it all", or "Press Enter to read it all" when the zone has keyboard focus). Clicking the zone, or Enter on it, pins the card: it then takes the pointer and its text scrolls with the wheel or a finger, and with the arrow keys, Page Up / Down, Home and End, because Enter (and a click) moves focus into the text. Pointing at other notes on the way to the card does not replace it. Escape, a click outside, or a second click on the zone closes it, and focus goes back to the zone; Tab closes it and goes on from the zone. A tap on a wide touch screen pins it straight away. Short notes are untouched: same place, same card, no pinning on click. The bottom sheet on a phone already scrolls and is unchanged.

The rule for "too long": the card fits in none of the four places at its full height. Below 120 px of room anywhere it falls back to the old rule (on screen, over or under the note), which only happens in a very small window. The classes the script sets on the card are `is-clipped` (cut to fit), `is-held` (pinned, takes the pointer), and `is-more` / `is-above` (more text below / above, which places the fade); a reader that restyles the card should leave `max-height` and `pointer-events` to them.

## A spread wider than the column

A style rule of the reader, not of `note-zones.css`, because it depends on how the reader lays out a spread:

```css
@media (min-width: 1200px) {
  figure.breakout .spread {
    --out: max(100%, min(calc(100vw - 2 * var(--breakout-gutter, 64px)), calc(var(--spread-width) * 1.35), calc(80vh * var(--spread-aspect))));
    width: var(--out);
    margin-inline: calc((100% - var(--out)) / 2);
  }
}
```

`--spread-width` is the pixel width of the two scans together and `--spread-aspect` their width over height. Use `breakout` only when 1.35 times that width is more than the text column, and make the gutter wide enough for whatever the reader fixes to the sides of the window (a contents rail, a return button).

## Finding the boxes

```
python <skill>/assets/ocr/ocr_draft.py --fast "work/pages/p0*.png" work/ocr/      # pages rendered 2300 px wide or more
python note_boxes.py work/ocr/p0038.json --bounds 54 95 950 705 --notes notes.json --sheet check.png --page work/pages/p0038.png
python note_boxes.py --batch figures.json --ocr-dir work/ocr --out boxes.json --report report.json
```

A whole book starts with `--batch`: no model, nobody looking, only boxes read almost character for character, and a report of what is left. The rest is done picture by picture on the check sheet when someone asks for that picture. Writing the boxes into the book's data is the book's own small script, because page data differs from book to book.
