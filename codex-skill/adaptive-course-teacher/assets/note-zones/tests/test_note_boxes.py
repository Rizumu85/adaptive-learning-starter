"""Tests for note_boxes.py, without any OCR model.

The OCR drafts are written by hand (made-up labels on a made-up picture), so what is tested is the pairing itself:
which line goes to which note, what is adopted, what stays doubtful, what the batch mode keeps, and the report.
"""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import note_boxes  # noqa: E402

BOUNDS = [100, 100, 900, 700]


def line(text, x0, y0, x1, y1):
    return {'text': text, 'score': None, 'box': [x0, y0, x1, y1]}


def notes(*texts):
    return [{'id': f'n{i + 1}', 'text': text} for i, text in enumerate(texts)]


def by_id(proposal):
    return {note['id']: note for note in proposal['notes']}


def test_a_line_read_exactly_is_paired_and_sure():
    proposal = note_boxes.pair([line('blue kettle', 200, 200, 330, 225)], BOUNDS, notes('blue kettle', 'paper lantern'))
    found = by_id(proposal)
    assert found['n1']['verdict'] == 'auto' and found['n1']['strict']
    assert found['n1']['box'] == [200, 200, 330, 225]
    assert found['n2']['verdict'] == 'none' and found['n2']['box'] is None
    assert proposal['summary'] == {'auto': 1, 'doubtful': 0, 'none': 1}


def test_two_lines_of_one_note_become_one_box():
    lines = [line('a shelf for the', 200, 200, 360, 222), line('winter blankets', 204, 226, 350, 248)]
    found = by_id(note_boxes.pair(lines, BOUNDS, notes('a shelf for the winter blankets')))
    assert found['n1']['verdict'] == 'auto'
    assert found['n1']['box'] == [200, 200, 360, 248]


def test_a_matching_line_far_from_the_rest_of_the_note_is_not_taken():
    lines = [line('winter blankets', 200, 200, 350, 222), line('winter', 700, 600, 760, 622)]
    proposal = note_boxes.pair(lines, BOUNDS, notes('winter blankets'))
    assert by_id(proposal)['n1']['box'] == [200, 200, 350, 222]
    assert [l['text'] for l in proposal['unassigned']] == ['winter']


def test_an_unread_line_next_to_a_paired_one_joins_it_but_only_as_auto_not_strict():
    # the second line of the note came out as noise; it sits directly under the first
    lines = [line('folding screen', 200, 200, 340, 222), line('x7#q kv', 202, 225, 300, 247)]
    found = by_id(note_boxes.pair(lines, BOUNDS, notes('folding screen by the door')))
    assert [l['how'] for l in found['n1']['lines']] == ['text', 'adjacent']
    assert found['n1']['box'] == [200, 200, 340, 247]
    assert found['n1']['verdict'] == 'auto'
    assert not found['n1']['strict']


def test_an_unread_line_is_not_adopted_by_a_note_that_is_already_complete():
    lines = [line('tea tin', 200, 200, 270, 222), line('zzqqxxww', 202, 225, 300, 247)]
    proposal = note_boxes.pair(lines, BOUNDS, notes('tea tin'))
    assert by_id(proposal)['n1']['box'] == [200, 200, 270, 222]
    assert len(proposal['unassigned']) == 1


def test_too_few_characters_found_is_doubtful():
    # one line of a three-line note: the box is only part of the note
    found = by_id(note_boxes.pair([line('a basin for', 200, 200, 300, 222)], BOUNDS, notes('a basin for the drip from the leaking roof')))
    assert found['n1']['verdict'] == 'doubtful' and not found['n1']['strict']


def test_a_weak_match_serves_only_a_note_with_nothing_and_stays_doubtful():
    lines = [line('paper lantern', 200, 200, 330, 222), line('kxxtxxx', 500, 400, 600, 422)]
    found = by_id(note_boxes.pair(lines, BOUNDS, notes('paper lantern', 'kettle')))
    assert found['n1']['verdict'] == 'auto'
    assert found['n2']['verdict'] == 'doubtful' and found['n2']['lines'][0]['how'] == 'weak'


def test_lines_outside_the_picture_or_in_an_excluded_region_are_ignored():
    lines = [line('paper lantern', 10, 10, 90, 30), line('paper lantern', 500, 500, 630, 522)]
    proposal = note_boxes.pair(lines, BOUNDS, notes('paper lantern'), exclude=[[480, 480, 700, 560]])
    assert by_id(proposal)['n1']['verdict'] == 'none'
    assert proposal['unassigned'] == []


def test_a_padded_box_is_cut_back_to_the_picture():
    found = by_id(note_boxes.pair([line('paper lantern', 95, 96, 230, 125)], BOUNDS, notes('paper lantern')))
    assert found['n1']['box'] == [100, 100, 230, 125]


def test_width_and_punctuation_do_not_count():
    found = by_id(note_boxes.pair([line('ＡＢ－１２，ｃ', 200, 200, 300, 222)], BOUNDS, notes('ab 12 c')))
    assert found['n1']['verdict'] == 'auto' and found['n1']['strict']


def test_strict_wants_nearly_every_character_and_all_of_a_short_note():
    close = by_id(note_boxes.pair([line('paper lanterm', 200, 200, 330, 222)], BOUNDS, notes('paper lantern')))
    assert close['n1']['verdict'] == 'auto' and close['n1']['strict']          # 11 of 12 letters
    loose = by_id(note_boxes.pair([line('paper lxxtexn', 200, 200, 330, 222)], BOUNDS, notes('paper lantern')))
    assert loose['n1']['verdict'] == 'auto' and not loose['n1']['strict']
    short = by_id(note_boxes.pair([line('wc', 200, 200, 230, 222)], BOUNDS, notes('wc')))
    assert short['n1']['strict']
    short_off = by_id(note_boxes.pair([line('wo', 200, 200, 230, 222)], BOUNDS, notes('wc')))
    assert not short_off['n1']['strict']


