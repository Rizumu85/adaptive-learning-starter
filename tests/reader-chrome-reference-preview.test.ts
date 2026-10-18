// What a reference card (a.rc-ref) previews for a passage target, in reader-chrome.js:
// pointer-only sentences are left out, a term entry matching the reference is preferred,
// and figure / multi-target cards keep their shape.
// Part 1 runs the helpers on a small stand-in DOM; part 2 runs the whole script in headless Chrome or Edge
// when one is installed (skipped otherwise).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const script = resolve('codex-skill/adaptive-course-teacher/assets/reader-chrome/reader-chrome.js');
const source = readFileSync(script, 'utf8');

// ---------- part 1: helpers on a stand-in DOM ----------
const start = source.indexOf('  const sourceOnly =');
const end = source.indexOf('\n  let current =', start);
assert.ok(start >= 0 && end > start, 'reader-chrome.js no longer has the reference helpers block');

type Child = El | string;
class El {
  tagName: string;
  className: string;
  parentNode: El | null = null;
  children: Child[];
  constructor(tag: string, cls: string, children: Child[]) {
    this.tagName = tag.toUpperCase();
    this.className = cls;
    this.children = children;
    for (const c of children) if (c instanceof El) c.parentNode = this;
  }
  get classList() { return this.className.split(/\s+/).filter(Boolean); }
  get textContent(): string { return this.children.map((c) => (typeof c === 'string' ? c : c.textContent)).join(''); }
  get childElementCount() { return this.children.filter((c) => c instanceof El).length; }
  is(simple: string) {
    const [, tag, cls] = simple.trim().match(/^([a-z0-9]*)(?:\.([\w-]+))?$/i) || [];
    return (!tag || this.tagName === tag.toUpperCase()) && (!cls || this.classList.includes(cls));
  }
  matches(selector: string) { return selector.split(',').some((s) => this.is(s)); }
  descendants(): El[] { return this.children.flatMap((c) => (c instanceof El ? [c, ...c.descendants()] : [])); }
  querySelectorAll(selector: string) { return this.descendants().filter((e) => e.matches(selector)); }
  querySelector(selector: string) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector: string): El | null { return this.matches(selector) ? this : this.parentNode && this.parentNode.closest(selector); }
  remove() {
    if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((c) => c !== this);
    this.parentNode = null;
  }
  cloneNode(): El { return new El(this.tagName, this.className, this.children.map((c) => (typeof c === 'string' ? c : c.cloneNode()))); }
}
const h = (tag: string, cls: string, ...children: Child[]) => new El(tag, cls, children);
const p = (...children: Child[]) => h('p', '', ...children);

const context = vm.createContext({ document: { body: { dataset: {} as Record<string, string> } } });
const api = vm.runInContext(`(function () {
${source.slice(start, end)}
  return { previewText, excerptOf };
})()`, context);
const view = (value: string | null) => {
  if (value) context.document.body.dataset.view = value;
  else delete context.document.body.dataset.view;
};
const text = (s: string) => api.previewText(p(s));
const excerpt = (el: El, link: El | null, lang: string | null = null, after: El[] = []) => {
  const found = api.excerptOf(el, after, link, lang);
  return found ? found.text : '';
};
const linkIn = (before: string, label: string, afterText = '') => {
  const a = h('a', 'rc-ref', label);
  p(before, a, afterText);
  return a;
};

test('a sentence that only points elsewhere is left out of the card', () => {
  assert.equal(text('参考第145页。'), '');
  assert.equal(text('（→p.233）'), '');
  assert.equal(text('骶骨（sacrum）：关于骶骨的详细介绍请参考第141页。'), '');
  assert.equal(text('233ページ参照。'), '');
  assert.equal(text('See pp. 12–14.'), '');
  assert.equal(text('Ilium: see page 142 for details.'), '');
});

test('a mixed paragraph keeps its explanation and a reference written into a sentence', () => {
  assert.equal(text('髂骨翼：这部分长得像翅膀，是髋骨的一部分。关于髂骨的介绍参考第142页。'), '髂骨翼：这部分长得像翅膀，是髋骨的一部分。');
  assert.equal(text('尾骨：尾巴退化后留下的骨骼，几乎不动，参考第142页。'), '尾骨：尾巴退化后留下的骨骼，几乎不动，参考第142页。');
  assert.equal(text('肩胛骨是扁骨（→p.233），贴在胸廓后面。另见第150、151页。'), '肩胛骨是扁骨，贴在胸廓后面。');
  assert.equal(text('腸骨は骨盤の上部を作る。詳しくはp.142を参照。（→P.233）'), '腸骨は骨盤の上部を作る。');
  assert.equal(text('The ilium is the wing of the hip bone (see p. 142). See pages 12–14 and 20. It flares outward.'),
    'The ilium is the wing of the hip bone. It flares outward.');
  assert.equal(text('Cf. fig. 3 and the note on p. 4: the crest is palpable.'), 'Cf. fig. 3 and the note on p. 4: the crest is palpable.');
});

