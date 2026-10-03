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
    narrow-caption   a caption squeezed to less than 220 px
    overflow         a picture wider than the screen; pageOverflow means the page scrolls sideways

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
        numbers += list(range(int(first), int(last or first) + 1))
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


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--page', required=True, help='reader page (HTML file or URL)')
    parser.add_argument('--out', required=True, help='working folder for the review material (keep it out of the published reader)')
    parser.add_argument('--pdf', help='source PDF of the book')
    parser.add_argument('--images', help='page image pattern with {page}, when there is no PDF')
    parser.add_argument('--pdf-pages', help='page indexes of this unit in the source, e.g. 34-39 or 34-36,40')
    parser.add_argument('--widths', default='1440,820,390')
    parser.add_argument('--browser', help='path to Chrome or Edge when it is not found automatically')
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    if (args.pdf or args.images) and args.pdf_pages:
        print('book sheets:', ', '.join(book_sheets(args, out)), '+ single pages in pages/')
    else:
        print('No --pdf/--images with --pdf-pages given: only the web page is captured; open the printed pages yourself.')

    command = ['node', str(Path(__file__).with_name('layout_shots.mjs')), args.page, '--out', str(out), '--widths', args.widths]
    if args.browser:
        command += ['--browser', args.browser]
    result = subprocess.run(command, timeout=240)
    if result.returncode:
        sys.exit(result.returncode)

    report = json.loads((out / 'report.json').read_text(encoding='utf-8'))
    flagged = False
    for width, data in report['widths'].items():
        kinds = {}
        for finding in data['findings']:
            kinds.setdefault(finding['kind'], []).append(finding['id'])
        flagged = flagged or bool(kinds) or data['pageOverflow']
        for kind, ids in kinds.items():
            print(f'{width}px {kind} ({len(ids)}): {", ".join(ids)}')
    print(f'material in {out}')
    sys.exit(1 if flagged else 0)


if __name__ == '__main__':
    main()
