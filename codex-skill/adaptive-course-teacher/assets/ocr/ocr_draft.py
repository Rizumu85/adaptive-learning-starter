"""Draft text from scanned pages with PP-OCRv6 medium (RapidOCR), locally and offline.

One recognizer reads simplified and traditional Chinese, Japanese and English. The output is a
draft and a search aid: every line still has to be checked against the page before it counts as
the book's text.

    pip install "rapidocr>=3.9.2" onnxruntime pymupdf   # an older RapidOCR falls back to PP-OCRv5
    python ocr_draft.py book.pdf 11-35 work/ocr/          # PDF pages 11 to 35 (1-based)
    python ocr_draft.py "work/source/p0*.jpg" work/ocr/   # page images
    python ocr_draft.py --fast book.pdf 1-200 work/ocr/   # same model through the .NET program in simd/

--fast needs the .NET 10 SDK. The first run builds simd/ once into ~/.cache/adaptive-course-teacher
(or OCR_FAST_CACHE), which downloads its packages and the model. It uses the GPU through Vulkan or Metal when the machine has a capable one (about 0.15 s a
page on a recent desktop card, against about 9 s through RapidOCR) and the CPU otherwise (about 3 s).
The text matches RapidOCR's to within a few characters a page; "score" is null, because the library
does not report a confidence between 0 and 1. When it cannot run, the reason is printed and RapidOCR
does the pages instead.

Both engines write one box per line. The fast engine can also estimate a box per character; that is
not written out yet. Add it in simd/Program.cs (see the note at its top) when something needs a
position finer than a line, such as a hotspot over a few characters of a hand-written note.

Writes one JSON per page: {"page", "width", "height", "lines": [{"text", "score", "box"}]}, with
`box` [x0, y0, x1, y1] on a page 1000 units wide (the same scale as crops.json), in the order the
engine returns them. Reading order across columns, ruby, text over drawings, light text on dark
ground and handwriting need a look by eye whatever the engine.

ocr_second.py makes an optional second draft with a different engine and ocr_compare.py marks
where the two differ.
"""
import glob
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

DPI = 200  # render resolution for PDF pages; small captions read better at 200 than at 150
FAST = Path(__file__).with_name('simd')  # source of the .NET program behind --fast
# where it is built: outside the skill, so build files (which record local paths) never sit in it
CACHE = Path(os.environ.get('OCR_FAST_CACHE') or Path.home() / '.cache' / 'adaptive-course-teacher' / 'ocr-fast')


def engine():
    from rapidocr import LangRec, ModelType, OCRVersion, RapidOCR
    if hasattr(OCRVersion, 'PPOCRV6'):
        from rapidocr import LangDet
        print('engine: PP-OCRv6 medium', file=sys.stderr)
        return RapidOCR(params={'Rec.lang_type': LangRec.CH, 'Rec.ocr_version': OCRVersion.PPOCRV6,
                                'Rec.model_type': ModelType.MEDIUM, 'Det.lang_type': LangDet.CH,
                                'Det.ocr_version': OCRVersion.PPOCRV6, 'Det.model_type': ModelType.MEDIUM})
    # PP-OCRv6 misreads far fewer Japanese characters; this branch only keeps an old install working.
    print('engine: PP-OCRv5 (this RapidOCR has no PP-OCRv6: pip install -U "rapidocr>=3.9.2")', file=sys.stderr)
    return RapidOCR(params={'Rec.lang_type': LangRec.CH, 'Rec.ocr_version': OCRVersion.PPOCRV5,
                            'Rec.model_type': ModelType.SERVER,
                            'Det.ocr_version': OCRVersion.PPOCRV5, 'Det.model_type': ModelType.MOBILE})


