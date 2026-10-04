"""Tests for crop_audit.py on small synthetic pages drawn with Pillow (no book pages).

Pages are 1000 px wide, so with unit 1000 a box's coordinates are its pixel coordinates.
"""
import json
import sys
from pathlib import Path

import pytest
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import crop_audit  # noqa: E402

WIDTH, PORTRAIT = 1000, 1414
BLACK = 0


def page(tmp_path, name='page.png', rects=(), size=(WIDTH, PORTRAIT)):
    """A white page with filled rectangles [(x0, y0, x1, y1, grey), ...] (end exclusive)."""
    image = Image.new('L', size, 255)
    draw = ImageDraw.Draw(image)
    for x0, y0, x1, y1, grey in rects:
        draw.rectangle((x0, y0, x1 - 1, y1 - 1), fill=grey)
    path = tmp_path / name
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)
    return str(path)


def output(tmp_path, name, size, background, rects=()):
    """An output crop: RGBA with the given background (alpha 0 for a transparent one) and black shapes."""
    image = Image.new('RGBA', size, background)
    draw = ImageDraw.Draw(image)
    for x0, y0, x1, y1 in rects:
        draw.rectangle((x0, y0, x1 - 1, y1 - 1), fill=(0, 0, 0, 255))
    path = tmp_path / name
    image.save(path)
    return str(path)


def figure(page_path, bounds, id='fig', **extra):
    return {'id': id, 'page': page_path, 'bounds': list(bounds), **extra}


def kinds(issues, id=None):
    return [i['kind'] for i in issues if id is None or i['id'] == id]


# clipped ---------------------------------------------------------------------------------------

def test_clipped_reports_a_line_that_keeps_going_past_the_edge(tmp_path):
    # A 6 px rule from x=100 to 600 crosses both side edges of the box.
    p = page(tmp_path, rects=[(100, 500, 600, 506, BLACK)])
    issues = crop_audit.audit([figure(p, (200, 400, 400, 600))])
    details = [i['detail'] for i in issues if i['kind'] == 'clipped']
    assert any(d.startswith('right edge crosses ink at 6 px') for d in details)
    assert any(d.startswith('left edge') for d in details)


def test_clipped_ignores_a_photo_trimmed_by_a_few_pixels(tmp_path):
    # The dark block runs 5 px past the right edge: within BAND, not beyond it, so nothing is cut.
    p = page(tmp_path, rects=[(200, 400, 405, 600, 60)])
    assert kinds(crop_audit.audit([figure(p, (200, 400, 400, 600))])) == []


def test_clipped_ignores_a_drawing_inside_the_box(tmp_path):
    p = page(tmp_path, rects=[(250, 450, 350, 550, BLACK)])
    assert kinds(crop_audit.audit([figure(p, (200, 400, 400, 600))])) == []


def test_clipped_ignores_a_line_thinner_than_min_hits(tmp_path):
    p = page(tmp_path, rects=[(100, 500, 600, 502, BLACK)])  # 2 px, MIN_HITS is 3
    assert kinds(crop_audit.audit([figure(p, (200, 400, 400, 600))])) == []


def test_clipped_skips_edge_pixels_inside_an_exclude_box(tmp_path):
    p = page(tmp_path, rects=[(300, 500, 600, 506, BLACK)])
    fig = figure(p, (200, 400, 400, 600), exclude=[[350, 480, 400, 520]])
    assert kinds(crop_audit.audit([fig])) == []


def test_clipped_names_the_neighbour_the_line_runs_into(tmp_path):
    p = page(tmp_path, rects=[(300, 500, 600, 506, BLACK)])
    issues = crop_audit.audit([figure(p, (200, 400, 400, 600), id='a'), figure(p, (403, 400, 600, 600), id='b')])
    assert any(i['id'] == 'a' and '(runs into b)' in i['detail'] for i in issues)


def test_audit_ok_accepts_a_clipped_side(tmp_path):
    p = page(tmp_path, rects=[(300, 500, 600, 506, BLACK)])
    fig = figure(p, (200, 400, 400, 600), accepted=['clipped:right'])
    assert kinds(crop_audit.audit([fig])) == []
    fig['accepted'] = ['clipped:left']  # another side does not cover this one
    assert kinds(crop_audit.audit([fig])) == ['clipped']


# overlap ---------------------------------------------------------------------------------------

