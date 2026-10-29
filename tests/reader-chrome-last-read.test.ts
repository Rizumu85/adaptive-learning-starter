// The last-read position in reader-chrome.js ("上次读到"): which places are worth saving, a chapter page that saves
// on section change and on pagehide, and a contents page that shows "继续阅读" and the "上次" mark.
// Part 1 runs the decision helper on its own; part 2 runs the whole script in headless Chrome or Edge against a small
// local server that fakes /api/position (skipped when no browser is installed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import vm from 'node:vm';

const script = resolve('codex-skill/adaptive-course-teacher/assets/reader-chrome/reader-chrome.js');
const source = readFileSync(script, 'utf8');
const css = readFileSync(script.replace(/\.js$/, '.css'), 'utf8');

// ---------- part 1: the decision helper ----------
const start = source.indexOf('  function worthSaving(');
const end = source.indexOf('\n  }', start);
assert.ok(start >= 0 && end > start, 'reader-chrome.js no longer has worthSaving');
const worthSaving = vm.runInNewContext(`(${source.slice(start, end + 4).trim()})`) as
  (next: object, saved: object | null, engaged: boolean) => boolean;

test('which places are worth saving', () => {
  const at = (chapter: string, section: string) => ({ url: `/demo/${chapter}.html`, chapter, chapterTitle: chapter, section, sectionTitle: section });
  // nothing saved yet: opening a chapter records it, even at its top
  assert.equal(worthSaving(at('ch1', ''), null, false), true);
  // the same place again is not written twice; an old record without a section counts as the top
  assert.equal(worthSaving(at('ch1', 's2'), { ...at('ch1', 's2'), at: 1 }, true), false);
  assert.equal(worthSaving(at('ch1', ''), { url: '/demo/ch1.html', chapter: 'ch1' }, false), false);
  // a new section or another chapter is saved
  assert.equal(worthSaving(at('ch1', 's3'), at('ch1', 's2'), true), true);
  assert.equal(worthSaving(at('ch2', ''), at('ch1', 's2'), false), true);
  // reopening a chapter at its top does not erase a deeper place in it until the reader has read some section here
  assert.equal(worthSaving(at('ch1', ''), at('ch1', 's4'), false), false);
  assert.equal(worthSaving(at('ch1', ''), at('ch1', 's4'), true), true);
});

// ---------- part 2: the whole script in a real headless browser ----------
const browsers = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter((b): b is string => !!b && existsSync(b));

const catalog = (current?: string) => `<script type="application/json" id="rc-chapters">${JSON.stringify({
  book: 'demo', chapters: [{ id: 'ch1', url: 'ch1.html', title: '第一章 起点' }, { id: 'ch2', url: 'ch2.html', title: '第二章 远方' }],
  ...(current ? { current } : {}),
})}</script>`;
const filler = '<p style="height:1400px">……</p>';
const chapter = `<!doctype html><html lang="zh"><head><meta charset="utf-8"><link rel="stylesheet" href="reader-chrome.css"></head><body>
<!--rc:bar--><div class="rc-bar" role="banner"><div class="rc-bar-inner"><nav class="rc-trail"><a class="rc-shelf" href="/">书架</a><a class="rc-book" href="index.html">示例书</a></nav>
<div class="rc-tools"><details class="rc-toc"><summary>本章目录</summary><nav class="rc-toc-panel" aria-label="本章目录"><a href="#a">甲节</a><a href="#b">乙节</a></nav></details></div></div></div>${catalog('ch2')}<!--/rc:bar-->
<main><h1>第二章 远方</h1>${filler}<section id="a"><h2>甲节</h2>${filler}</section><section id="b"><h2>乙节</h2>${filler}</section></main>
<script type="application/json" id="out">null</script>
<script src="reader-chrome.js"></script>
<script>
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const bar = document.querySelector('.rc-bar');
const go = (id) => { document.getElementById(id).scrollIntoView({ behavior: 'instant' }); dispatchEvent(new HashChangeEvent('hashchange')); };
addEventListener('load', async () => {
  const seen = [];
  await wait(3000);           // opening the chapter at its top: recorded (another chapter was saved)
  go('b'); seen.push(bar.dataset.rcSection, bar.dataset.rcSectionTitle);
  await wait(3000);           // settled on 乙节: saved after 2 s
  go('a'); seen.push(bar.dataset.rcSection);
  await wait(300);            // left before it settled: pagehide saves it at once
  dispatchEvent(new Event('pagehide'));
  await wait(500);
  document.getElementById('out').textContent = JSON.stringify(seen);
});
</script></body></html>`;
const contents = `<!doctype html><html lang="zh"><head><meta charset="utf-8"><link rel="stylesheet" href="reader-chrome.css"></head><body>
<!--rc:bar--><div class="rc-bar" role="banner"><div class="rc-bar-inner"><nav class="rc-trail"><a class="rc-shelf" href="/">书架</a><span class="rc-here">示例书</span></nav></div></div>${catalog()}<!--/rc:bar-->
<main><header><p class="eyebrow">作者</p><h1>示例书</h1><p class="original">Original</p></header>
<ol><li><a href="ch1.html"><span class="row-title">第一章 起点</span></a></li><li><a href="ch2.html"><span class="row-title">第二章 远方</span></a> <a href="ch2.html#b">复习</a></li></ol></main>
<script src="reader-chrome.js"></script></body></html>`;

