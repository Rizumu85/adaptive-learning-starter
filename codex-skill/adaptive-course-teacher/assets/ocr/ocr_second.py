"""Second OCR draft from a vision-language model on a local GPU, to lay over the first (ocr_draft.py).

Two engines, both reading a whole page and returning headings and paragraphs in reading order, which
the first engine (PP-OCRv6, one box per line) does not:

  unlimited (default)  Unlimited OCR 2 (baidu/Unlimited-OCR-2), served by the authors' SGLang build.
                       On proofread pages it read 99.7-99.8% of the characters right in Japanese,
                       Chinese and French, kept two-column reading order, labels each block (title,
                       text, image_caption, page_number, image, ...) and gives each block a box. It
                       mixes up katakana b and p (ブラシ read as プラシ). About 2.4 s a page with four
                       pages in flight on a 16 GB card. Needs the server running: see unlimited/README.md.
  xiaomi               Xiaomi-OCR-0 through transformers, no server. Reads Chinese body text well and
                       Japanese worse than the first engine, gives no coordinates, skips most captions,
                       text inside figures and handwriting. About 35-45 s a page, 6 GB of GPU memory.

Either way the second draft never replaces the first: run both, then ocr_compare.py marks where they
differ. The first draft stays the source of line boxes.

    python ocr_second.py book.pdf 11-35 work/ocr2/                  # PDF pages 11 to 35 (1-based)
    python ocr_second.py "work/source/p0*.jpg" work/ocr2/
    python ocr_second.py --engine xiaomi "work/source/p0*.jpg" work/ocr2/
    python ocr_second.py --server http://127.0.0.1:10000 ...         # the default address

Pages already written are skipped: an interrupted run continues where it stopped.

Writes one JSON per page: {"page", "seconds", "engine", "blocks": [{"kind", "text", "box"?}],
"figures"?: [{"box"}]} in the model's reading order. kind is "heading", "text" or "table" (xiaomi), or
heading / table / the model's own label (unlimited). Table cells are joined with " | ", rows with a
line break. box and figures (picture areas, unlimited only) are [x0, y0, x1, y1] on a page 1000
units wide, the scale of ocr_draft.py and crops.json. "truncated": true marks a page that hit the
output limit and lost its end.
"""
import base64
import io
import json
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from ocr_draft import pages

MODEL = 'SeerRay-Lab/Xiaomi-OCR-0'
PROMPT = ('Extract all information from the main body of the document image and represent it '
          'in markdown format, ignoring headers and footers. Tables should be expressed in OTSL '
          'format, formulas in the document should be represented using LATEX format, and the '
          'parsing should be organized according to the reading order.')
MAX_NEW_TOKENS = 4096
CELL = re.compile(r'<(fcel|ecel|lcel|ucel|xcel|nl)>')

SERVER = 'http://127.0.0.1:10000'
IN_FLIGHT = 4            # pages sent at once; more did not help on a 16 GB card
PAGE_TOKENS = 8000       # output budget per page, as in the authors' example
BLOCK = re.compile(r'<BLOCK>\s*([A-Za-z_]+)\s*\[\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\]\s*<FORK>(.*?)(?=<BLOCK>|<PAGE>|$)', re.S)
HEADINGS = {'title', 'doc_title', 'paragraph_title', 'section_title', 'header_title'}


def blocks(markdown):
    """Xiaomi-OCR-0's markdown as a list of blocks, with table markup turned into plain rows."""
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