def overlapping(p, **b):
    # Boxes share x 300..400; a black block sits in the shared area.
    return [figure(p, (100, 100, 400, 400), id='a'), figure(p, (300, 100, 600, 400), id='b', **b)]


def test_overlap_reports_ink_of_the_shared_area_shown_in_both(tmp_path):
    p = page(tmp_path, rects=[(320, 200, 380, 300, BLACK)])
    issues = crop_audit.audit(overlapping(p))
    assert [(i['id'], i['kind']) for i in issues] == [('a', 'overlap')]
    assert '6000 ink px' in issues[0]['detail']


def test_overlap_ignores_a_shared_area_excluded_from_one_crop(tmp_path):
    p = page(tmp_path, rects=[(320, 200, 380, 300, BLACK)])
    assert kinds(crop_audit.audit(overlapping(p, exclude=[[300, 100, 400, 400]]))) == []


def test_overlap_ignores_a_shared_area_transparent_in_one_output(tmp_path):
    p = page(tmp_path, rects=[(320, 200, 380, 300, BLACK)])
    # b's output is the box size, with the shared strip (its first 100 px) cut away and a drawing elsewhere.
    image = Image.new('RGBA', (300, 300), (0, 0, 0, 255))
    ImageDraw.Draw(image).rectangle((0, 0, 99, 299), fill=(0, 0, 0, 0))
    out = tmp_path / 'b.png'
    image.save(out)
    figs = overlapping(p, image=str(out))
    assert 'overlap' not in kinds(crop_audit.audit(figs))


def test_overlap_ignores_crops_of_different_groups(tmp_path):
    p = page(tmp_path, rects=[(320, 200, 380, 300, BLACK)])
    figs = overlapping(p, group='other-document')
    assert kinds(crop_audit.audit(figs)) == []


def test_overlap_ignores_a_shared_area_with_little_ink(tmp_path):
    p = page(tmp_path, rects=[(340, 200, 350, 210, BLACK)])  # 100 px < MIN_SHARED_INK
    assert kinds(crop_audit.audit(overlapping(p))) == []


@pytest.mark.parametrize('holder', ['a', 'b'])
def test_audit_ok_accepts_an_overlap_on_either_crop(tmp_path, holder):
    p = page(tmp_path, rects=[(320, 200, 380, 300, BLACK)])
    figs = overlapping(p)
    next(f for f in figs if f['id'] == holder)['accepted'] = ['overlap']
    assert kinds(crop_audit.audit(figs)) == []


# near-empty ------------------------------------------------------------------------------------

def test_near_empty_reports_an_output_without_ink(tmp_path):
    p = page(tmp_path)
    out = output(tmp_path, 'blank.png', (200, 200), (0, 0, 0, 0))
    assert kinds(crop_audit.audit([figure(p, (200, 400, 400, 600), image=out)])) == ['near-empty']


def test_near_empty_ignores_an_output_with_a_drawing(tmp_path):
    p = page(tmp_path)
    out = output(tmp_path, 'drawn.png', (200, 200), (0, 0, 0, 0), rects=[(50, 50, 150, 150)])
    assert kinds(crop_audit.audit([figure(p, (200, 400, 400, 600), image=out)])) == []


def test_audit_ok_accepts_near_empty(tmp_path):
    p = page(tmp_path)
    out = output(tmp_path, 'blank.png', (200, 200), (0, 0, 0, 0))
    assert kinds(crop_audit.audit([figure(p, (200, 400, 400, 600), image=out, accepted=['near-empty'])])) == []


# paper -----------------------------------------------------------------------------------------

def test_paper_reports_an_opaque_drawing_on_white(tmp_path):
    p = page(tmp_path)
    out = output(tmp_path, 'opaque.png', (200, 200), (250, 248, 240, 255), rects=[(50, 50, 150, 150)])
    issues = crop_audit.audit([figure(p, (200, 400, 400, 600), image=out)])
    assert kinds(issues) == ['paper']
    assert '100% of its edge is paper' in issues[0]['detail']


def test_paper_ignores_a_transparent_output(tmp_path):
    p = page(tmp_path)
    out = output(tmp_path, 'cutout.png', (200, 200), (255, 255, 255, 0), rects=[(50, 50, 150, 150)])
    assert crop_audit.paper_border(out) is None
    assert kinds(crop_audit.audit([figure(p, (200, 400, 400, 600), image=out)])) == []


