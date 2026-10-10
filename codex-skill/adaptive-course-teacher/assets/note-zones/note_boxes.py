"""Find where each transcribed note sits on a picture, from an OCR draft of the page.

A picture with many hand-written notes is kept as one image, and each note becomes a zone on it (see README.md).
A zone needs a box around the note's writing. This tool proposes the boxes: it pairs the OCR lines that fall inside
the picture with the notes already transcribed for it, by text, and says how sure it is. Every box is still looked at
on the check sheet before it is written into the page data.

    python note_boxes.py work/ocr/p0038.json --bounds 54 95 950 705 --notes notes.json --out boxes.json
    python note_boxes.py work/ocr/p0038.json --bounds 54 95 950 705 --notes notes.json --sheet check.png --page page.png

The OCR draft is the JSON `ocr/ocr_draft.py` writes ({"lines": [{"text", "box"}]}, boxes on a page 1000 units wide).
Render the page at 2300 px wide or more before recognising it: handwriting on a small scan is not found otherwise.
`--bounds` is the picture's box on the page in the same units. `--notes` is a JSON file, either {"id": "text", ...}
or [{"id": ..., "text": ...}, ...], in reading order. `--exclude x0 y0 x1 y1` (repeatable) leaves out a region inside
the picture, such as a printed label the crop also leaves out. `--boxes boxes.json` draws boxes already decided
({"id": [x0, y0, x1, y1]} or {"id": [[...], ...]}) on the sheet instead of pairing again.

Output, per note: `verdict`, `box` (the union of its lines, or null), `more` (further boxes, where the same label
was read again elsewhere on the picture) and the lines it was given.

    auto      text and size agree: at least one line read as part of the note, and the characters found add up to
              about the note's length. Accept after a glance at the sheet.
    doubtful  something was found but not enough: too few characters (a line was probably missed), a weak or tied
              text match, or lines taken only because nothing else claimed them. Look, then accept or redraw.
    none      nothing found. Draw the box on the sheet's grid by hand.

How lines are paired:
1. A line belongs to the note that contains the largest share of its characters in order, when that is at least
   half of them. Lines of one note must sit together (within about a line space); a line far from the note's other
   lines is not taken.
2. A line the engine could not read, right next to a line already paired, joins that note when the note still has
   characters unaccounted for (handwriting often yields one readable line and one unreadable one).
3. Notes still without a line take a weakly matching leftover line, marked doubtful.

A whole book at once, with nobody looking (`--batch`): pair every picture listed in a figures file and keep only
the boxes that pass a stricter test than `auto`, so that they can be written into the data unseen. A box is kept
when every line of it was read as part of the note, the characters read agree with the note almost completely
(all of them for a note of three characters or fewer), and no other note on the picture shares its text. What is
not kept is listed, picture by picture, most missing first: that list is what is left to do by hand, when someone
asks for a page. Missing some notes is fine; the reader shows a picture with only some of its notes placed.

    python note_boxes.py --batch figures.json --ocr-dir work/ocr --out boxes.json --report report.json

figures.json: [{"figure": "id", "page": "p0038", "bounds": [x0, y0, x1, y1], "exclude": [[...]],
"notes": [{"id": "...", "text": "..."}]}], where "page" names the OCR file (work/ocr/p0038.json).
boxes.json: {"note id": [x0, y0, x1, y1]} for the boxes kept ([[...], [...]] for a label written in several places). Writing them into the data of the book is left to the
book: page data differs from one book to the next.

The check sheet (`--sheet`, needs Pillow and the rendered page as `--page`) shows the picture enlarged with a grid
every 10 units, labelled every 50, the proposed boxes in green (auto) or orange (doubtful) with the note's place in
the list, and unclaimed OCR lines in blue.
"""
import argparse
import difflib
import json
import sys
import unicodedata
from pathlib import Path

STRONG = 0.5   # share of a line's characters that must be found in the note for a text match
WEAK = 0.2     # the same for the last pass, which only serves notes that have nothing yet
COVER = 0.3    # share of the note's characters that the text-matched lines must account for
AGREE = 0.85   # batch mode: share of the characters (the note's or those read, whichever is more) that must agree


def norm(text):
    """Letters and digits only, width and compatibility forms folded: punctuation and spacing are not evidence."""
    return ''.join(c for c in unicodedata.normalize('NFKC', text) if c.isalnum()).lower()


def shared(line, note):
    """How many of the line's characters appear in the note, in order."""
    if not line or not note:
        return 0
    matcher = difflib.SequenceMatcher(None, line, note, autojunk=False)
    return sum(block.size for block in matcher.get_matching_blocks())