test('paragraphs without a pointer are returned exactly as before', () => {
  for (const s of ['肩部的肌肉可以分为以下三组：', '他说：“好！”……', '骶骨（sacrum）由五块骶椎愈合而成。', 'Dr. Smith measured 3.5 cm. Then he left.']) {
    assert.equal(text(s), s);
  }
  // a bracket holding only a page or figure number is a pointer too
  assert.equal(text('骶骨（sacrum）由五块骶椎愈合而成（图3）。'), '骶骨（sacrum）由五块骶椎愈合而成。');
});

const section = () => h('section', '',
  h('h2', '', '骨盆'),
  p('关于骶骨的详细介绍请参考第141页。'),
  p('髂骨翼：这部分长得像翅膀，是髋骨的一部分。关于髂骨的介绍参考第142页。'),
  p('髂前上棘（anterior superior iliac spine）：是股四头肌和腹股沟韧带起点。'),
  p('坐骨结节是坐下时承重的部位，用', h('dfn', '', '坐骨结节'), '称呼。'));

test('a passage previews its first explanatory paragraph, skipping pointer-only ones', () => {
  assert.equal(excerpt(section(), linkIn('另请参考', '第142页', '。')), '髂骨翼：这部分长得像翅膀，是髋骨的一部分。');
  assert.equal(excerpt(section(), null), '髂骨翼：这部分长得像翅膀，是髋骨的一部分。');
  // a target that is itself a pointer-only paragraph previews nothing (the card keeps its heading and jump link)
  assert.equal(excerpt(p('参考第141页。'), linkIn('', '第141页')), '');
  assert.equal(excerpt(h('section', '', h('h2', '', '骶骨'), p('关于骶骨的详细介绍请参考第141页。')), null), '');
});

test('a reference from a term entry previews the matching term in the target', () => {
  assert.match(excerpt(section(), linkIn('髂前上棘（anterior superior iliac spine）：参考', '第142页', '。')), /^髂前上棘/);
  assert.match(excerpt(section(), linkIn('', '髂前上棘', '是体表标志。')), /^髂前上棘/);
  assert.match(excerpt(section(), linkIn('', '坐骨结节', '在下方。')), /^坐骨结节/);
  // no matching term: first explanation
  assert.match(excerpt(section(), linkIn('耻骨：参考', '第142页', '。')), /^髂骨翼/);
});

test('bilingual view: one language, pointer-only sentences skipped in that language', () => {
  const bi = () => h('section', '',
    h('h2', '', h('span', 'source-heading', 'Pelvis'), h('span', 'target-heading', '骨盆')),
    h('p', 'source', 'See p. 142.'),
    h('p', 'source', 'The wing of the ilium is shaped like a wing.'),
    h('p', 'target', '参考第142页。'),
    h('p', 'target', '髂骨翼长得像翅膀。'));
  view('both');
  assert.equal(excerpt(bi(), null, 'p.target'), '髂骨翼长得像翅膀。');
  view('source');
  assert.equal(excerpt(bi(), null, 'p.source'), 'The wing of the ilium is shaped like a wing.');
  view(null);
});

// ---------- part 2: the whole script in a real headless browser ----------
const browsers = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter((b): b is string => !!b && existsSync(b));