def test_paper_ignores_a_photo_that_fills_its_frame(tmp_path):
    p = page(tmp_path)
    out = output(tmp_path, 'photo.png', (200, 200), (90, 120, 60, 255))
    assert crop_audit.paper_border(out) == 0
    assert kinds(crop_audit.audit([figure(p, (200, 400, 400, 600), image=out)])) == []


def test_audit_ok_accepts_paper(tmp_path):
    p = page(tmp_path)
    out = output(tmp_path, 'opaque.png', (200, 200), (250, 248, 240, 255), rects=[(50, 50, 150, 150)])
    assert kinds(crop_audit.audit([figure(p, (200, 400, 400, 600), image=out, accepted=['paper'])])) == []


def ring_cleared(tmp_path, name, frame=False):
    """A crop marked transparent where only a thin outer ring was cleared: white paper inside, a drawing
    in the middle. With frame=True the opaque part ends at a black frame line instead (white inside a
    frame is part of the picture)."""
    image = Image.new('RGBA', (400, 400), (255, 255, 255, 0))
    draw = ImageDraw.Draw(image)
    draw.rectangle((10, 10, 389, 389), fill=(250, 249, 244, 255))
    if frame:
        draw.rectangle((10, 10, 389, 389), outline=(0, 0, 0, 255), width=8)
    draw.rectangle((150, 150, 250, 250), fill=(0, 0, 0, 255))
    path = tmp_path / name
    image.save(path)
    return str(path)


def test_paper_reports_a_transparent_output_that_only_lost_a_ring(tmp_path):
    p = page(tmp_path)
    out = ring_cleared(tmp_path, 'ring.png')
    issues = crop_audit.audit([figure(p, (200, 400, 400, 600), image=out)])
    assert kinds(issues) == ['paper']
    assert 'has transparency' in issues[0]['detail']


def test_paper_ignores_white_inside_a_frame(tmp_path):
    p = page(tmp_path)
    out = ring_cleared(tmp_path, 'framed.png', frame=True)
    opaque, light, rim = crop_audit.paper_left(out)
    assert opaque >= crop_audit.STILL_OPAQUE and light >= crop_audit.STILL_PAPER and rim < crop_audit.PAPER_RIM
    assert kinds(crop_audit.audit([figure(p, (200, 400, 400, 600), image=out)])) == []


def test_audit_ok_accepts_paper_left_in_a_transparent_output(tmp_path):
    p = page(tmp_path)
    out = ring_cleared(tmp_path, 'ring.png')
    assert kinds(crop_audit.audit([figure(p, (200, 400, 400, 600), image=out, accepted=['paper'])])) == []


# outside ---------------------------------------------------------------------------------------

@pytest.mark.parametrize('bounds', [(900, 100, 1050, 200), (-30, 100, 200, 200), (100, 1300, 300, 1500)])
def test_outside_reports_a_box_past_the_page(tmp_path, bounds):
    p = page(tmp_path)
    assert kinds(crop_audit.audit([figure(p, bounds)])) == ['outside']


def test_outside_accepts_a_box_below_1000_on_a_portrait_page(tmp_path):
    # y is on the page-width scale: an A4 page runs to about 1414, so 1400 is still on it.
    p = page(tmp_path)
    assert kinds(crop_audit.audit([figure(p, (100, 1200, 300, 1400))])) == []


def test_outside_uses_the_record_unit(tmp_path):
    p = page(tmp_path)  # unit 100: the page is 0..100 wide and 0..141.4 high
    assert kinds(crop_audit.audit([figure(p, (10, 120, 30, 140))], unit=100)) == []
    assert kinds(crop_audit.audit([figure(p, (10, 120, 30, 150))], unit=100)) == ['outside']


# scale -----------------------------------------------------------------------------------------

LOW_BOXES = [(100, 60 + 120 * i, 300, 150 + 120 * i) for i in range(8)]  # bottoms 150..990, two >= 850


def test_scale_reports_boxes_that_all_stop_at_1000_on_portrait_pages(tmp_path):
    p = page(tmp_path)
    issues = crop_audit.audit([figure(p, b, id=f'f{i}') for i, b in enumerate(LOW_BOXES)])
    assert [(i['id'], i['kind']) for i in issues] == [('*', 'scale')]


