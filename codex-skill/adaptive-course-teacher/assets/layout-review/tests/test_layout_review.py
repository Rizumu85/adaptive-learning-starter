"""Tests for the pure parts of layout_review.py: no browser, no PDF, no Node."""
import json
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import layout_review  # noqa: E402


# page_numbers ----------------------------------------------------------------------------------

@pytest.mark.parametrize('text, numbers', [
    ('7', [7]),
    ('34-39', [34, 35, 36, 37, 38, 39]),
    ('34-36,40', [34, 35, 36, 40]),
    ('1,3,5', [1, 3, 5]),
    ('2-3,8-9', [2, 3, 8, 9]),
    ('5-5', [5]),
    (' 34 - 36 , 40 ', [34, 35, 36, 40]),
])
def test_page_numbers(text, numbers):
    assert layout_review.page_numbers(text) == numbers


@pytest.mark.parametrize('text', ['', 'a-b', '34–39', '34-36,'])
def test_page_numbers_rejects_what_is_not_a_page_list(text):
    with pytest.raises(ValueError):
        layout_review.page_numbers(text)


def test_page_numbers_rejects_a_range_that_runs_backwards():
    with pytest.raises(ValueError, match='39-34'):
        layout_review.page_numbers('39-34')


# printed_arrangement ---------------------------------------------------------------------------

def arrange(tmp_path, crops, screen, unit=None, widths=None):
    """Run printed_arrangement on a crop record and the screen positions {file: (y, h)} at 1440 px."""
    data = {'crops': crops}
    if unit:
        data['unit'] = unit
    path = tmp_path / 'crops.json'
    path.write_text(json.dumps(data), encoding='utf-8')
    figures = [{'file': name, 'x': 0, 'y': y, 'w': 300, 'h': h} for name, (y, h) in screen.items()]
    report = {'widths': widths or {'1440': {'figures': figures, 'findings': []},
                                   '390': {'figures': [], 'findings': []}}}
    found = layout_review.printed_arrangement(report, path)
    assert report['widths']['1440']['findings'] == found
    return [(f['kind'], f['id'], f['with']) for f in found]


def crop(id, bounds, page=10, **extra):
    return {'id': id, 'page': page, 'bounds': list(bounds), 'output': f'images/{id}.webp', **extra}


# a and b sit side by side on the printed page with a 20-unit gutter
SIDE_BY_SIDE = [crop('a', (100, 200, 480, 500)), crop('b', (500, 220, 900, 480))]


def test_side_by_side_and_on_one_screen_row_is_fine(tmp_path):
    assert arrange(tmp_path, SIDE_BY_SIDE, {'a.webp': (1000, 300), 'b.webp': (1010, 280)}) == []


def test_side_by_side_but_stacked_on_screen_is_a_row_split(tmp_path):
    found = arrange(tmp_path, SIDE_BY_SIDE, {'a.webp': (1000, 300), 'b.webp': (1320, 280)})
    assert found == [('row-split', 'a', 'b')]


def test_pictures_above_each_other_in_print_may_stack(tmp_path):
    crops = [crop('a', (100, 100, 900, 400)), crop('b', (100, 450, 900, 800))]
    assert arrange(tmp_path, crops, {'a.webp': (1000, 300), 'b.webp': (1320, 300)}) == []


def test_side_by_side_on_different_pages_or_editions_is_not_compared(tmp_path):
    crops = [crop('a', (100, 200, 480, 500)), crop('b', (500, 220, 900, 480), page=11),
             crop('c', (500, 220, 900, 480), edition='zh')]
    screen = {'a.webp': (1000, 300), 'b.webp': (1320, 280), 'c.webp': (1700, 280)}
    assert arrange(tmp_path, crops, screen) == []


def test_spreads_and_pictures_missing_from_the_page_are_left_out(tmp_path):
    crops = [crop('a', (100, 200, 480, 500)), crop('spread', (500, 220, 900, 480), page=[10, 11]),
             crop('elsewhere', (500, 220, 900, 480))]
    assert arrange(tmp_path, crops, {'a.webp': (1000, 300), 'spread.webp': (1320, 280)}) == []


