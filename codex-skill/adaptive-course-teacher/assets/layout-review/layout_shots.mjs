// Screenshots of one reader page at several widths, plus a list of figures worth a look.
// Used by layout_review.py; can also run alone:
//   node layout_shots.mjs <page.html or URL> --out <folder> [--widths 1440,820,390] [--browser <path>] [--findings-only]
// --findings-only skips the screenshots and writes report.json alone (for surveying a whole book).
// --view parallel|target|source switches a bilingual reader to that view before measuring (default: the page's own).
// Needs Node 22+ and an installed Chrome or Edge. Writes w<width>-NN.png tiles and report.json.
// It drives the browser over the DevTools protocol, so phone widths are real (headless
// --window-size clamps narrow windows) and lazy images are loaded before the capture.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const flag = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const target = args[0];
if (!target || target.startsWith('--')) {
  console.error('usage: node layout_shots.mjs <page.html or URL> --out <folder> [--widths 1440,820,390] [--browser <path>]');
  process.exit(2);
}
const out = resolve(flag('--out', 'layout-review'));
const widths = flag('--widths', '1440,820,390').split(',').map(Number);
const url = /^[a-z]+:\/\//i.test(target) ? target : pathToFileURL(resolve(target)).href;
const TILE = 3000;
const findingsOnly = args.includes('--findings-only');
const view = flag('--view');

const candidates = [flag('--browser'), process.env.BROWSER,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'];
const browser = candidates.find((path) => path && existsSync(path));
if (!browser) { console.error('No Chrome or Edge found; pass --browser <path>'); process.exit(2); }

const port = await new Promise((done) => {
  const probe = createServer();
  probe.listen(0, '127.0.0.1', () => { const { port: free } = probe.address(); probe.close(() => done(free)); });
});
const profile = mkdtempSync(join(tmpdir(), 'layout-review-'));
const child = spawn(browser, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const stop = (code) => {
  try { child.kill(); } catch { /* already gone */ }
  setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch { /* still locked */ } process.exit(code); }, 300);
};
// A stuck browser must not hang the caller.
const guard = setTimeout(() => { console.error('Timed out; stopping the browser'); stop(1); }, 180000);

async function pageSocket() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((entry) => entry.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('Browser did not start');
}

// Figures a reader may not be able to interpret: a small picture alone in the column,
// a caption squeezed to the picture's width, or content wider than the screen.
const MEASURE = `(() => {
  const column = document.querySelector('main') || document.body;
  const columnWidth = column.getBoundingClientRect().width;
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const others = [...document.querySelectorAll('p, h1, h2, h3, li, figcaption, img')].filter(visible);
  const findings = [];
  // Every picture's place on the page, for comparing with where the crop record says it was printed.
  const figures = [...document.querySelectorAll('figure img')].filter(visible).map((img) => {
    const r = img.getBoundingClientRect();
    return { file: img.getAttribute('src').split('/').pop().split('?')[0], x: Math.round(r.left), y: Math.round(r.top + scrollY),
      w: Math.round(r.width), h: Math.round(r.height) };
  });
  for (const figure of document.querySelectorAll('figure')) {
    const image = figure.querySelector('img');
    if (!image || !visible(image)) continue;
    // Reviewed against the printed page and kept on purpose (the generator writes data-layout-ok).
    if (figure.closest('[data-layout-ok]')) continue;
    const r = image.getBoundingClientRect();
    const middle = r.top + r.height / 2;
    const besideText = others.some((el) => {
      if (el === image || el.contains(image)) return false;
      const o = el.getBoundingClientRect();
      return o.top < middle && o.bottom > middle && (o.right <= r.left + 1 || o.left >= r.right - 1);
    });
    // Laid out in a row on purpose: some ancestor is a grid or flex box whose children sit side by side
    // (picture beside its text, a grid of items, a map with its entries).
    let inRow = false;
    for (let box = image.parentElement; box && box !== column && !inRow; box = box.parentElement) {
      if (!/grid|flex/.test(getComputedStyle(box).display)) continue;
      const kids = [...box.children].filter(visible).map((kid) => kid.getBoundingClientRect());
      inRow = kids.some((a, i) => kids.some((b, j) => j > i && a.top < b.bottom - 1 && b.top < a.bottom - 1
        && (a.right <= b.left + 1 || b.right <= a.left + 1)));
    }
    const beside = besideText || inRow;
    const caption = figure.querySelector('figcaption');
    const captionWidth = caption && caption.textContent.trim() ? Math.round(caption.getBoundingClientRect().width) : null;
    const id = figure.id || image.getAttribute('src').split('/').pop().split('?')[0];
    const base = { id, y: Math.round(r.top + scrollY), width: Math.round(r.width), share: +(r.width / columnWidth).toFixed(2) };
    const neighbours = [figure.previousElementSibling, figure.nextElementSibling];
    // On a phone a small picture stacked right against its own caption or text is normal.
    const stacked = innerWidth < 700 && (captionWidth !== null
      || neighbours.some((el) => el && !el.matches('figure') && el.textContent.trim()));
    if (r.width < columnWidth * 0.4 && r.width < 320 && !beside && !stacked) findings.push({ ...base, kind: 'small-alone' });
    // Pictures following one another with no words: nothing says what they are or what they belong to.
    const bare = (el) => el && el.matches('figure') && !(el.querySelector('figcaption')?.textContent.trim());
    if (captionWidth === null && !inRow && neighbours.some(bare)) findings.push({ ...base, kind: 'wordless-run' });
    if (captionWidth !== null && captionWidth < 220 && columnWidth > 300 && !inRow) findings.push({ ...base, kind: 'narrow-caption', captionWidth });
    if (r.right > innerWidth + 1) findings.push({ ...base, kind: 'overflow' });
  }
  // Where each section starts, so a printed page or heading can be found in the tiles.
  const anchors = [...document.querySelectorAll('section[id], h1[id], h2[id], h3[id], [id^="page-"], [id^="pdf-"]')]
    .map((el) => ({ id: el.id, y: Math.round(el.getBoundingClientRect().top + scrollY) }));
  return JSON.stringify({ height: document.documentElement.scrollHeight, columnWidth: Math.round(columnWidth), anchors, figures,
    pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, findings });
})()`;

