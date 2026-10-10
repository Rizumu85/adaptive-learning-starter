"""Tests for ocr_draft.py without the OCR model and without a PDF.

The recognizer is replaced by a fake that returns fixed boxes, and PDF rendering by a fake pymupdf
module, so what is tested is the tool's own work: page ranges, image globs, the 1000-wide
coordinate scale and the JSON it writes. Running the real model is left to the opt-in test at the end.
"""
import json
import os
import sys
import types
from pathlib import Path

import pytest
from PIL import Image, ImageDraw

pytest.importorskip('numpy')
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import ocr_draft  # noqa: E402


class FakePdf:
    """pymupdf stand-in: page i (0-based) renders as an image 10 * (i + 1) px wide."""

    def __init__(self, pages=40):
        self.count = pages

    def __getitem__(self, index):
        if not 0 <= index < self.count:
            raise IndexError(index)
        width = 10 * (index + 1)

        def get_pixmap(dpi):
            assert dpi == ocr_draft.DPI
            return types.SimpleNamespace(width=width, height=20, samples=bytes(width * 20 * 3))
        return types.SimpleNamespace(get_pixmap=get_pixmap)


@pytest.fixture
def fake_pymupdf(monkeypatch):
    monkeypatch.setitem(sys.modules, 'pymupdf', types.SimpleNamespace(open=lambda path: FakePdf()))


def images(tmp_path, *names, size=(40, 30)):
    for name in names:
        Image.new('L', size, 255).save(tmp_path / name)
    return str(tmp_path / '*.png')


# pages -----------------------------------------------------------------------------------------

@pytest.mark.parametrize('spec, labels', [
    ('11-13', ['p0011', 'p0012', 'p0013']),
    ('7', ['p0007']),
    ('1-1', ['p0001']),
])
def test_pdf_pages_are_1_based_and_inclusive(fake_pymupdf, spec, labels):
    got = list(ocr_draft.pages('book.PDF', spec))
    assert [label for label, _ in got] == labels
    # page n renders 10 * n px wide in the fake, so this checks n maps to index n - 1
    assert [image.width for _, image in got] == [10 * int(label[1:]) for label in labels]
    assert all(image.mode == 'RGB' for _, image in got)


def test_a_pdf_range_that_runs_backwards_is_refused(fake_pymupdf):
    with pytest.raises(ValueError, match='13-11'):
        list(ocr_draft.pages('book.pdf', '13-11'))


def test_image_pages_are_read_in_name_order_as_rgb(tmp_path):
    pattern = images(tmp_path, 'p0012.png', 'p0010.png', 'p0011.png')
    got = list(ocr_draft.pages(pattern, ''))
    assert [label for label, _ in got] == ['p0010', 'p0011', 'p0012']
    assert all(image.mode == 'RGB' and image.size == (40, 30) for _, image in got)


# main: coordinates and output ------------------------------------------------------------------

def fake_engine(result):
    seen = []

    def ocr(array):
        seen.append(array.shape)
        return result
    return lambda: ocr, seen


def run_main(monkeypatch, *argv):
    monkeypatch.setattr(sys, 'argv', ['ocr_draft.py', *map(str, argv)])
    ocr_draft.main()


def test_boxes_are_written_on_a_page_1000_units_wide(tmp_path, monkeypatch, capsys):
    pattern = images(tmp_path, 'p0001.png', size=(2000, 2828))
    result = types.SimpleNamespace(
        boxes=[[[100, 50], [300, 52], [300, 90], [100, 88]],          # a slightly skewed line
               [[1800, 2700], [1990, 2700], [1990, 2790], [1800, 2790]]],  # low on a portrait page
        txts=('first line', 'folio'), scores=(0.98765, 0.5))
    make, seen = fake_engine(result)
    monkeypatch.setattr(ocr_draft, 'engine', make)
    run_main(monkeypatch, pattern, tmp_path / 'out')
    assert seen == [(2828, 2000, 3)]
    data = json.loads((tmp_path / 'out' / 'p0001.json').read_text(encoding='utf-8'))
    assert data == {'page': 'p0001', 'width': 2000, 'height': 2828, 'lines': [
        {'text': 'first line', 'score': 0.988, 'box': [50.0, 25.0, 150.0, 45.0]},
        # y uses the page-width scale too, so a portrait page runs past 1000 (as in crops.json)
        {'text': 'folio', 'score': 0.5, 'box': [900.0, 1350.0, 995.0, 1395.0]}]}
    assert 'p0001 2 lines' in capsys.readouterr().out


def test_a_page_with_no_text_writes_no_lines(tmp_path, monkeypatch):
    pattern = images(tmp_path, 'blank.png')
    make, _ = fake_engine(types.SimpleNamespace(boxes=None, txts=None, scores=None))
    monkeypatch.setattr(ocr_draft, 'engine', make)
    run_main(monkeypatch, pattern, tmp_path / 'out')
    assert json.loads((tmp_path / 'out' / 'blank.json').read_text(encoding='utf-8'))['lines'] == []


def test_non_ascii_text_is_written_as_is(tmp_path, monkeypatch):
    pattern = images(tmp_path, 'p.png', size=(1000, 1000))
    box = [[0, 0], [10, 0], [10, 10], [0, 10]]
    make, _ = fake_engine(types.SimpleNamespace(boxes=[box], txts=('图ア',), scores=(1.0,)))
    monkeypatch.setattr(ocr_draft, 'engine', make)
    run_main(monkeypatch, pattern, tmp_path / 'out')
    assert '"图ア"' in (tmp_path / 'out' / 'p.json').read_text(encoding='utf-8')