const PIXEL = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2230%22/%3E';
const page = `<!doctype html><html lang="zh"><head><meta charset="utf-8"><link rel="stylesheet" href="reader-chrome.css"></head><body><main>
<p>另请参考<a class="rc-ref" id="mixed" href="#page-142">第142页</a>。</p>
<p>髂前上棘（anterior superior iliac spine）：参考<a class="rc-ref" id="term" href="#page-142">第142页</a>。</p>
<p><a class="rc-ref" id="only" href="#p-only">第141页</a>，<a class="rc-ref" id="para" href="#p-mixed">第150页</a>，
<a class="rc-ref" id="bi" href="#bi-sec">Pelvis</a>，<a class="rc-ref" id="fig" href="#fig1">上图</a>，
<a class="rc-ref" id="many" href="#fig1" data-refs="#fig1 #spine">脊柱</a>，<a class="rc-ref" id="plain" href="#spine">脊柱</a>。</p>
<section id="page-142"><h2>骨盆</h2>
<p>关于骶骨的详细介绍请参考第141页。</p>
<p>髂骨翼：这部分长得像翅膀，是髋骨的一部分。关于髂骨的介绍参考第142页。</p>
<p>髂前上棘（anterior superior iliac spine）：是股四头肌和腹股沟韧带起点。</p></section>
<p id="p-only">参考第141页。（→p.233）</p>
<p id="p-mixed">尾骨：尾巴退化后留下的骨骼，几乎不动，参考第142页。另见第150页。</p>
<section id="bi-sec"><h2><span class="source-heading">Pelvis</span><span class="target-heading">骨盆</span></h2>
<p class="source">See p. 142.</p><p class="source">The wing of the ilium is shaped like a wing.</p>
<p class="target">参考第142页。</p><p class="target">髂骨翼长得像翅膀。</p></section>
<figure id="fig1"><img src="${PIXEL}" alt="骨盆"><figcaption>图1 骨盆正面（参考第142页）</figcaption></figure>
<section id="spine"><h2>脊柱</h2><p>脊柱由椎骨连接而成，支撑身体并保护脊髓。</p></section>
</main>
<script type="application/json" id="out">null</script>
<script src="reader-chrome.js"></script>
<script>
const runs = [['mixed'], ['term'], ['only'], ['para'], ['bi', 'both'], ['bi', 'source'], ['fig'], ['many'], ['plain']];
const card = () => document.getElementById('rc-peek');
const read = (root) => ({
  title: [...root.querySelectorAll(':scope > .rc-peek-title')].map((n) => n.textContent),
  text: [...root.querySelectorAll(':scope > .rc-peek-text')].map((n) => n.textContent),
  caption: [...root.querySelectorAll(':scope > .rc-peek-caption')].map((n) => n.textContent),
  img: root.querySelectorAll(':scope > .rc-peek-img').length,
  go: [...root.querySelectorAll(':scope > .rc-peek-go')].map((n) => n.textContent + ' ' + n.dataset.target),
});
const result = {};
let i = 0;
function next() {
  if (i === runs.length) { document.getElementById('out').textContent = JSON.stringify(result); return; }
  const [id, view] = runs[i++];
  if (view) document.body.dataset.view = view; else delete document.body.dataset.view;
  document.getElementById(id).dispatchEvent(new PointerEvent('pointerover', { pointerType: 'mouse', bubbles: true }));
  setTimeout(() => {
    const c = card();
    const items = [...c.querySelectorAll(':scope > .rc-peek-item')];
    result[id + (view ? ':' + view : '')] = { hidden: c.hidden, many: c.classList.contains('is-many'), items: items.length ? items.map(read) : [read(c)] };
    // the pointer leaves, so the card closes before the next run
    document.getElementById(id).dispatchEvent(new PointerEvent('pointerout', { pointerType: 'mouse', bubbles: true }));
    setTimeout(next, 400);
  }, 400);
}
addEventListener('load', () => setTimeout(next, 50));
</script></body></html>`;

test('whole script in a headless browser: passages, figures and multi-target cards', { skip: browsers.length ? false : 'no Chrome or Edge found' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'rc-peek-'));
  try {
    copyFileSync(script, join(dir, 'reader-chrome.js'));
    copyFileSync(script.replace(/\.js$/, '.css'), join(dir, 'reader-chrome.css'));
    writeFileSync(join(dir, 'index.html'), page);
    const run = spawnSync(browsers[0], ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      `--user-data-dir=${join(dir, 'profile')}`, '--virtual-time-budget=15000', '--dump-dom', pathToFileURL(join(dir, 'index.html')).href],
    { encoding: 'utf8', timeout: 90000 });
    const json = (run.stdout || '').match(/<script type="application\/json" id="out">([\s\S]*?)<\/script>/);
    assert.ok(json && json[1] !== 'null', `no result from the browser: ${run.stderr}`);
    const r = JSON.parse(json[1]);
    const one = (key: string) => { assert.equal(r[key].hidden, false, key); assert.equal(r[key].many, false, key); return r[key].items[0]; };
    const jump = (target: string) => [`跳到这里 → ${target}`];

    assert.deepEqual(one('mixed'), { title: ['骨盆'], text: ['髂骨翼：这部分长得像翅膀，是髋骨的一部分。'], caption: [], img: 0, go: jump('#page-142') });
    assert.deepEqual(one('term'), { title: ['骨盆'], text: ['髂前上棘（anterior superior iliac spine）：是股四头肌和腹股沟韧带起点。'], caption: [], img: 0, go: jump('#page-142') });
    assert.deepEqual(one('only'), { title: [], text: [], caption: [], img: 0, go: jump('#p-only') });
    assert.deepEqual(one('para'), { title: [], text: ['尾骨：尾巴退化后留下的骨骼，几乎不动，参考第142页。'], caption: [], img: 0, go: jump('#p-mixed') });
    assert.deepEqual(one('bi:both'), { title: ['骨盆'], text: ['髂骨翼长得像翅膀。'], caption: [], img: 0, go: jump('#bi-sec') });
    assert.deepEqual(one('bi:source'), { title: ['Pelvis'], text: ['The wing of the ilium is shaped like a wing.'], caption: [], img: 0, go: jump('#bi-sec') });
    // figure targets: picture and caption, caption text untouched
    const figure = { title: [], text: [], caption: ['图1 骨盆正面（参考第142页）'], img: 1, go: ['在文中看这张图 → #fig1'] };
    assert.deepEqual(one('fig'), figure);
    // several targets: each in order, each with its own jump link
    assert.equal(r.many.many, true);
    assert.deepEqual(r.many.items, [figure, { title: ['脊柱'], text: ['脊柱由椎骨连接而成，支撑身体并保护脊髓。'], caption: [], img: 0, go: jump('#spine') }]);
    assert.deepEqual(one('plain'), { title: ['脊柱'], text: ['脊柱由椎骨连接而成，支撑身体并保护脊髓。'], caption: [], img: 0, go: jump('#spine') });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