try {
  mkdirSync(out, { recursive: true });
  const socket = new WebSocket(await pageSocket());
  await new Promise((done, fail) => { socket.onopen = done; socket.onerror = fail; });
  let id = 0;
  const waiting = new Map();
  const events = new Map();
  socket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.id && waiting.has(data.id)) { waiting.get(data.id)(data); waiting.delete(data.id); }
    if (data.method && events.has(data.method)) { events.get(data.method)(); events.delete(data.method); }
  };
  const send = (method, params = {}) => new Promise((done, fail) => {
    waiting.set(++id, (data) => (data.error ? fail(new Error(`${method}: ${data.error.message}`)) : done(data.result)));
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;
  await send('Page.enable');
  const report = { page: url, widths: {} };
  for (const width of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 700 });
    const loaded = new Promise((done) => { events.set('Page.loadEventFired', done); setTimeout(done, 20000); });
    await send('Page.navigate', { url });
    await loaded;
    // Lazy images never load in a page nobody scrolls; load them all, then wait for fonts and decoding.
    await evaluate(`(async () => {
      document.querySelectorAll('img[loading=lazy]').forEach((img) => { img.loading = 'eager'; });
      const done = Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
      await Promise.race([done, new Promise((r) => setTimeout(r, 15000))]);
      if (document.fonts) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    })()`);
    if (view) {
      await evaluate(`(async () => {
        document.querySelector('[data-bilingual-view] [data-value="${view}"]')?.click();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      })()`);
    }
    const measured = JSON.parse(await evaluate(MEASURE));
    const tiles = [];
    for (let top = 0, n = 0; top < measured.height && !findingsOnly; top += TILE, n++) {
      const height = Math.min(TILE, measured.height - top);
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
        clip: { x: 0, y: top, width, height, scale: 1 } });
      const name = `w${width}-${String(n).padStart(2, '0')}.png`;
      writeFileSync(join(out, name), Buffer.from(shot.data, 'base64'));
      tiles.push({ file: name, from: top, to: top + height });
    }
    report.widths[width] = { ...measured, tiles };
    console.log(`${width}px: ${measured.height}px tall, ${tiles.length} tile(s), ${measured.findings.length} finding(s)`
      + (measured.pageOverflow ? ', PAGE SCROLLS SIDEWAYS' : ''));
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
  socket.close();
  clearTimeout(guard);
  stop(0);
} catch (error) {
  console.error(String(error.message || error));
  clearTimeout(guard);
  stop(1);
}
