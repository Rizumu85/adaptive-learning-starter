"""Optional second OCR draft with Xiaomi-OCR-0, a small vision-language model, on a local GPU.

It reads a whole page and returns headings and merged paragraphs in reading order, which the first
engine (ocr_draft.py, PP-OCRv6) does not. It reads Chinese body text more accurately than the first
engine and Japanese less accurately. It returns no coordinates, skips most text inside figures,
captions and handwriting, and can occasionally reword a phrase. So it never replaces the first
draft: run both, then ocr_compare.py marks where they differ.

    pip install "transformers>=5.17" torch pymupdf      # torch built for your CUDA version
    python ocr_second.py book.pdf 11-35 work/ocr2/       # PDF pages 11 to 35 (1-based)
    python ocr_second.py "work/source/p0*.jpg" work/ocr2/

Needs a CUDA GPU (about 6 GB of memory) and takes roughly 35-45 seconds a page, so run a whole book
once, in the background, before the units are made. Pages already written are skipped: an
interrupted run continues where it stopped. Without a GPU, leave this step out.

Writes one JSON per page: {"page", "seconds", "blocks": [{"kind": "heading" | "text" | "table",
"text"}]} in the model's reading order. Table cells are joined with " | ", rows with a line break.
"""
import json
import re
import sys
import time
from pathlib import Path

from ocr_draft import pages

MODEL = 'SeerRay-Lab/Xiaomi-OCR-0'
PROMPT = ('Extract all information from the main body of the document image and represent it '
          'in markdown format, ignoring headers and footers. Tables should be expressed in OTSL '
          'format, formulas in the document should be represented using LATEX format, and the '
          'parsing should be organized according to the reading order.')
MAX_NEW_TOKENS = 4096
CELL = re.compile(r'<(fcel|ecel|lcel|ucel|xcel|nl)>')


def blocks(markdown):
    """The model's markdown as a list of blocks, with table markup turned into plain rows."""
    out = []
    for raw in markdown.split('\n'):
        line = raw.strip()
        if not line:
            continue
        if CELL.search(line):
            rows = []
            for row in line.split('<nl>'):
                parts = CELL.split(row)  # [text, tag, text, tag, text, ...]
                cells = [c.strip() for c in parts[:1] + parts[2::2]]
                cells = [c for c in cells if c]
                if cells:
                    rows.append(' | '.join(cells))
            if rows:
                out.append({'kind': 'table', 'text': '\n'.join(rows)})
            continue
        heading = re.match(r'#+\s+(.*)', line)
        if heading:
            out.append({'kind': 'heading', 'text': heading.group(1).strip()})
        else:
            out.append({'kind': 'text', 'text': re.sub(r'^[-*]\s+', '', line)})
    return out


def load():
    try:
        import torch
        from transformers import AutoModelForImageTextToText, AutoProcessor
    except ImportError as error:
        sys.exit(f'{error}\nThe second engine needs transformers 5.17 or later and torch. Leave this step out if they are not installed.')
    if not torch.cuda.is_available():
        sys.exit('No CUDA GPU found: the second engine is too slow without one. Leave this step out and proofread from the first draft.')
    processor = AutoProcessor.from_pretrained(MODEL)
    model = AutoModelForImageTextToText.from_pretrained(MODEL, dtype=torch.float16).to('cuda').eval()

    def read(image):
        messages = [{'role': 'user', 'content': [{'type': 'image', 'image': image}, {'type': 'text', 'text': PROMPT}]}]
        inputs = processor.apply_chat_template(messages, tokenize=True, add_generation_prompt=True,
                                               return_dict=True, return_tensors='pt').to('cuda')
        with torch.inference_mode():
            output = model.generate(**inputs, max_new_tokens=MAX_NEW_TOKENS, do_sample=False)
        new = output[:, inputs['input_ids'].shape[1]:]
        return processor.batch_decode(new, skip_special_tokens=True)[0], int(new.shape[1])
    return read


def main():
    pdf = len(sys.argv) > 1 and sys.argv[1].lower().endswith('.pdf')
    if len(sys.argv) < (4 if pdf else 3):
        sys.exit(__doc__)
    source = sys.argv[1]
    spec, out = (sys.argv[2], sys.argv[3]) if pdf else ('', sys.argv[2])
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    read = None
    for label, image in pages(source, spec):
        target = out / f'{label}.json'
        if target.exists():
            print(label, 'already done')
            continue
        read = read or load()
        start = time.perf_counter()
        markdown, tokens = read(image)
        seconds = round(time.perf_counter() - start, 1)
        note = {'truncated': True} if tokens >= MAX_NEW_TOKENS else {}  # a page that hit the limit lost its end
        target.write_text(json.dumps({'page': label, 'seconds': seconds, **note, 'blocks': blocks(markdown)},
                                     ensure_ascii=False, indent=1), encoding='utf-8')
        print(label, seconds, 's', '(truncated)' if note else '', flush=True)


if __name__ == '__main__':
    main()
