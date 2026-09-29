"""Automatic checks for figures cropped from book pages.

A crop is usually cut by a program from coordinates an AI chose. The program is exact; the
coordinates are where mistakes happen. This tool flags the few crops worth a human or model
look, so nobody has to inspect hundreds of them:

* clipped   - a printed line crosses the crop edge: ink on the edge keeps going well outside it,
              so a fingertip, leader line, label or a line of body text is cut. A box that trims a
              few pixels off a photograph's edge is not reported.
* overlap   - two crops of the same document on the same page overlap and this crop's output still
              shows ink from the shared area, usually a piece of the neighbouring figure (give figures
              a `group` when several documents reuse one page).
* near-empty- the output has almost no ink, so the box probably sits in the wrong place.

It never changes a crop. Flagged crops get a review sheet: the page around the box, the box in
teal, suspected cuts in red.

Command line, reading the project's crop record (see "Crop Record" in media-workflow.md):
    python crop_audit.py local-reading/crops.json [--sheets work/qa/crop-audit] [--only ID ...]
crops.json: {"unit": 1000, "pages": "<page image pattern with {page}>", "crops": [{"id", "page",
"bounds", "exclude"?, "transparent"?, "output"?, "group"?, "audit_ok"?}, ...]}, paths relative to the file.
audit_ok lists findings already reviewed and kept on purpose: 'clipped:top|bottom|left|right',
'overlap', 'near-empty'.
A spread with "parts": [{"page", "bounds", "exclude"?}, ...] is checked page by page for cut lines.
Entries without a single page and box (whole pages, hand-drawn outlines, other sources) are listed as
not checked.

From Python, for a project made before the crop record existed (a short adapter reads its own data):
    issues = audit(figures, unit=1000, sheets='work/qa/crop-audit')
where each figure is a dict: id, page (path to the page image), bounds, optional exclude, image
(output path), group and accepted (same meaning as audit_ok).
Exit code 1 when anything is flagged.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

INK = 170          # page luminance below this counts as printed line work or text (not tinted backgrounds)
BAND = 6           # a crossing line must show ink within this many pixels outside the edge
FAR = 18           # ...and still within BAND+1..FAR pixels, so a few pixels of photo edge do not count
MIN_HITS = 3       # edge pixels that must cross before a side is reported
FAINT = 235        # for near-empty: pale pencil counts as drawing
MIN_INK = 0.003    # share of the crop that must be drawing, or it is reported as near-empty
MIN_SHARED_INK = 150  # ink pixels of a shared area visible in both crops before it matters
MARGIN = 0.12      # context around the box on review sheets, as a share of the box size


def _px(bounds, page, unit):
    scale = page.width / unit if unit else 1
    return tuple(round(v * scale) for v in bounds)


def _inside(x, y, boxes):
    return any(a <= x < c and b <= y < d for a, b, c, d in boxes)


def clipped(gray, box, excluded, others):
    """Sides where ink on the box edge continues outside it: [(side, hits, [(x, y), ...], neighbour)]."""
    x0, y0, x1, y1 = box
    w, h = gray.size
    px = gray.load()
    ink = lambda x, y: 0 <= x < w and 0 <= y < h and px[x, y] < INK
    sides = {
        'top': ([(x, y0) for x in range(x0, x1)], (0, -1)),
        'bottom': ([(x, y1 - 1) for x in range(x0, x1)], (0, 1)),
        'left': ([(x0, y) for y in range(y0, y1)], (-1, 0)),
        'right': ([(x1 - 1, y) for y in range(y0, y1)], (1, 0)),
    }
    found = []
    for side, (edge, (dx, dy)) in sides.items():
        hits = []
        for x, y in edge:
            if _inside(x, y, excluded) or not ink(x, y):
                continue
            if (any(ink(x + dx * k, y + dy * k) for k in range(1, BAND + 1))
                    and any(ink(x + dx * k, y + dy * k) for k in range(BAND + 1, FAR + 1))):
                hits.append((x, y))
        if len(hits) >= MIN_HITS:
            # Ink that runs into another crop on the page usually means the two figures touch.
            neighbour = next((oid for oid, obox in others
                              if any(_inside(x + dx * BAND, y + dy * BAND, [obox]) for x, y in hits)), None)
            found.append((side, len(hits), hits, neighbour))
    return found


def ink_share(path):
    with Image.open(path) as image:
        rgba = image.convert('RGBA')
    gray = rgba.convert('L').load()
    alpha = rgba.getchannel('A').load()
    w, h = rgba.size
    step = max(1, (w * h) // 400_000)  # sample large crops
    total = inked = 0
    for i in range(0, w * h, step):
        x, y = i % w, i // w
        total += 1
        inked += alpha[x, y] > 0 and gray[x, y] < FAINT
    return inked / total if total else 0


def _covered(area, excluded):
    return any(a <= area[0] and b <= area[1] and c >= area[2] and d >= area[3] for a, b, c, d in excluded)


def _visible(fig, box, area, page, unit):
    """Mask of `area` that is opaque in the figure's output, or None when there is no output to read."""
    path = fig.get('image')
    if path and Path(path).is_file():
        with Image.open(path) as out:
            alpha = out.convert('RGBA').getchannel('A')
        if alpha.size == (box[2] - box[0], box[3] - box[1]):
            local = (area[0] - box[0], area[1] - box[1], area[2] - box[0], area[3] - box[1])
            return alpha.crop(local).point(lambda v: 255 if v else 0)
    mask = Image.new('L', (area[2] - area[0], area[3] - area[1]), 255)
    draw = ImageDraw.Draw(mask)
    for b in fig.get('exclude', []):
        x0, y0, x1, y1 = _px(b, page, unit)
        draw.rectangle((x0 - area[0], y0 - area[1], x1 - area[0] - 1, y1 - area[1] - 1), fill=0)
    return mask