def test_only_the_widest_screen_is_compared(tmp_path):
    widths = {'390': {'figures': [{'file': 'a.webp', 'y': 0, 'h': 100}, {'file': 'b.webp', 'y': 500, 'h': 100}],
                      'findings': []},
              '1440': {'figures': [{'file': 'a.webp', 'y': 0, 'h': 100}, {'file': 'b.webp', 'y': 0, 'h': 100}],
                       'findings': []}}
    assert arrange(tmp_path, SIDE_BY_SIDE, {}, widths=widths) == []
    assert widths['390']['findings'] == []


@pytest.mark.parametrize('b_bounds', [
    (480, 200, 900, 500),   # abuts a on the right
    (479, 198, 900, 502),   # overlaps it by a unit, as rounding leaves it
    (100, 500, 480, 800),   # abuts a from below
])
def test_boxes_that_touch_along_an_edge_are_a_cut_frame(tmp_path, b_bounds):
    crops = [crop('a', (100, 200, 480, 500)), crop('b', b_bounds)]
    found = arrange(tmp_path, crops, {'a.webp': (1000, 300), 'b.webp': (1000 if b_bounds[1] < 500 else 1300, 300)})
    assert ('cut-frame', 'a', 'b') in found


def test_a_grid_with_a_gutter_is_not_a_cut_frame(tmp_path):
    # 2 x 2 panels with a 4-unit gutter, shown as a 2 x 2 grid on screen.
    crops = [crop('a', (100, 100, 448, 400)), crop('b', (452, 100, 800, 400)),
             crop('c', (100, 404, 448, 704)), crop('d', (452, 404, 800, 704))]
    screen = {'a.webp': (1000, 300), 'b.webp': (1000, 300), 'c.webp': (1310, 300), 'd.webp': (1310, 300)}
    assert arrange(tmp_path, crops, screen) == []


def test_boxes_touching_only_at_a_corner_are_not_a_cut_frame(tmp_path):
    crops = [crop('a', (100, 100, 400, 400)), crop('b', (400, 400, 700, 700))]
    assert arrange(tmp_path, crops, {'a.webp': (1000, 300), 'b.webp': (1310, 300)}) == []


def test_thresholds_follow_the_record_unit(tmp_path):
    # The same grid on a record measured in hundredths of the page width: a 0.4-unit gutter.
    crops = [crop('a', (10, 10, 44.8, 40)), crop('b', (45.2, 10, 80, 40))]
    assert arrange(tmp_path, crops, {'a.webp': (1000, 300), 'b.webp': (1000, 300)}, unit=100) == []
    crops = [crop('a', (10, 10, 45, 40)), crop('b', (45, 10, 80, 40))]
    assert arrange(tmp_path, crops, {'a.webp': (1000, 300), 'b.webp': (1000, 300)}, unit=100) == [
        ('cut-frame', 'a', 'b')]


# survey ----------------------------------------------------------------------------------------

def reader(tmp_path, *names):
    folder = tmp_path / 'reader'
    folder.mkdir()
    for name in names:
        (folder / name).write_text('<p>page</p>', encoding='utf-8')
    return folder


def report_json(findings=(), overflow=False):
    return {'widths': {'1440': {'findings': [{'kind': k, 'id': f'f{i}'} for i, k in enumerate(findings)],
                                'pageOverflow': overflow}}}


class FakeNode:
    """Stands in for subprocess.run: plays one outcome per call and writes report.json on success."""

    def __init__(self, outcomes, report=None):
        self.outcomes, self.report, self.calls = list(outcomes), report or report_json(), []

    def __call__(self, command, **options):
        self.calls.append(command)
        outcome = self.outcomes.pop(0)
        if outcome == 'timeout':
            raise subprocess.TimeoutExpired(command, options.get('timeout'))
        code, stdout, stderr = outcome
        if code == 0:
            target = Path(command[command.index('--out') + 1])
            target.mkdir(parents=True, exist_ok=True)
            (target / 'report.json').write_text(json.dumps(self.report), encoding='utf-8')
        return subprocess.CompletedProcess(command, code, stdout, stderr)