def test_scale_ignores_a_record_with_a_box_lower_on_the_page(tmp_path):
    p = page(tmp_path)
    boxes = LOW_BOXES + [(100, 1100, 300, 1300)]
    assert kinds(crop_audit.audit([figure(p, b, id=f'f{i}') for i, b in enumerate(boxes)])) == []


def test_scale_ignores_landscape_pages(tmp_path):
    p = page(tmp_path, size=(WIDTH, 1000))
    assert kinds(crop_audit.audit([figure(p, b, id=f'f{i}') for i, b in enumerate(LOW_BOXES)])) == []


def test_scale_needs_eight_boxes(tmp_path):
    p = page(tmp_path)
    assert kinds(crop_audit.audit([figure(p, b, id=f'f{i}') for i, b in enumerate(LOW_BOXES[1:])])) == []


# review sheets ---------------------------------------------------------------------------------

def test_sheets_are_written_only_for_flagged_crops(tmp_path):
    p = page(tmp_path, rects=[(300, 500, 600, 506, BLACK), (650, 100, 700, 150, BLACK)])
    sheets = tmp_path / 'sheets'
    crop_audit.audit([figure(p, (200, 400, 400, 600), id='cut'), figure(p, (600, 50, 750, 200), id='fine')],
                     sheets=str(sheets))
    assert sorted(f.name for f in sheets.iterdir()) == ['cut.jpg']


# crop record -----------------------------------------------------------------------------------

def record(tmp_path, data):
    path = tmp_path / 'crops.json'
    path.write_text(json.dumps(data), encoding='utf-8')
    return path


def test_load_record_resolves_pages_outputs_and_audit_ok(tmp_path):
    path = record(tmp_path, {'unit': 1000, 'pages': 'pages/p{page:04}.png', 'crops': [
        {'id': 'a', 'page': 7, 'bounds': [1, 2, 3, 4], 'output': 'images/a.webp', 'group': 'ch1',
         'exclude': [[1, 1, 2, 2]], 'audit_ok': ['paper']}]})
    figures, unit, skipped = crop_audit.load_record(path)
    assert unit == 1000 and skipped == []
    assert figures == [{'id': 'a', 'page': str(tmp_path / 'pages' / 'p0007.png'), 'bounds': [1, 2, 3, 4],
                        'image': str(tmp_path / 'images' / 'a.webp'), 'group': 'ch1',
                        'exclude': [[1, 1, 2, 2]], 'accepted': ['paper']}]


def test_load_record_takes_each_crops_page_from_its_edition(tmp_path):
    path = record(tmp_path, {'pages': {'en': 'en/{page}.png', 'zh': 'zh/{page}.png'}, 'crops': [
        {'id': 'a-en', 'edition': 'en', 'page': 3, 'bounds': [200, 400, 400, 600]},
        {'id': 'a-zh', 'edition': 'zh', 'page': 5, 'bounds': [200, 400, 400, 600]}]})
    figures, _, _ = crop_audit.load_record(path)
    assert [f['page'] for f in figures] == [str(tmp_path / 'en' / '3.png'), str(tmp_path / 'zh' / '5.png')]
    # Only the zh page has a rule across the box, so only the zh crop is clipped.
    page(tmp_path, 'en/3.png')
    page(tmp_path, 'zh/5.png', rects=[(300, 500, 600, 506, BLACK)])
    assert {i['id'] for i in crop_audit.audit(figures) if i['kind'] == 'clipped'} == {'a-zh'}


def test_load_record_checks_each_part_of_a_spread_on_its_own_page(tmp_path):
    path = record(tmp_path, {'pages': {'en': 'en/{page}.png', 'zh': 'zh/{page}.png'}, 'crops': [
        {'id': 'spread', 'edition': 'en', 'page': [72, 73], 'output': 'images/spread.webp', 'group': 'g',
         'audit_ok': ['clipped:right'], 'exclude': [[0, 0, 5, 5]],
         'parts': [{'page': 72, 'bounds': [500, 100, 1000, 600]},
                   {'page': 73, 'bounds': [0, 100, 500, 600], 'exclude': [[10, 10, 20, 20]], 'edition': 'zh'}]}]})
    figures, _, skipped = crop_audit.load_record(path)
    assert skipped == []
    assert [(f['id'], f['page'], f['bounds'], f['exclude'], f['image'], f['group'], f['accepted']) for f in figures] == [
        ('spread#1', str(tmp_path / 'en' / '72.png'), [500, 100, 1000, 600], [], None, 'g', ['clipped:right']),
        ('spread#2', str(tmp_path / 'zh' / '73.png'), [0, 100, 500, 600], [[10, 10, 20, 20]], None, 'g', ['clipped:right'])]


