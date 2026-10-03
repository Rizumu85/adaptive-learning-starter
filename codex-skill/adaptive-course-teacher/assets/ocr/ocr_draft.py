"""Draft text from scanned pages with PP-OCRv5 (RapidOCR), locally and offline.

One recognizer reads simplified and traditional Chinese, Japanese and English. The output is a
draft and a search aid: every line still has to be checked against the page before it counts as
the book's text.

    pip install rapidocr onnxruntime pymupdf
    python ocr_draft.py book.pdf 11-35 work/ocr/          # PDF pages 11 to 35 (1-based)
    python ocr_draft.py "work/source/p0*.jpg" work/ocr/   # page images

Writes one JSON per page: {"page", "width", "height", "lines": [{"text", "score", "box"}]}, with
`box` [x0, y0, x1, y1] on a page 1000 units wide (the same scale as crops.json), in the order the
engine returns them. Reading order across columns, ruby, text over drawings, light text on dark
ground and handwriting need a look by eye whatever the engine.
"""
import glob
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

DPI = 200  # render resolution for PDF pages; small captions read better at 200 than at 150


def engine():
    from rapidocr import LangRec, ModelType, OCRVersion, RapidOCR
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


def main():
    pdf = len(sys.argv) > 1 and sys.argv[1].lower().endswith('.pdf')
    if len(sys.argv) < (4 if pdf else 3):
        sys.exit(__doc__)
    source = sys.argv[1]
    spec, out = (sys.argv[2], sys.argv[3]) if pdf else ('', sys.argv[2])
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
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