def sheet(page, box, marks, path, note):
    x0, y0, x1, y1 = box
    mx, my = round((x1 - x0) * MARGIN) + 20, round((y1 - y0) * MARGIN) + 20
    view = (max(0, x0 - mx), max(0, y0 - my), min(page.width, x1 + mx), min(page.height, y1 + my))
    image = page.crop(view).convert('RGB')
    draw = ImageDraw.Draw(image)
    ox, oy = view[:2]
    draw.rectangle((x0 - ox, y0 - oy, x1 - ox - 1, y1 - oy - 1), outline=(20, 125, 143), width=3)
    for x, y in marks:
        draw.ellipse((x - ox - 5, y - oy - 5, x - ox + 5, y - oy + 5), outline=(200, 40, 30), width=2)
    draw.rectangle((0, 0, image.width, 30), fill=(247, 245, 239))
    draw.text((8, 8), note, fill=(0, 0, 0))
    image.thumbnail((1400, 1400))
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, quality=85)


def audit(figures, unit=1000, sheets=None):
    """Return a list of issues: {'id', 'kind', 'detail'}; write review sheets when `sheets` is a folder."""
    issues = []
    by_page = {}
    for f in figures:
        by_page.setdefault(str(f['page']), []).append(f)
    for page_path, group in by_page.items():
        with Image.open(page_path) as source:
            page = source.convert('RGB')
        gray = page.convert('L')
        boxes = {f['id']: _px(f['bounds'], page, unit) for f in group}
        for f in group:
            box = boxes[f['id']]
            excluded = [_px(b, page, unit) for b in f.get('exclude', [])]
            others = [(oid, obox) for oid, obox in boxes.items() if oid != f['id']]
            marks, notes = [], []
            for side, hits, points, neighbour in clipped(gray, box, excluded, others):
                if f'clipped:{side}' in f.get('accepted', ()):
                    continue
                detail = f'{side} edge crosses ink at {hits} px' + (f' (runs into {neighbour})' if neighbour else '')
                issues.append({'id': f['id'], 'kind': 'clipped', 'detail': detail})
                marks += points[:: max(1, len(points) // 40)]
                notes.append(detail)
            # Two crops that overlap are a problem only when both outputs still show ink from the shared
            # area: that ink belongs to one figure, so the other carries a fragment of it.
            for other in group:
                if other['id'] <= f['id'] or other.get('group') != f.get('group'):
                    continue
                if 'overlap' in f.get('accepted', ()) or 'overlap' in other.get('accepted', ()):
                    continue
                obox = boxes[other['id']]
                area = (max(box[0], obox[0]), max(box[1], obox[1]), min(box[2], obox[2]), min(box[3], obox[3]))
                if area[0] >= area[2] or area[1] >= area[3]:
                    continue
                ink_area = gray.crop(area).point(lambda v: 255 if v < INK else 0)
                both = ink_area
                for fig, fbox in ((f, box), (other, obox)):
                    seen = _visible(fig, fbox, area, page, unit)
                    if seen is not None:
                        both = ImageChops.multiply(both, seen)
                shown = both.histogram()[255]
                if shown >= MIN_SHARED_INK:
                    detail = f'overlaps {other["id"]}; {shown} ink px of the shared area show in both crops'
                    issues.append({'id': f['id'], 'kind': 'overlap', 'detail': detail})
                    notes.append(detail)
            if f.get('image') and Path(f['image']).is_file():
                share = ink_share(f['image'])
                if share < MIN_INK and 'near-empty' not in f.get('accepted', ()):
                    detail = f'only {share:.2%} ink in the output'
                    issues.append({'id': f['id'], 'kind': 'near-empty', 'detail': detail})
                    notes.append(detail)
            if notes and sheets:
                sheet(page, box, marks, Path(sheets) / f'{f["id"]}.jpg', f'{f["id"]}: ' + '; '.join(notes))
    return issues


def load_record(path):
    """Figures for audit() from a crops.json crop record, plus the ids it cannot check."""
    path = Path(path).resolve()
    data = json.loads(path.read_text(encoding='utf-8'))
    figures, skipped = [], []
    for crop in data['crops']:
        base = {'exclude': crop.get('exclude', []), 'group': crop.get('group'), 'accepted': crop.get('audit_ok', [])}
        page_of = lambda page: str(path.parent / data['pages'].format(page=page))
        if crop.get('parts'):
            # A spread joined from several pages: check each page's box for cut lines; the joined
            # output cannot be compared with one page, so it is not read.
            for i, part in enumerate(crop['parts']):
                figures.append({**base, 'id': f'{crop["id"]}#{i + 1}', 'page': page_of(part['page']),
                                'bounds': part['bounds'], 'exclude': part.get('exclude', []), 'image': None})
        elif crop.get('bounds') and isinstance(crop.get('page'), int):
            figures.append({**base, 'id': crop['id'], 'bounds': crop['bounds'], 'page': page_of(crop['page']),
                            'image': str(path.parent / crop['output']) if crop.get('output') else None})
        else:
            skipped.append(crop['id'])  # whole pages, hand-drawn outlines, other sources
    return figures, data.get('unit', 1000), skipped


def main():
    if len(sys.argv) < 2 or sys.argv[1].startswith('-'):
        sys.exit(__doc__)
    figures, unit, skipped = load_record(sys.argv[1])
    if '--only' in sys.argv:
        rest = sys.argv[sys.argv.index('--only') + 1:]
        wanted = set(rest[:next((i for i, a in enumerate(rest) if a.startswith('--')), len(rest))])
        groups = {f['group'] for f in figures if f['id'] in wanted}
        # keep the neighbours on the same pages so overlaps are still checked
        figures = [f for f in figures if f['id'] in wanted or f['group'] in groups]
    sheets = sys.argv[sys.argv.index('--sheets') + 1] if '--sheets' in sys.argv else None
    missing = sorted({f['page'] for f in figures if not Path(f['page']).is_file()})
    if missing:
        sys.exit(f'Page images not found (render them first): {missing[:3]}')
    issues = audit(figures, unit, sheets)
    for issue in issues:
        print(f'{issue["kind"]:10} {issue["id"]}: {issue["detail"]}')
    print(f'{len(figures)} crops checked, {len({i["id"] for i in issues})} flagged'
          + (f'; not checked (no single page box): {", ".join(skipped)}' if skipped else ''))
    sys.exit(1 if issues else 0)


if __name__ == '__main__':
    main()