function run(browser: string, url: string, dir: string): Promise<string> {
  return new Promise((done) => {
    const child = spawn(browser, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      `--user-data-dir=${dir}`, '--virtual-time-budget=20000', '--dump-dom', url]);
    let out = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    const timer = setTimeout(() => child.kill(), 90000);
    child.on('close', () => { clearTimeout(timer); done(out); });
  });
}

test('whole script in a headless browser: saving on a chapter page, 继续阅读 on the contents page', { skip: browsers.length ? false : 'no Chrome or Edge found' }, async () => {
  let record: Record<string, unknown> = { demo: { url: '/demo/ch1.html', chapter: 'ch1', chapterTitle: '第一章 起点', section: '', sectionTitle: '', at: 1 } };
  const puts: Array<Record<string, string>> = [];
  const server = createServer((req, res) => {
    const path = (req.url || '').split('?')[0];
    if (path === '/api/position' && req.method === 'GET') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(record)); return; }
    if (path === '/api/position/demo' && req.method === 'PUT') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => { const entry = JSON.parse(body); puts.push(entry); record = { demo: entry }; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(record)); });
      return;
    }
    const files: Record<string, [string, string]> = {
      '/demo/ch2.html': [chapter, 'text/html'], '/demo/index.html': [contents, 'text/html'],
      '/demo/reader-chrome.js': [source, 'text/javascript'], '/demo/reader-chrome.css': [css, 'text/css'],
    };
    const file = files[path];
    if (!file) { res.statusCode = 404; res.end(); return; }
    res.setHeader('Content-Type', `${file[1]}; charset=utf-8`);
    res.end(file[0]);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const dir = mkdtempSync(join(tmpdir(), 'rc-last-'));
  try {
    const page = await run(browsers[0], `${origin}/demo/ch2.html`, join(dir, 'a'));
    const seen = page.match(/<script type="application\/json" id="out">([\s\S]*?)<\/script>/);
    assert.ok(seen && seen[1] !== 'null', 'no result from the chapter page');
    assert.deepEqual(JSON.parse(seen[1]), ['b', '乙节', 'a']);
    assert.deepEqual(puts.map((p) => [p.chapter, p.section, p.sectionTitle]), [['ch2', '', ''], ['ch2', 'b', '乙节'], ['ch2', 'a', '甲节']]);
    assert.ok(puts.every((p) => p.url === '/demo/ch2.html' && p.chapterTitle === '第二章 远方'));

    const dom = await run(browsers[0], `${origin}/demo/index.html`, join(dir, 'b'));
    const line = dom.match(/<a ([^>]*class="rc-continue"[^>]*)>([\s\S]*?)<\/a>/);
    assert.ok(line, 'no 继续阅读 link');
    assert.match(line[1], new RegExp(`href="${origin}/demo/ch2.html#a"`));
    assert.equal(line[2].replace(/<[^>]+>/g, ''), '继续阅读·第二章 远方·甲节');
    // an action, so it sits first in the top bar's tools, not as another line in the page head
    assert.match(dom, /class="rc-tools"[^>]*><a [^>]*class="rc-continue"/);
    assert.doesNotMatch(dom, /<p class="rc-continue">/);
    // the 上次 mark sits after the chapter title of the whole-chapter link only, not after the 复习 link
    assert.match(dom, /<span class="row-title">第二章 远方<span class="rc-last">上次<\/span><\/span>/);
    assert.equal((dom.match(/class="rc-last"/g) || []).length, 1);
  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