def pages(source, spec):
    """Yield (page label, PIL image) from a PDF page range or an image glob."""
    if source.lower().endswith('.pdf'):
        import pymupdf
        doc = pymupdf.open(source)
        first, _, last = spec.partition('-')
        first, last = int(first), int(last or first)
        if last < first:
            raise ValueError(f'page range {spec} runs backwards')
        for number in range(first, last + 1):
            pix = doc[number - 1].get_pixmap(dpi=DPI)
            yield f'p{number:04}', Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
    else:
        for path in sorted(glob.glob(source)):
            with Image.open(path) as image:
                yield Path(path).stem, image.convert('RGB')


def fast(source, spec, out):
    """Run the pages through the .NET program. False, after saying why, when it cannot run."""
    def no(reason):
        print(f'--fast: {reason}; using RapidOCR instead', file=sys.stderr)
        return False
    dotnet = shutil.which('dotnet')
    if not dotnet:
        return no('the .NET 10 SDK is not installed (no dotnet command)')
    version = subprocess.run([dotnet, '--version'], capture_output=True, text=True).stdout.strip()
    if not version.split('.')[0].isdigit() or int(version.split('.')[0]) < 10:
        return no(f'needs the .NET 10 SDK, found {version or "none"}')
    def built_program():
        found = sorted((CACHE / 'bin').glob('**/ocr-fast.dll')) if (CACHE / 'bin').is_dir() else []
        return found[0] if found else None
    program = built_program()
    newest = max(path.stat().st_mtime for path in FAST.glob('*') if path.is_file())
    if program is None or program.stat().st_mtime < newest:
        print(f'--fast: building the engine in {CACHE} (downloads its packages and the model)', file=sys.stderr)
        built = subprocess.run([dotnet, 'build', str(FAST), '-c', 'Release', '--artifacts-path', str(CACHE)], capture_output=True, text=True)
        program = built_program()
        if built.returncode or program is None:
            return no('the build failed: ' + (built.stdout.strip().splitlines() or ['no output'])[-1])
    with tempfile.TemporaryDirectory() as tmp:
        listing = []
        if source.lower().endswith('.pdf'):
            for label, image in pages(source, spec):
                path = Path(tmp) / f'{label}.png'
                image.save(path, compress_level=1)
                listing.append(f'{label}\t{path}')
        else:
            listing = [f'{Path(path).stem}\t{Path(path).resolve()}' for path in sorted(glob.glob(source))]
        pages_file = Path(tmp) / 'pages.txt'
        pages_file.write_text('\n'.join(listing), encoding='utf-8')
        done = subprocess.run([dotnet, str(program), str(pages_file), str(out)])
    return done.returncode == 0 or no(f'the engine stopped with exit code {done.returncode}')


def main():
    args = [a for a in sys.argv[1:] if a != '--fast']
    pdf = len(args) > 0 and args[0].lower().endswith('.pdf')
    if len(args) < (3 if pdf else 2):
        sys.exit(__doc__)
    source = args[0]
    spec, out = (args[1], args[2]) if pdf else ('', args[1])
    if not pdf and not glob.glob(source):
        sys.exit(f'no page images match {source}')
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    if '--fast' in sys.argv[1:] and fast(source, spec, out):
        return
    ocr = engine()
    for label, image in pages(source, spec):
        result = ocr(np.asarray(image))
        scale = 1000 / image.width
        lines = []
        for box, text, score in zip(result.boxes if result.boxes is not None else [], result.txts or [], result.scores or []):
            xs, ys = [float(p[0]) for p in box], [float(p[1]) for p in box]
            lines.append({'text': text, 'score': round(float(score), 3),
                          'box': [round(min(xs) * scale, 1), round(min(ys) * scale, 1), round(max(xs) * scale, 1), round(max(ys) * scale, 1)]})
        (out / f'{label}.json').write_text(json.dumps({'page': label, 'width': image.width, 'height': image.height, 'lines': lines},
                                                      ensure_ascii=False, indent=1), encoding='utf-8')
        print(label, len(lines), 'lines')


if __name__ == '__main__':
    main()