def test_load_record_lists_entries_it_cannot_check(tmp_path):
    path = record(tmp_path, {'pages': 'p{page}.png', 'crops': [
        {'id': 'whole', 'page': 4, 'whole_page': True, 'output': 'w.webp'},
        {'id': 'outline', 'page': 4, 'polygon': [[0, 0], [1, 1], [0, 1]]},
        {'id': 'boxed', 'page': 4, 'bounds': [0, 0, 10, 10]}]})
    figures, _, skipped = crop_audit.load_record(path)
    assert [f['id'] for f in figures] == ['boxed']
    assert skipped == ['whole', 'outline']


def test_load_record_without_pages_explains_what_to_do(tmp_path):
    path = record(tmp_path, {'crops': [{'id': 'a', 'page': 1, 'bounds': [0, 0, 10, 10]}]})
    with pytest.raises(SystemExit) as stop:
        crop_audit.load_record(path)
    assert 'no "pages" pattern' in str(stop.value)


def test_load_record_without_an_edition_names_the_crop(tmp_path):
    path = record(tmp_path, {'pages': {'en': 'en/{page}.png'}, 'crops': [
        {'id': 'nameless', 'page': 1, 'bounds': [0, 0, 10, 10]}]})
    with pytest.raises(SystemExit) as stop:
        crop_audit.load_record(path)
    assert 'nameless' in str(stop.value) and 'edition' in str(stop.value)


# command line ----------------------------------------------------------------------------------

def run_main(monkeypatch, capsys, *argv):
    monkeypatch.setattr(sys, 'argv', ['crop_audit.py', *map(str, argv)])
    with pytest.raises(SystemExit) as stop:
        crop_audit.main()
    return stop.value.code, capsys.readouterr().out


def test_main_flags_writes_sheets_and_exits_1(tmp_path, monkeypatch, capsys):
    page(tmp_path, 'p1.png', rects=[(300, 500, 600, 506, BLACK)])
    path = record(tmp_path, {'pages': 'p{page}.png', 'crops': [
        {'id': 'cut', 'page': 1, 'bounds': [200, 400, 400, 600]},
        {'id': 'whole', 'page': 1, 'whole_page': True}]})
    code, out = run_main(monkeypatch, capsys, path, '--sheets', tmp_path / 'sheets')
    assert code == 1
    assert 'clipped    cut: right edge' in out
    assert '1 crops checked, 1 flagged; not checked (no single page box): whole' in out
    assert (tmp_path / 'sheets' / 'cut.jpg').is_file()


def test_main_exits_0_when_nothing_is_flagged(tmp_path, monkeypatch, capsys):
    page(tmp_path, 'p1.png')
    path = record(tmp_path, {'pages': 'p{page}.png', 'crops': [{'id': 'ok', 'page': 1, 'bounds': [200, 400, 400, 600]}]})
    code, out = run_main(monkeypatch, capsys, path)
    assert code == 0 and '1 crops checked, 0 flagged' in out


def test_main_stops_when_page_images_are_missing(tmp_path, monkeypatch, capsys):
    path = record(tmp_path, {'pages': 'p{page}.png', 'crops': [{'id': 'a', 'page': 1, 'bounds': [0, 0, 10, 10]}]})
    code, _ = run_main(monkeypatch, capsys, path)
    assert 'Page images not found' in str(code)


def test_main_only_keeps_the_parts_of_a_named_spread(tmp_path, monkeypatch, capsys):
    page(tmp_path, 'p1.png', rects=[(300, 500, 600, 506, BLACK)])
    page(tmp_path, 'p2.png')
    path = record(tmp_path, {'pages': 'p{page}.png', 'crops': [
        {'id': 'single', 'page': 1, 'bounds': [200, 400, 400, 600], 'group': 'g1'},
        {'id': 'spread', 'page': [1, 2], 'group': 'g2', 'parts': [
            {'page': 1, 'bounds': [200, 400, 400, 600]}, {'page': 2, 'bounds': [0, 0, 100, 100]}]}]})
    code, out = run_main(monkeypatch, capsys, path, '--only', 'spread')
    assert '2 crops checked' in out and 'spread#1' in out and 'single' not in out
    assert code == 1