def inside(box, region):
    cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
    return region[0] <= cx <= region[2] and region[1] <= cy <= region[3]


def beside(a, b, gap=0.6):
    """Two line boxes that read as one note: stacked with a gap of at most `gap` line heights, or two pieces of
    one line. A box inside the other also counts."""
    ha, hb = a[3] - a[1], b[3] - b[1]
    wa, wb = a[2] - a[0], b[2] - b[0]
    x_overlap = min(a[2], b[2]) - max(a[0], b[0])
    y_overlap = min(a[3], b[3]) - max(a[1], b[1])
    # vertical writing is tall and narrow; its "line height" is its width
    size = min(min(ha, wa), min(hb, wb))
    if x_overlap > 0 and y_overlap >= -gap * size:
        return True
    return y_overlap > 0.5 * min(ha, hb) and x_overlap > -0.5 * size


def union(boxes):
    return [min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)]


def room(expected, found):
    """The most characters a note of this length can plausibly have been read as."""
    return expected + max(1, 0.6 * expected) - found


def pair(lines, bounds, notes, exclude=()):
    """Pair OCR lines with notes. `lines`: [{"text", "box"}]; `notes`: [{"id", "text"}] in reading order.
    Returns {"notes": [...], "unassigned": [...], "summary": {...}}."""
    wanted = [{'id': n['id'], 'text': norm(n['text']), 'lines': [], 'more': []} for n in notes]
    pool = [{'text': l['text'], 'norm': norm(l['text']), 'box': [float(v) for v in l['box']], 'note': None, 'how': None}
            for l in lines if inside(l['box'], bounds) and not any(inside(l['box'], region) for region in exclude)]

    def found(note):
        return sum(len(l['norm']) for l in note['lines'])

    def fits(line, note):
        # a line that reads as part of the note may sit a full line space from the others; an unread line may not
        return not note['lines'] or any(beside(line['box'], other['box'], 1.2) for other in note['lines'])

    def give(line, note, how):
        line['note'], line['how'] = note['id'], how
        note['lines'].append(line)

    def text_pass(threshold, how, only_empty):
        scored = []
        for line in pool:
            if line['note'] or not line['norm']:
                continue
            for note in wanted:
                same = shared(line['norm'], note['text'])
                if same and same / len(line['norm']) >= threshold:
                    scored.append((same, same / len(line['norm']), line, note))
        scored.sort(key=lambda item: (-item[0], -item[1]))
        for same, share, line, note in scored:
            if line['note'] or (only_empty and note['lines'] and note['lines'][0]['how'] != how):
                continue
            if not fits(line, note) or len(line['norm']) > room(len(note['text']), found(note)):
                continue
            # another note that could equally take this line makes the match a guess
            rivals = [n for s, r, l, n in scored if l is line and n is not note and (s, r) == (same, share) and fits(line, n)]
            give(line, note, 'tied' if rivals else how)

    def adopt():
        changed = True
        while changed:
            changed = False
            for line in pool:
                if line['note']:
                    continue
                takers = [n for n in wanted if n['lines'] and any(beside(line['box'], other['box']) for other in n['lines'])
                          and len(line['norm']) <= room(len(n['text']), found(n))]
                if not takers:
                    continue
                best = max(takers, key=lambda n: room(len(n['text']), found(n)))
                give(line, best, 'adjacent' if len(takers) == 1 else 'adjacent-tied')
                changed = True

    text_pass(STRONG, 'text', only_empty=False)
    adopt()
    # the same label written again elsewhere on the picture (floor plans repeat theirs): every place it was read
    # exactly is a box of this note. Claimed now, so that the weak pass cannot hand such a line to another note.
    for note in wanted:
        if note['text'] and note['lines'] and all(l['how'] == 'text' for l in note['lines']) and ''.join(
                l['norm'] for l in sorted(note['lines'], key=lambda l: (l['box'][1], l['box'][0]))) == note['text']:
            for line in pool:
                if not line['note'] and line['norm'] == note['text']:
                    line['note'], line['how'] = note['id'], 'again'
                    note['more'].append([round(max(line['box'][0], bounds[0]), 1), round(max(line['box'][1], bounds[1]), 1),
                                         round(min(line['box'][2], bounds[2]), 1), round(min(line['box'][3], bounds[3]), 1)])
    text_pass(WEAK, 'weak', only_empty=True)
    adopt()

    result = []
    for note in wanted:
        chosen = note['lines']
        if not chosen:
            result.append({'id': note['id'], 'verdict': 'none', 'strict': False, 'box': None, 'more': [], 'lines': [], 'expected': len(note['text']), 'found': 0})
            continue
        expected = len(note['text'])
        count = found(note)
        matched = shared(''.join(l['norm'] for l in sorted((l for l in chosen if l['how'] == 'text'), key=lambda l: (l['box'][1], l['box'][0]))), note['text'])
        sure = (all(l['how'] in ('text', 'adjacent') for l in chosen) and matched >= COVER * expected
                and expected - max(1, 0.3 * expected) <= count <= expected + max(1, 0.6 * expected))
        box = union([l['box'] for l in chosen])
        # engines pad their boxes; a zone must lie inside the picture
        box = [max(box[0], bounds[0]), max(box[1], bounds[1]), min(box[2], bounds[2]), min(box[3], bounds[3])]
        # strict: good enough to write into the data with nobody looking (batch mode)
        agreed = sum(shared(l['norm'], note['text']) for l in chosen)
        alone = not any(other is not note and other['text'] and (note['text'] in other['text'] or other['text'] in note['text']) for other in wanted)
        strict = (sure and alone and all(l['how'] == 'text' for l in chosen)
                  and agreed >= (expected if expected <= 3 else AGREE * max(expected, count)) and count <= expected + (0 if expected <= 3 else 1))
        more = note['more']
        result.append({'id': note['id'], 'verdict': 'auto' if sure else 'doubtful', 'strict': strict, 'box': [round(v, 1) for v in box], 'more': more,
                       'lines': [{'text': l['text'], 'box': l['box'], 'how': l['how']} for l in chosen], 'expected': expected, 'found': count})
    summary = {key: sum(r['verdict'] == key for r in result) for key in ('auto', 'doubtful', 'none')}
    return {'bounds': list(bounds), 'notes': result,
            'unassigned': [{'text': l['text'], 'box': l['box']} for l in pool if not l['note']], 'summary': summary}