def run_survey(monkeypatch, tmp_path, node, *names):
    monkeypatch.setattr(layout_review.subprocess, 'run', node)
    out = tmp_path / 'survey'
    out.mkdir()
    layout_review.survey(reader(tmp_path, *names), out, None)
    return json.loads((out / 'survey.json').read_text(encoding='utf-8'))


def test_survey_runs_once_when_the_browser_starts(monkeypatch, tmp_path, capsys):
    node = FakeNode([(0, '', '')], report_json(['small-alone', 'wordless-run', 'small-alone'], overflow=True))
    rows = run_survey(monkeypatch, tmp_path, node, 'unit-01.html')
    assert len(node.calls) == 1
    command = node.calls[0]
    assert '--findings-only' in command and command[command.index('--widths') + 1] == '1440'
    assert rows == [[3, 'unit-01.html', 'small-alone 2, wordless-run 1 PAGE SCROLLS SIDEWAYS']]
    assert '1 pages, 1 with findings, 3 findings' in capsys.readouterr().out


def test_survey_retries_once_after_a_failure(monkeypatch, tmp_path):
    node = FakeNode([(1, '', 'Chrome did not start\n'), (0, '', '')], report_json(['overflow']))
    rows = run_survey(monkeypatch, tmp_path, node, 'unit-01.html')
    assert len(node.calls) == 2
    assert rows == [[1, 'unit-01.html', 'overflow 1']]


def test_survey_retries_once_after_a_timeout(monkeypatch, tmp_path):
    node = FakeNode(['timeout', (0, '', '')])
    rows = run_survey(monkeypatch, tmp_path, node, 'unit-01.html')
    assert len(node.calls) == 2 and rows == [[0, 'unit-01.html', '']]


@pytest.mark.parametrize('outcomes, problem', [
    ([(1, '', 'starting\nChrome did not start\n'), (1, '', 'launch\nChrome did not start again\n')],
     'failed: Chrome did not start again'),
    ([(1, 'only stdout here\n', ''), (1, 'stdout line\n', '')], 'failed: stdout line'),
    ([(1, '', ''), (1, '', '  \n')], 'failed'),
    (['timeout', 'timeout'], 'timed out'),
])
def test_survey_reports_a_page_that_fails_twice(monkeypatch, tmp_path, capsys, outcomes, problem):
    node = FakeNode(outcomes)
    rows = run_survey(monkeypatch, tmp_path, node, 'unit-01.html')
    assert len(node.calls) == 2
    assert rows == [[-1, 'unit-01.html', problem]]
    assert f'unit-01.html  {problem}' in capsys.readouterr().out


def test_survey_counts_a_run_without_report_as_failed(monkeypatch, tmp_path):
    class NoReport(FakeNode):
        def __call__(self, command, **options):
            self.calls.append(command)
            return subprocess.CompletedProcess(command, 0, 'done\n', '')
    node = NoReport([])
    assert run_survey(monkeypatch, tmp_path, node, 'unit-01.html') == [[-1, 'unit-01.html', 'failed: done']]
    assert len(node.calls) == 2


def test_survey_lists_pages_with_most_findings_first(monkeypatch, tmp_path):
    reports = {'a.html': report_json(['overflow']), 'b.html': report_json(['small-alone'] * 3),
               'c.html': report_json()}

    def node(command, **options):
        page = Path(command[2]).name
        target = Path(command[command.index('--out') + 1])
        target.mkdir(parents=True, exist_ok=True)
        (target / 'report.json').write_text(json.dumps(reports[page]), encoding='utf-8')
        return subprocess.CompletedProcess(command, 0, '', '')

    rows = run_survey(monkeypatch, tmp_path, node, *reports)
    assert [r[:2] for r in rows] == [[3, 'b.html'], [1, 'a.html'], [0, 'c.html']]
