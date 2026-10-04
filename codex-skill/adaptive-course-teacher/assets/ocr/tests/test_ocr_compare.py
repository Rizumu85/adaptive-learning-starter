"""Tests for ocr_compare.py and the markdown handling of ocr_second.py, without any OCR model.

The drafts are written by hand, so what is tested is the comparison itself: which sentences count as
agreeing, how a difference is reported, what lands in first_only, and the risk marks.
"""
import json
import sys
from pathlib import Path

import pytest

pytest.importorskip('numpy')
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import ocr_compare  # noqa: E402
import ocr_second  # noqa: E402


def blocks(*texts):
    return [{'kind': 'text', 'text': t} for t in texts]


def test_sentences_split_across_first_engine_lines_still_agree():
    second = blocks('The quick brown fox jumps over the lazy dog. A second sentence follows here.')
    first = ['The quick brown fox', 'jumps over the lazy dog.', 'A second sentence', 'follows here.']
    sentences, nowhere = ocr_compare.compare(first, second)
    assert [s['status'] for s in sentences] == ['agree', 'agree']
    assert nowhere == []


def test_punctuation_and_spacing_do_not_count_as_a_difference():
    sentences, _ = ocr_compare.compare(['Hello , world : again and again'], blocks('Hello, world: again and again.'))
    assert sentences[0]['status'] == 'agree'


def test_a_different_reading_is_reported_with_both_readings():
    sentences, _ = ocr_compare.compare(['The quick brown fax jumps over it'], blocks('The quick brown fox jumps over it.'))
    assert sentences[0]['status'] == 'differ'
    assert sentences[0]['first'] == ['nf[o->a]']


def test_a_sentence_the_first_engine_lacks_is_second_only():
    second = blocks('First sentence of the page is here. Only the second engine has this one.')
    sentences, _ = ocr_compare.compare(['First sentence of the page is here.'], second)
    assert [s['status'] for s in sentences] == ['agree', 'second-only']


def test_a_caption_only_the_first_engine_read_is_listed_as_first_only():
    first = ['Body text that both engines read well.', 'Fig. 12 valve housing']
    sentences, nowhere = ocr_compare.compare(first, blocks('Body text that both engines read well.'))
    assert sentences[0]['status'] == 'agree'
    assert nowhere == [1]


def test_everything_is_first_only_when_the_second_draft_is_empty():
    sentences, nowhere = ocr_compare.compare(['one line', 'another line'], [])
    assert sentences == [] and nowhere == [0, 1]


def test_risk_marks_are_listed_even_when_the_engines_agree():
    text = 'コンセプトアートのキヤラクタ一'  # b/p kana, a large ya after ki, and the numeral one after katakana
    sentences, _ = ocr_compare.compare([text], blocks(text))
    assert sentences[0]['status'] == 'agree'
    kinds = {r['kind'] for r in sentences[0]['risk']}
    assert kinds == {'katakana b or p', 'ya, yu or yo that may be small', 'long mark or the numeral one'}


def test_plain_text_has_no_risk_marks():
    sentences, _ = ocr_compare.compare(['A plain English sentence.'], blocks('A plain English sentence.'))
    assert 'risk' not in sentences[0]


def test_main_writes_one_report_per_page_and_a_summary(tmp_path, monkeypatch, capsys):
    first, second, out = tmp_path / 'ocr', tmp_path / 'ocr2', tmp_path / 'compare'
    first.mkdir()
    second.mkdir()
    (first / 'p0001.json').write_text(json.dumps({'page': 'p0001', 'lines': [
        {'text': 'The quick brown fax', 'score': 0.9, 'box': [10, 10, 500, 30]},
        {'text': 'Page 7', 'score': 0.9, 'box': [10, 900, 80, 920]}]}), encoding='utf-8')
    (second / 'p0001.json').write_text(json.dumps({'page': 'p0001', 'blocks': blocks('The quick brown fox.')}), encoding='utf-8')
    (second / 'p0002.json').write_text(json.dumps({'page': 'p0002', 'blocks': []}), encoding='utf-8')  # no first draft
    monkeypatch.setattr(sys, 'argv', ['ocr_compare.py', str(first), str(second), str(out)])
    ocr_compare.main()
    report = json.loads((out / 'p0001.json').read_text(encoding='utf-8'))
    assert report['sentences'][0]['status'] == 'differ'
    assert [line['text'] for line in report['first_only']] == ['Page 7']
    assert report['first_only'][0]['box'] == [10, 900, 80, 920]
    summary = json.loads((out / 'summary.json').read_text(encoding='utf-8'))
    assert summary == {'pages': 1, 'agree': 0, 'differ': 1, 'second-only': 0, 'first-only lines': 1, 'risk marks': 0}
    assert 'p0002 has no first draft' in capsys.readouterr().out


# ocr_second: the model's markdown ---------------------------------------------------------------

def test_markdown_becomes_headings_text_and_list_items():
    out = ocr_second.blocks('# Title\n\nA paragraph.\n- an item\n')
    assert out == [{'kind': 'heading', 'text': 'Title'}, {'kind': 'text', 'text': 'A paragraph.'}, {'kind': 'text', 'text': 'an item'}]


def test_table_markup_becomes_rows_of_cells():
    out = ocr_second.blocks('<fcel>Name<fcel>Size<nl><fcel>door<ecel><nl>')
    assert out == [{'kind': 'table', 'text': 'Name | Size\ndoor'}]


def test_table_markup_never_reaches_the_comparison():
    table = ocr_second.blocks('<fcel>alpha beta gamma<fcel>delta epsilon<nl>')
    sentences, nowhere = ocr_compare.compare(['alpha beta gamma', 'delta epsilon'], table)
    assert all(s['status'] == 'agree' for s in sentences) and nowhere == []