def batch(figures, ocr_dir):
    """Pair every picture in `figures` and keep only the strict boxes. Returns (boxes, report)."""
    boxes = {}
    rows = []
    cache = {}
    for figure in figures:
        page = figure['page']
        if page not in cache:
            path = Path(ocr_dir) / f'{page}.json'
            cache[page] = json.loads(path.read_text(encoding='utf-8'))['lines'] if path.exists() else None
        if cache[page] is None:
            rows.append({'figure': figure['figure'], 'page': page, 'notes': len(figure['notes']), 'placed': 0,
                         'missing': [n['id'] for n in figure['notes']], 'problem': 'no OCR draft for this page'})
            continue
        proposal = pair(cache[page], figure['bounds'], figure['notes'], figure.get('exclude', []))
        kept = [n for n in proposal['notes'] if n['strict']]
        for note in kept:
            boxes[note['id']] = [note['box']] + note['more'] if note['more'] else note['box']
        rows.append({'figure': figure['figure'], 'page': page, 'notes': len(figure['notes']), 'placed': len(kept),
                     'missing': [n['id'] for n in proposal['notes'] if not n['strict']]})
    rows.sort(key=lambda row: (-len(row['missing']), row['figure']))
    report = {'figures': len(rows), 'notes': sum(r['notes'] for r in rows), 'placed': sum(r['placed'] for r in rows),
              'figures_complete': sum(not r['missing'] for r in rows), 'figures_untouched': sum(r['placed'] == 0 for r in rows),
              'by_figure': rows}
    return boxes, report


def read_notes(path):
    data = json.loads(Path(path).read_text(encoding='utf-8'))
    if isinstance(data, dict):
        return [{'id': key, 'text': value} for key, value in data.items()]
    return [{'id': item['id'], 'text': item['text']} for item in data]