def test_pdf_source_reads_the_range_into_the_output_folder(tmp_path, monkeypatch, fake_pymupdf):
    make, seen = fake_engine(types.SimpleNamespace(boxes=None, txts=None, scores=None))
    monkeypatch.setattr(ocr_draft, 'engine', make)
    run_main(monkeypatch, 'book.pdf', '2-3', tmp_path / 'out')
    assert sorted(p.name for p in (tmp_path / 'out').iterdir()) == ['p0002.json', 'p0003.json']
    assert seen == [(20, 20, 3), (20, 30, 3)]


@pytest.mark.parametrize('argv', [['pages/*.png'], ['book.pdf', 'out']])
def test_missing_arguments_print_the_usage(monkeypatch, argv):
    monkeypatch.setattr(ocr_draft, 'engine', lambda: pytest.fail('the model must not load'))
    with pytest.raises(SystemExit) as stop:
        run_main(monkeypatch, *argv)
    assert stop.value.code == ocr_draft.__doc__

# --fast: the glue around the .NET program (the program itself is not run here) ------------------

def one_page(tmp_path):
    image = tmp_path / 'p1.png'
    Image.new('RGB', (100, 50), 'white').save(image)
    return image


def test_fast_falls_back_to_rapidocr_when_dotnet_is_missing(tmp_path, monkeypatch, capsys):
    one_page(tmp_path)
    make, _ = fake_engine(types.SimpleNamespace(boxes=None, txts=None, scores=None))
    monkeypatch.setattr(ocr_draft, 'engine', make)
    monkeypatch.setattr(ocr_draft.shutil, 'which', lambda name: None)
    monkeypatch.setattr(sys, 'argv', ['ocr_draft.py', '--fast', str(tmp_path / '*.png'), str(tmp_path / 'out')])
    ocr_draft.main()
    assert (tmp_path / 'out' / 'p1.json').exists()
    assert 'using RapidOCR instead' in capsys.readouterr().err


def test_fast_falls_back_when_the_sdk_is_older_than_10(tmp_path, monkeypatch, capsys):
    one_page(tmp_path)
    make, _ = fake_engine(types.SimpleNamespace(boxes=None, txts=None, scores=None))
    monkeypatch.setattr(ocr_draft, 'engine', make)
    monkeypatch.setattr(ocr_draft.shutil, 'which', lambda name: 'dotnet')
    monkeypatch.setattr(ocr_draft.subprocess, 'run', lambda cmd, **kw: types.SimpleNamespace(returncode=0, stdout='9.0.305\n'))
    monkeypatch.setattr(sys, 'argv', ['ocr_draft.py', '--fast', str(tmp_path / '*.png'), str(tmp_path / 'out')])
    ocr_draft.main()
    assert (tmp_path / 'out' / 'p1.json').exists()
    assert 'found 9.0.305' in capsys.readouterr().err


def test_fast_hands_the_pages_to_the_program_and_never_loads_rapidocr(tmp_path, monkeypatch):
    image = one_page(tmp_path)
    source = tmp_path / 'simd'
    source.mkdir()
    (source / 'Program.cs').write_text('// source', encoding='utf-8')
    program = tmp_path / 'cache' / 'bin' / 'simd' / 'release'
    program.mkdir(parents=True)
    (program / 'ocr-fast.dll').write_bytes(b'')  # written after the source, so no rebuild is due
    monkeypatch.setattr(ocr_draft, 'FAST', source)
    monkeypatch.setattr(ocr_draft, 'CACHE', tmp_path / 'cache')
    monkeypatch.setattr(ocr_draft, 'engine', lambda: pytest.fail('RapidOCR must not load'))
    monkeypatch.setattr(ocr_draft.shutil, 'which', lambda name: 'dotnet')
    seen = {}

    def run(cmd, **kw):
        if cmd[1:] == ['--version']:
            return types.SimpleNamespace(returncode=0, stdout='10.0.100\n')
        seen['cmd'] = cmd
        seen['listing'] = Path(cmd[2]).read_text(encoding='utf-8')
        return types.SimpleNamespace(returncode=0, stdout='')
    monkeypatch.setattr(ocr_draft.subprocess, 'run', run)
    monkeypatch.setattr(sys, 'argv', ['ocr_draft.py', str(tmp_path / '*.png'), '--fast', str(tmp_path / 'out')])
    ocr_draft.main()
    assert seen['cmd'][1] == str(program / 'ocr-fast.dll') and seen['cmd'][3] == str(tmp_path / 'out')
    assert seen['listing'] == f'p1\t{image.resolve()}'


def test_a_glob_that_matches_nothing_stops_with_a_message(tmp_path, monkeypatch):
    monkeypatch.setattr(ocr_draft, 'engine', lambda: pytest.fail('the model must not load'))
    monkeypatch.setattr(sys, 'argv', ['ocr_draft.py', str(tmp_path / '*.png'), str(tmp_path / 'out')])
    with pytest.raises(SystemExit) as stop:
        ocr_draft.main()
    assert 'no page images match' in str(stop.value)



# the real model (downloads it on first use) ----------------------------------------------------

@pytest.mark.skipif(not os.environ.get('OCR_MODEL_TESTS'), reason='set OCR_MODEL_TESTS=1 to run the real OCR model')
def test_the_real_engine_reads_a_drawn_line(tmp_path, monkeypatch):
    pytest.importorskip('rapidocr')
    image = Image.new('RGB', (1200, 300), 'white')
    ImageDraw.Draw(image).text((60, 100), 'TEST 2468', fill='black', font_size=96)
    image.save(tmp_path / 'line.png')
    run_main(monkeypatch, tmp_path / 'line.png', tmp_path / 'out')
    lines = json.loads((tmp_path / 'out' / 'line.json').read_text(encoding='utf-8'))['lines']
    assert any('2468' in line['text'] for line in lines)
