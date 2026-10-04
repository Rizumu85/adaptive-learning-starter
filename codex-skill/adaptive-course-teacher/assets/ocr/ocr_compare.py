"""Compare two OCR drafts of the same pages and say where to look hardest.

    python ocr_compare.py work/ocr/ work/ocr2/ work/ocr-compare/

The first folder holds ocr_draft.py output (lines with boxes), the second ocr_second.py output
(blocks in reading order). For each page it writes {"page", "sentences": [...], "first_only": [...]}:

    sentences   the second draft sentence by sentence, in reading order, each with a status:
                  agree        both engines read the same letters and digits
                  differ       they read it differently; "first" lists each difference as
                               "context[second reading -> first reading]"
                  second-only  the first engine has nothing here
                and "risk": characters both engines tend to get wrong in the same way (see RISKS),
                listed even when the engines agree
    first_only  lines only the first engine read, with their boxes: usually captions, labels inside
                figures, page headers and handwriting, which the second engine leaves out

Punctuation and spacing are ignored when comparing. A sentence the engines agree on is less likely
to be wrong, not certain to be right, and what neither engine read appears nowhere: every page is
still checked against the scan. On two Japanese books the engines differed on 46% and 70% of the
sentences, so expect this to direct the proofreading rather than to shrink it to a few lines.
"""
import difflib
import json
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np

TABLE = str.maketrans({'“': '"', '”': '"', '‘': "'", '’': "'", '—': '-', '–': '-', '―': '-', '・': '·', '•': '·', '〜': '~'})
SENTENCE = re.compile(r'(?<=[。！？!?])|(?<=\.)\s|\n')
# Readings that both engines get wrong in the same way, so agreement proves nothing about them.
RISKS = [
    ('katakana b or p', re.compile(r'[バビブベボパピプペポ]')),
    ('ya, yu or yo that may be small', re.compile(r'[きしちにひみりぎじぢびぴキシチニヒミリギジヂビピ][やゆよヤユヨ]')),
    ('long mark or the numeral one', re.compile(r'[ァ-ヺ]一|一[ァ-ヺ]|[一-龥]ー')),
]


def norm(text):
    """Letters and digits only, width-folded: what the two drafts are compared on."""
    text = unicodedata.normalize('NFKC', text).translate(TABLE)
    return ''.join(c for c in text if c.isalnum())


def _last_row(unit, target, free_start):
    """Edit distance of `unit` against every prefix end of `target`."""
    t = np.frombuffer(target.encode('utf-32-le'), dtype=np.uint32)
    idx = np.arange(len(t) + 1)
    row = np.zeros(len(t) + 1, dtype=np.int64) if free_start else idx.astype(np.int64)
    for i, ch in enumerate(unit, 1):
        tmp = np.empty_like(row)
        tmp[0] = i
        tmp[1:] = np.minimum(row[:-1] + (t != ord(ch)), row[1:] + 1)
        row = np.minimum.accumulate(tmp - idx) + idx
    return row


def fit(unit, target, covered):
    """Best place for `unit` inside `target`: (distance, start, end), preferring uncovered text."""
    row = _last_row(unit, target, True)
    best = int(row.min())
    spans = []
    for end in (int(j) for j in np.flatnonzero(row == best)[:8]):
        lo = max(0, end - len(unit) - best - 2)
        back = _last_row(unit[::-1], target[lo:end][::-1], False)
        length = int(np.flatnonzero(back == best)[0]) if (back == best).any() else min(len(unit), end)
        spans.append((end - length, end))
    start, end = min(spans, key=lambda s: sum(covered[s[0]:s[1]]))
    return best, start, end