def sheet(page_image, bounds, proposal, out, decided=None, margin=6):
    """Draw the check sheet: the picture's part of the page, enlarged, with a grid and the boxes."""
    from PIL import Image, ImageDraw, ImageFont
    with Image.open(page_image) as source:
        image = source.convert('RGB')
    unit = image.width / 1000
    x0, y0 = max(0, bounds[0] - margin), max(0, bounds[1] - margin)
    x1, y1 = min(1000, bounds[2] + margin), min(image.height / unit, bounds[3] + margin)
    crop = image.crop((round(x0 * unit), round(y0 * unit), round(x1 * unit), round(y1 * unit)))
    zoom = max(1.0, min(4.0, 2200 / crop.width))
    crop = crop.resize((round(crop.width * zoom), round(crop.height * zoom)), Image.Resampling.LANCZOS)
    scale = unit * zoom
    draw = ImageDraw.Draw(crop, 'RGBA')
    try:
        font = ImageFont.truetype('arial.ttf', 22)
    except OSError:
        font = ImageFont.load_default()
    px = lambda v: (v - x0) * scale
    py = lambda v: (v - y0) * scale
    for start, stop, vertical in ((x0, x1, True), (y0, y1, False)):
        v = int(start // 10 * 10)
        while v <= stop:
            if v >= start:
                big = v % 50 == 0
                colour = (0, 120, 0, 150 if big else 40)
                if vertical:
                    draw.line([px(v), 0, px(v), crop.height], fill=colour, width=2 if big else 1)
                else:
                    draw.line([0, py(v), crop.width, py(v)], fill=colour, width=2 if big else 1)
                if big:
                    draw.text((px(v) + 3, 2) if vertical else (3, py(v) + 2), str(v), fill=(0, 100, 0, 255), font=font)
            v += 10

    def frame(box, colour, label, width=3):
        draw.rectangle([px(box[0]), py(box[1]), px(box[2]), py(box[3])], outline=colour, width=width)
        if label:
            draw.text((px(box[0]) + 3, py(box[3]) + 1), label, fill=colour, font=font)

    if decided is not None:
        for number, (key, boxes) in enumerate(decided.items(), 1):
            for box in (boxes if boxes and isinstance(boxes[0], (list, tuple)) else [boxes]):
                frame(box, (220, 0, 0, 255), str(number))
    else:
        for line in proposal['unassigned']:
            frame(line['box'], (0, 60, 255, 200), '', width=2)
        for number, note in enumerate(proposal['notes'], 1):
            for box in ([note['box']] + note['more'] if note['box'] else []):
                frame(box, (0, 140, 60, 255) if note['verdict'] == 'auto' else (235, 120, 0, 255), f'{number} {note["verdict"]}')
    crop.save(out)
    return crop.size


def main(argv=None):
    parser = argparse.ArgumentParser(description='Propose a box on the picture for each transcribed note.')
    parser.add_argument('ocr', nargs='?', help='page JSON written by ocr_draft.py')
    parser.add_argument('--bounds', nargs=4, type=float, metavar=('X0', 'Y0', 'X1', 'Y1'))
    parser.add_argument('--notes', help='JSON: {"id": "text"} or [{"id", "text"}], in reading order')
    parser.add_argument('--batch', help='figures file: pair every picture in it and keep only the strict boxes')
    parser.add_argument('--ocr-dir', help='with --batch: the folder of OCR drafts, one <page>.json each')
    parser.add_argument('--report', help='with --batch: write the per-picture report here')
    parser.add_argument('--exclude', nargs=4, type=float, action='append', default=[], metavar=('X0', 'Y0', 'X1', 'Y1'))
    parser.add_argument('--out', help='write the proposal here (default: standard output)')
    parser.add_argument('--sheet', help='write a check sheet (PNG) here; needs --page')
    parser.add_argument('--page', help='the rendered page image the OCR ran on')
    parser.add_argument('--boxes', help='boxes already decided, to draw on the sheet instead of the proposal')
    args = parser.parse_args(argv)
    if args.batch:
        if not args.ocr_dir or not args.out:
            parser.error('--batch needs --ocr-dir and --out')
        boxes, report = batch(json.loads(Path(args.batch).read_text(encoding='utf-8')), args.ocr_dir)
        Path(args.out).write_text(json.dumps(boxes, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        if args.report:
            Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        print(f'{report["figures"]} pictures, {report["notes"]} notes: {report["placed"]} placed; '
              f'{report["figures_complete"]} pictures complete, {report["figures_untouched"]} with none', file=sys.stderr)
        return
    if not args.ocr or not args.bounds or not args.notes:
        parser.error('one picture needs the OCR draft, --bounds and --notes')
    lines = json.loads(Path(args.ocr).read_text(encoding='utf-8'))['lines']
    proposal = pair(lines, args.bounds, read_notes(args.notes), args.exclude)
    text = json.dumps(proposal, ensure_ascii=False, indent=1)
    if args.out:
        Path(args.out).write_text(text + '\n', encoding='utf-8')
    else:
        sys.stdout.reconfigure(encoding='utf-8')
        print(text)
    if args.sheet:
        if not args.page:
            parser.error('--sheet needs --page')
        decided = json.loads(Path(args.boxes).read_text(encoding='utf-8')) if args.boxes else None
        sheet(args.page, args.bounds, proposal, args.sheet, decided)
    counts = proposal['summary']
    print(f'{len(proposal["notes"])} notes: {counts["auto"]} auto, {counts["doubtful"]} doubtful, {counts["none"]} none', file=sys.stderr)


if __name__ == '__main__':
    main()