def test_two_notes_that_share_their_text_are_never_strict():
    lines = [line('store room', 200, 200, 300, 222), line('store room', 600, 500, 700, 522)]
    found = by_id(note_boxes.pair(lines, BOUNDS, notes('store room', 'store room')))
    assert not found['n1']['strict'] and not found['n2']['strict']


def test_a_label_written_twice_gets_a_box_at_each_place():
    lines = [line('lift', 200, 600, 240, 622), line('lift', 700, 600, 740, 622), line('stairs', 400, 300, 470, 322)]
    found = by_id(note_boxes.pair(lines, BOUNDS, notes('lift', 'stairs')))
    assert found['n1']['box'] == [200, 600, 240, 622]
    assert found['n1']['more'] == [[700, 600, 740, 622]]
    assert found['n2']['more'] == []


def test_batch_keeps_only_strict_boxes_and_lists_what_is_left(tmp_path):
    (tmp_path / 'p0001.json').write_text(json.dumps({'lines': [
        line('paper lantern', 200, 200, 330, 222), line('folding screen', 500, 200, 640, 222), line('x7#q kv', 502, 225, 600, 247),
        line('lift', 200, 600, 240, 622), line('lift', 700, 600, 740, 622)]}), encoding='utf-8')
    (tmp_path / 'p0002.json').write_text(json.dumps({'lines': [line('tea tin', 200, 200, 270, 222)]}), encoding='utf-8')
    figures = [
        {'figure': 'room', 'page': 'p0001', 'bounds': BOUNDS, 'notes': notes('paper lantern', 'folding screen by the door', 'lift', 'drying rack')},
        {'figure': 'shelf', 'page': 'p0002', 'bounds': BOUNDS, 'notes': [{'id': 's1', 'text': 'tea tin'}]},
        {'figure': 'lost', 'page': 'p0009', 'bounds': BOUNDS, 'notes': [{'id': 'm1', 'text': 'anything'}]},
    ]
    boxes, report = note_boxes.batch(figures, tmp_path)
    assert boxes == {'n1': [200, 200, 330, 222], 'n3': [[200, 600, 240, 622], [700, 600, 740, 622]], 's1': [200, 200, 270, 222]}
    assert (report['figures'], report['notes'], report['placed']) == (3, 6, 3)
    assert (report['figures_complete'], report['figures_untouched']) == (1, 1)
    # most missing first
    assert [row['figure'] for row in report['by_figure']] == ['room', 'lost', 'shelf']
    assert report['by_figure'][0]['missing'] == ['n2', 'n4']
    assert report['by_figure'][1]['problem'] == 'no OCR draft for this page'


def test_command_line_single_picture_and_batch(tmp_path, capsys):
    draft = tmp_path / 'p0001.json'
    draft.write_text(json.dumps({'lines': [line('paper lantern', 200, 200, 330, 222)]}), encoding='utf-8')
    wanted = tmp_path / 'notes.json'
    wanted.write_text(json.dumps({'a': 'paper lantern', 'b': 'drying rack'}), encoding='utf-8')
    out = tmp_path / 'one.json'
    note_boxes.main([str(draft), '--bounds', '100', '100', '900', '700', '--notes', str(wanted), '--out', str(out)])
    assert json.loads(out.read_text(encoding='utf-8'))['summary'] == {'auto': 1, 'doubtful': 0, 'none': 1}
    assert '2 notes: 1 auto, 0 doubtful, 1 none' in capsys.readouterr().err

    figures = tmp_path / 'figures.json'
    figures.write_text(json.dumps([{'figure': 'room', 'page': 'p0001', 'bounds': BOUNDS, 'notes': [{'id': 'a', 'text': 'paper lantern'}]}]), encoding='utf-8')
    kept, listing = tmp_path / 'boxes.json', tmp_path / 'report.json'
    note_boxes.main(['--batch', str(figures), '--ocr-dir', str(tmp_path), '--out', str(kept), '--report', str(listing)])
    assert json.loads(kept.read_text(encoding='utf-8')) == {'a': [200, 200, 330, 222]}
    assert json.loads(listing.read_text(encoding='utf-8'))['figures_complete'] == 1
    with pytest.raises(SystemExit):
        note_boxes.main(['--batch', str(figures)])


def test_check_sheet_is_drawn(tmp_path):
    image = pytest.importorskip('PIL.Image')
    page = tmp_path / 'page.png'
    image.new('RGB', (1000, 800), 'white').save(page)
    proposal = note_boxes.pair([line('paper lantern', 200, 200, 330, 222), line('zzqq', 600, 600, 660, 622)], BOUNDS, notes('paper lantern'))
    size = note_boxes.sheet(page, BOUNDS, proposal, tmp_path / 'sheet.png')
    assert (tmp_path / 'sheet.png').exists() and size[0] >= 800
    decided = note_boxes.sheet(page, BOUNDS, None, tmp_path / 'decided.png', {'n1': [200, 200, 330, 222], 'n2': [[300, 300, 340, 320], [500, 300, 540, 320]]})
    assert (tmp_path / 'decided.png').exists() and decided == size