def place(lines, target):
    """Lay the first engine's lines over the second draft's text. Returns what the first engine read
    at each character of `target` (None where it read nothing, '' where it dropped the character,
    several characters where it has more) and the indexes of the lines that fit nowhere."""
    covered = [False] * len(target)
    read = [None] * len(target)
    nowhere = []
    for i in sorted(range(len(lines)), key=lambda i: len(norm(lines[i])), reverse=True):
        unit = norm(lines[i])
        if not unit:
            continue
        if not target:
            nowhere.append(i)
            continue
        if len(unit) < 4:  # a short piece only counts where the text is still uncovered
            at = next((m.start() for m in re.finditer(re.escape(unit), target) if not any(covered[m.start():m.end()])), None)
            if at is None:
                nowhere.append(i)
                continue
            start, end = at, at + len(unit)
        else:
            distance, start, end = fit(unit, target, covered)
            if distance > (0.5 if len(unit) >= 12 else 0.25) * len(unit):
                nowhere.append(i)
                continue
        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, unit, target[start:end], autojunk=False).get_opcodes():
            if tag == 'equal':
                for k in range(j1, j2):
                    read[start + k] = target[start + k]
            elif j2 > j1:  # replace, or characters the first engine does not have
                read[start + j1] = unit[i1:i2]
                for k in range(j1 + 1, j2):
                    read[start + k] = ''
            elif start + j1 > 0 and read[start + j1 - 1] is not None:  # characters only the first engine has
                read[start + j1 - 1] += unit[i1:i2]
        covered[start:end] = [True] * (end - start)
    return read, sorted(nowhere)


def risks(text):
    return [{'kind': kind, 'at': text[max(0, m.start() - 2):m.end() + 2]} for kind, pattern in RISKS for m in pattern.finditer(text)]


def compare(first_lines, second_blocks):
    """One page: (sentences, indexes of first-engine lines the second draft does not contain)."""
    sentences = []
    target = ''
    for block in second_blocks:
        for piece in SENTENCE.split(block['text']):
            piece = (piece or '').strip()
            if piece:
                n = norm(piece)
                sentences.append({'text': piece, 'kind': block.get('kind', 'text'), 'span': (len(target), len(target) + len(n))})
                target += n
    read, nowhere = place(first_lines, target)
    for s in sentences:
        start, end = s.pop('span')
        mine = read[start:end]
        if end == start:
            s['status'] = 'agree'
        elif all(v is None for v in mine):
            s['status'] = 'second-only'
        elif mine == list(target[start:end]):
            s['status'] = 'agree'
        else:
            s['status'] = 'differ'
            s['first'] = [f'{target[max(start, start + i - 2):start + i]}[{target[start + i]}->{v if v is not None else "(nothing)"}]'
                          for i, v in enumerate(mine) if v != target[start + i]]
        found = risks(s['text'])
        if found:
            s['risk'] = found
    return sentences, nowhere


def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    first, second, out = (Path(p) for p in sys.argv[1:4])
    out.mkdir(parents=True, exist_ok=True)
    total = {'agree': 0, 'differ': 0, 'second-only': 0, 'first-only lines': 0, 'risk marks': 0}
    pages = 0
    for path in sorted(second.glob('*.json')):
        draft = first / path.name
        if not draft.exists():
            print(path.stem, 'has no first draft, skipped')
            continue
        lines = json.loads(draft.read_text(encoding='utf-8'))['lines']
        sentences, nowhere = compare([line['text'] for line in lines], json.loads(path.read_text(encoding='utf-8'))['blocks'])
        (out / path.name).write_text(json.dumps({'page': path.stem, 'sentences': sentences, 'first_only': [lines[i] for i in nowhere]},
                                                ensure_ascii=False, indent=1), encoding='utf-8')
        counts = {key: sum(1 for s in sentences if s['status'] == key) for key in ('agree', 'differ', 'second-only')}
        marks = sum(len(s.get('risk', [])) for s in sentences)
        for key, value in counts.items():
            total[key] += value
        total['first-only lines'] += len(nowhere)
        total['risk marks'] += marks
        pages += 1
        print(f"{path.stem}: {counts['agree']} agree, {counts['differ']} differ, {counts['second-only']} second-only, "
              f"{len(nowhere)} first-only lines, {marks} risk marks")
    (out / 'summary.json').write_text(json.dumps({'pages': pages, **total}, indent=1), encoding='utf-8')
    print(f'{pages} pages:', ', '.join(f'{value} {key}' for key, value in total.items()))


if __name__ == '__main__':
    main()
