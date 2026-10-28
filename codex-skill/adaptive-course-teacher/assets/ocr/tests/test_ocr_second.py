"""Tests for the Unlimited OCR 2 side of ocr_second.py, without the model or its server.

The output strings are shaped like the model's real output, so what is tested is the parsing: block
labels and text, the change from the model's 0-1000-per-axis boxes to the 1000-wide scale, picture
areas, tables and the command line.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import ocr_compare  # noqa: E402
import ocr_second  # noqa: E402

PAGE = ('<PAGE><BLOCK>title[210, 141, 328, 164]<FORK>はじめに\n'
        '<BLOCK>text[207, 188, 493, 213]<FORK>本書を手に取っていただきありがとうございます。\n'
        '<BLOCK>image[124, 586, 874, 907]<FORK>\n'
        '<BLOCK>image_caption[208, 141, 575, 155]<FORK>- テクニックページ\n'
        '<BLOCK>page_number[824, 876, 834, 886]<FORK>9\n')


def test_blocks_keep_reading_order_labels_and_text():
    found, figures = ocr_second.unlimited_blocks(PAGE, 1700, 2200)
    assert [b['kind'] for b in found] == ['heading', 'text', 'image_caption', 'page_number']
    assert found[1]['text'] == '本書を手に取っていただきありがとうございます。'
    assert len(figures) == 1


def test_boxes_move_to_the_1000_wide_scale():
    # A 1700 x 2200 page: x stays, y grows by 2200 / 1700. The first engine put this heading at
    # [211.6, 182.0, 328.1, 213.3] on the same page.
    found, figures = ocr_second.unlimited_blocks(PAGE, 1700, 2200)
    assert found[0]['box'] == [210.0, 182.5, 328.0, 212.2]
    assert figures[0]['box'] == [124.0, 758.4, 874.0, 1173.8]


def test_html_tables_become_plain_rows():
    output = '<BLOCK>table[100, 100, 900, 300]<FORK><table><tr><th>色</th><th>光</th></tr><tr><td>赤</td><td>強</td></tr></table>'
    found, _ = ocr_second.unlimited_blocks(output, 1000, 1000)
    assert found == [{'kind': 'table', 'text': '色 | 光\n赤 | 強', 'box': [100.0, 100.0, 900.0, 300.0]}]


def test_empty_text_blocks_are_dropped_but_a_captioned_image_is_kept():
    output = '<BLOCK>text[1, 2, 3, 4]<FORK>   <BLOCK>image[5, 6, 7, 8]<FORK>Fig. 1'
    found, figures = ocr_second.unlimited_blocks(output, 1000, 1000)
    assert found == [{'kind': 'image', 'text': 'Fig. 1', 'box': [5.0, 6.0, 7.0, 8.0]}]
    assert figures == []


def test_output_feeds_ocr_compare_unchanged():
    found, _ = ocr_second.unlimited_blocks(PAGE, 1700, 2200)
    pytest.importorskip('numpy')
    sentences, nowhere = ocr_compare.compare(['はじめに', '本書を手に取っていただきありがとうございます。'], found)
    assert [s['status'] for s in sentences[:2]] == ['agree', 'agree']


def test_options():
    assert ocr_second.options(['a.pdf', '1-3', 'out']) == ('unlimited', ocr_second.SERVER, ['a.pdf', '1-3', 'out'])
    assert ocr_second.options(['--engine', 'xiaomi', 'x', 'y']) == ('xiaomi', ocr_second.SERVER, ['x', 'y'])
    assert ocr_second.options(['--server', 'http://h:1/', 'x', 'y'])[1] == 'http://h:1'
    with pytest.raises(SystemExit):
        ocr_second.options(['--engine', 'other', 'x', 'y'])