def html_table(text):
    """An HTML table as plain rows (cells joined with ' | '); anything else unchanged."""
    if '<table' not in text:
        return text
    rows = []
    for row in re.findall(r'<tr[^>]*>(.*?)</tr>', text, re.S):
        cells = [re.sub(r'<[^>]+>', '', c).strip() for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', row, re.S)]
        if any(cells):
            rows.append(' | '.join(cells))
    return '\n'.join(rows)


def unlimited_blocks(output, width, height):
    """Unlimited OCR 2 output for one page -> (blocks, figures) with boxes on the 1000-wide scale.

    The model writes <BLOCK>label[x0, y0, x1, y1]<FORK>text with both axes scaled to 0-1000; the
    1000-wide scale keeps x and stretches y by the page's height-to-width ratio."""
    ratio = height / width
    out, figures = [], []
    for label, x0, y0, x1, y1, text in BLOCK.findall(output):
        box = [round(float(x0), 1), round(float(y0) * ratio, 1), round(float(x1), 1), round(float(y1) * ratio, 1)]
        text = text.strip()
        if label == 'image' and not text:
            figures.append({'box': box})
            continue
        if not text:
            continue
        kind = 'heading' if label in HEADINGS else 'table' if label == 'table' else label
        out.append({'kind': kind, 'text': html_table(text) if kind == 'table' else text, 'box': box})
    return out, figures


def unlimited_reader(server):
    """A function image -> (output, tokens) that asks the Unlimited OCR 2 server, after checking it answers."""
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))  # a local server: never through a proxy
    try:
        with opener.open(f'{server}/v1/models', timeout=10) as response:
            response.read()
    except OSError as error:
        sys.exit(f'No Unlimited OCR 2 server at {server} ({error}).\n'
                 'Start it as unlimited/README.md describes, or run with --engine xiaomi.')

    def read(image):
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        data = base64.b64encode(buffer.getvalue()).decode()
        payload = {'model': 'Unlimited-OCR-2', 'temperature': 0, 'skip_special_tokens': False, 'stream': False,
                   'max_tokens': PAGE_TOKENS, 'images_config': {'crop_mode': True},  # tiles: full resolution
                   'messages': [{'role': 'user', 'content': [
                       {'type': 'image_url', 'image_url': {'url': f'data:image/png;base64,{data}'}},
                       {'type': 'text', 'text': '<PAGE><image>Multi page parsing.'}]}]}
        request = urllib.request.Request(f'{server}/v1/chat/completions', data=json.dumps(payload).encode(),
                                         headers={'Content-Type': 'application/json'})
        with opener.open(request, timeout=1800) as response:
            result = json.load(response)
        return result['choices'][0]['message']['content'], result.get('usage', {}).get('completion_tokens', 0)
    return read


def xiaomi_reader():
    try:
        import torch
        from transformers import AutoModelForImageTextToText, AutoProcessor
    except ImportError as error:
        sys.exit(f'{error}\nThe xiaomi engine needs transformers 5.17 or later and torch. Leave this step out if they are not installed.')
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


def options(argv):
    """(engine, server, positional arguments) from the command line."""
    engine, server, rest = 'unlimited', SERVER, []
    args = iter(argv)
    for arg in args:
        if arg == '--engine':
            engine = next(args, '')
        elif arg == '--server':
            server = next(args, '').rstrip('/')
        else:
            rest.append(arg)
    if engine not in ('unlimited', 'xiaomi'):
        sys.exit('--engine is unlimited or xiaomi')
    return engine, server, rest


def main():
    engine, server, args = options(sys.argv[1:])
    pdf = bool(args) and args[0].lower().endswith('.pdf')
    if len(args) < (3 if pdf else 2):
        sys.exit(__doc__)
    source = args[0]
    spec, out = (args[1], args[2]) if pdf else ('', args[1])
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)

    if engine == 'xiaomi':
        read = None
        for label, image in pages(source, spec):
            target = out / f'{label}.json'
            if target.exists():
                print(label, 'already done')
                continue
            read = read or xiaomi_reader()
            start = time.perf_counter()
            markdown, tokens = read(image)
            seconds = round(time.perf_counter() - start, 1)
            note = {'truncated': True} if tokens >= MAX_NEW_TOKENS else {}
            target.write_text(json.dumps({'page': label, 'seconds': seconds, 'engine': MODEL, **note, 'blocks': blocks(markdown)},
                                         ensure_ascii=False, indent=1), encoding='utf-8')
            print(label, seconds, 's', '(truncated)' if note else '', flush=True)
        return

    read = unlimited_reader(server)

    def one(item):
        label, image = item
        start = time.perf_counter()  # includes queueing at the server while other pages are in flight
        output, tokens = read(image)
        seconds = round(time.perf_counter() - start, 1)
        found, figures = unlimited_blocks(output, image.width, image.height)
        note = {'truncated': True} if tokens >= PAGE_TOKENS else {}
        record = {'page': label, 'seconds': seconds, 'engine': 'baidu/Unlimited-OCR-2', **note, 'blocks': found}
        if figures:
            record['figures'] = figures
        (out / f'{label}.json').write_text(json.dumps(record, ensure_ascii=False, indent=1), encoding='utf-8')
        return label, seconds, note

    def report(future):
        label, seconds, note = future.result()
        print(label, seconds, 's', '(truncated)' if note else '', flush=True)

    start, done, seen = time.perf_counter(), 0, 0
    with ThreadPoolExecutor(IN_FLIGHT) as pool:
        waiting = []  # rendered pages are held only while in flight, not the whole book at once
        for item in pages(source, spec):
            seen += 1
            if (out / f'{item[0]}.json').exists():
                print(item[0], 'already done')
                continue
            waiting.append(pool.submit(one, item))
            done += 1
            if len(waiting) >= IN_FLIGHT * 2:
                report(waiting.pop(0))
        for future in waiting:
            report(future)
    if not seen:
        sys.exit(f'No pages found in {source}: check the path or glob.')
    if done:
        print(f'{done} pages in {time.perf_counter() - start:.0f} s')


if __name__ == '__main__':
    main()
