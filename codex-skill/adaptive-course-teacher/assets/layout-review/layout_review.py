"""Material for a layout review of one reading-edition page: the book's own pages laid out as
spreads, the web page at desktop, tablet and phone width, and a list of figures worth a look.

    python layout_review.py --page local-reading/unit-03.html --out work/qa/layout/unit-03 \
        --pdf <source.pdf> --pdf-pages 34-39
    python layout_review.py --page local-reading/unit-03.html --out work/qa/layout/unit-03 \
        --images "work/pages/p{page:04}.png" --pdf-pages 34-39

Writes into --out:
    book-NN.png        the printed pages, two to a row, six to a sheet (page number in the corner)
    pages/pNNNN.png    each printed page on its own, large enough to read handwriting and follow leader lines
    w<width>-NN.png    the web page in 3000 px tall tiles, at each width
    report.json        page heights, tile ranges and findings per width

Findings (see references/layout-review.md for what to do with them):
    small-alone      a picture narrower than 40% of the column with nothing beside it (on a phone, only
                     when it has no caption and no text directly before or after it)
    wordless-run     two or more pictures in a row with no caption or text between them
    row-split        (with --crops) two pictures the crop record places side by side on the printed page
                     are no longer side by side on a wide screen
    cut-frame        (with --crops) two crops whose boxes touch along a whole edge: probably one printed
                     frame cut into pieces
    narrow-caption   a caption squeezed to less than 220 px
    overflow         a picture wider than the screen; pageOverflow means the page scrolls sideways

Survey a whole reader first to see where to start (findings at 1440 px only, no screenshots):
    python layout_review.py --survey local-reading --out work/qa/layout/_survey

The book sheets are whole-page renders: keep --out in an ignored working folder, never in the
published reader. Needs PyMuPDF and Pillow for the sheets, Node 22+ and Chrome or Edge for the
screenshots (layout_shots.mjs, beside this file). Exit code 1 when a width has findings.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

PAGE_WIDTH = 620   # px per printed page on a sheet: enough to see layout, not a reading copy
LARGE_WIDTH = 1400  # px for the single pages: handwriting and thin leader lines stay readable
PER_SHEET = 6


def page_numbers(text):
    numbers = []
    for part in text.split(','):
        first, _, last = part.partition('-')
        first, last = int(first), int(last or first)
        if last < first:
            raise ValueError(f'page range {part.strip()} runs backwards')
        numbers += list(range(first, last + 1))
    return numbers


def printed_pages(args, numbers, out):
    large = out / 'pages'
    large.mkdir(exist_ok=True)
    if args.pdf:
        import pymupdf
        document = pymupdf.open(args.pdf)
        for number in numbers:
            page = document[number - 1]
            scale = LARGE_WIDTH / page.rect.width
            pixmap = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
            image = Image.frombytes('RGB', [pixmap.width, pixmap.height], pixmap.samples)
            image.save(large / f'p{number:04}.png')
            yield number, image.resize((PAGE_WIDTH, round(image.height * PAGE_WIDTH / image.width)), Image.LANCZOS)
    else:
        for number in numbers:
            with Image.open(args.images.format(page=number)) as image:
                image = image.convert('RGB')
                image.resize((LARGE_WIDTH, round(image.height * LARGE_WIDTH / image.width)), Image.LANCZOS).save(large / f'p{number:04}.png')
                yield number, image.resize((PAGE_WIDTH, round(image.height * PAGE_WIDTH / image.width)), Image.LANCZOS)


def book_sheets(args, out):
    pages = list(printed_pages(args, page_numbers(args.pdf_pages), out))
    files = []
    for start in range(0, len(pages), PER_SHEET):
        group = pages[start:start + PER_SHEET]
        height = max(image.height for _, image in group)
        rows = (len(group) + 1) // 2
        sheet = Image.new('RGB', (PAGE_WIDTH * 2, height * rows), 'white')
        draw = ImageDraw.Draw(sheet)
        for i, (number, image) in enumerate(group):
            x, y = (i % 2) * PAGE_WIDTH, (i // 2) * height
            sheet.paste(image, (x, y))
            draw.rectangle([x, y, x + 46, y + 18], fill='white')
            draw.text((x + 4, y + 3), f'p{number}', fill='black')
        name = f'book-{start // PER_SHEET:02}.png'
        sheet.save(out / name)
        files.append(name)
    return files


def printed_arrangement(report, crops_path):
    """Compare where the crop record says pictures sit on the printed page with where they sit on the
    widest captured screen. Useful for plate-like books, where pictures without words are normal and the
    real faults are a printed row turned into a column and one frame cut into several crops."""
    record = json.loads(Path(crops_path).read_text(encoding='utf-8'))
    by_file = {}
    for crop in record.get('crops', []):
        bounds, page, output = crop.get('bounds'), crop.get('page'), crop.get('output')
        if output and bounds and len(bounds) == 4 and not isinstance(page, list):
            by_file[Path(output).name] = (crop.get('id', output), (crop.get('edition'), page), bounds)
    k = record.get('unit', 1000) / 1000  # the tolerances below are in thousandths of the page width
    width = max(report['widths'], key=int)
    shown = {f['file']: f for f in report['widths'][width].get('figures', []) if f['file'] in by_file}
    names = sorted(shown)
    found = []
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            (ida, pa, ba), (idb, pb, bb) = by_file[a], by_file[b]
            if pa != pb:
                continue
            tall = min(ba[3], bb[3]) - max(ba[1], bb[1])
            wide = min(ba[2], bb[2]) - max(ba[0], bb[0])
            beside = tall >= 0.5 * min(ba[3] - ba[1], bb[3] - bb[1]) and wide <= 5 * k
            wa, wb = shown[a], shown[b]
            on_row = wa['y'] < wb['y'] + wb['h'] and wb['y'] < wa['y'] + wa['h']
            if beside and not on_row:
                found.append({'kind': 'row-split', 'id': ida, 'with': idb, 'y': wa['y']})
            gap_x = max(ba[0], bb[0]) - min(ba[2], bb[2])
            gap_y = max(ba[1], bb[1]) - min(ba[3], bb[3])
            # Boxes that abut with no gutter at all; panels of a tight grid keep a gutter of a few units.
            touching_side = -3 * k <= gap_x <= 1.5 * k and tall >= 0.8 * min(ba[3] - ba[1], bb[3] - bb[1])
            touching_stack = -3 * k <= gap_y <= 1.5 * k and wide >= 0.8 * min(ba[2] - ba[0], bb[2] - bb[0])
            if touching_side or touching_stack:
                found.append({'kind': 'cut-frame', 'id': ida, 'with': idb, 'y': wa['y']})
    report['widths'][width]['findings'] += found
    return found


def survey(folder, out, browser):
    """Findings per page of a reader, most first: where a layout review should start."""
    rows = []
    for page in sorted(Path(folder).glob('*.html')):
        target = out / page.stem
        command = ['node', str(Path(__file__).with_name('layout_shots.mjs')), str(page), '--out', str(target),
                   '--widths', '1440', '--findings-only'] + (['--browser', browser] if browser else [])
        problem = None
        for _ in range(2):  # a browser that fails to start once usually starts the second time
            try:
                done = subprocess.run(command, timeout=120, capture_output=True, text=True, errors='replace')
                problem = None if done.returncode == 0 and (target / 'report.json').exists() else                     'failed: ' + (done.stderr or done.stdout).strip().splitlines()[-1:][0] if (done.stderr or done.stdout).strip() else 'failed'
            except subprocess.TimeoutExpired:
                problem = 'timed out'
            if not problem:
                break
        if problem:
            rows.append((-1, page.name, problem))
            continue
        data = json.loads((target / 'report.json').read_text(encoding='utf-8'))['widths']['1440']
        kinds = {}
        for finding in data['findings']:
            kinds[finding['kind']] = kinds.get(finding['kind'], 0) + 1
        rows.append((len(data['findings']), page.name, ', '.join(f'{k} {v}' for k, v in sorted(kinds.items()))
                     + (' PAGE SCROLLS SIDEWAYS' if data['pageOverflow'] else '')))
    rows.sort(reverse=True)
    (out / 'survey.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
    for count, name, detail in rows:
        if count:
            print(f'{count:4}  {name}  {detail}')
    print(f'{len(rows)} pages, {sum(1 for r in rows if r[0] > 0)} with findings, {sum(max(r[0], 0) for r in rows)} findings')


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--page', help='reader page (HTML file or URL)')
    parser.add_argument('--survey', help='folder of reader pages: list findings per page instead of reviewing one')
    parser.add_argument('--out', required=True, help='working folder for the review material (keep it out of the published reader)')
    parser.add_argument('--pdf', help='source PDF of the book')
    parser.add_argument('--images', help='page image pattern with {page}, when there is no PDF')
    parser.add_argument('--pdf-pages', help='page indexes of this unit in the source, e.g. 34-39 or 34-36,40')
    parser.add_argument('--widths', default='1440,820,390')
    parser.add_argument('--browser', help='path to Chrome or Edge when it is not found automatically')
    parser.add_argument('--crops', help='crop record (crops.json): also compare the printed arrangement with the wide screen')
    parser.add_argument('--view', choices=['parallel', 'target', 'source'], help='bilingual reader: capture this view instead of the default one')
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    if args.survey:
        survey(args.survey, out, args.browser)
        return
    if not args.page:
        parser.error('--page or --survey is required')

    if (args.pdf or args.images) and args.pdf_pages:
        print('book sheets:', ', '.join(book_sheets(args, out)), '+ single pages in pages/')
    else:
        print('No --pdf/--images with --pdf-pages given: only the web page is captured; open the printed pages yourself.')

    command = ['node', str(Path(__file__).with_name('layout_shots.mjs')), args.page, '--out', str(out), '--widths', args.widths]
    if args.browser:
        command += ['--browser', args.browser]
    if args.view:
        command += ['--view', args.view]
    result = subprocess.run(command, timeout=240)
    if result.returncode:
        sys.exit(result.returncode)

    report = json.loads((out / 'report.json').read_text(encoding='utf-8'))
    if args.crops:
        printed_arrangement(report, args.crops)
        (out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    flagged = False
    for width, data in report['widths'].items():
        kinds = {}
        for finding in data['findings']:
            kinds.setdefault(finding['kind'], []).append(finding['id'])
        flagged = flagged or bool(kinds) or data['pageOverflow']
        for kind, ids in kinds.items():
            ids = list(dict.fromkeys(ids))
            print(f'{width}px {kind} ({len(ids)}): {", ".join(ids)}')
    print(f'material in {out}')
    sys.exit(1 if flagged else 0)


if __name__ == '__main__':
    main()
