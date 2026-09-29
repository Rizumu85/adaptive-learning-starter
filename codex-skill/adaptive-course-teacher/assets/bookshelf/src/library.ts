// 书架首页：读取 books.json，渲染 Paper 风格的书排与书的目录页。编辑这个文件，然后运行 npm run build 生成 assets/library.js。
(() => {
  'use strict';

  const app = document.getElementById('app');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const EASE = 'cubic-bezier(.2,.8,.2,1)';

  let library: { name: string; searchFrom: number; storageKey?: string } = { name: '书架', searchFrom: 12 };
  let books: any[] = [];
  let query = '';
  let lastBookId = null;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const byId = (id) => books.find((book) => book.id === id);
  const bookHash = (id) => `#/book/${encodeURIComponent(id)}`;
  const routeId = () => {
    const match = location.hash.match(/^#\/book\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  // 相对地址拼在这本书的 reader 根地址后；完整网址或以 / 开头的地址原样使用
  function chapterHref(book, chapter) {
    const href = chapter.href;
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('/') || !book.reader) return href;
    return book.reader.replace(/\/?$/, '/') + href;
  }

  /* ---------- 书脊 ---------- */

  // 书脊、侧面、封面共用的平涂颜色；侧面默认比书脊深一档
  function colorVars(book) {
    const spine = book.spine || {};
    const cover = book.cover || {};
    const color = spine.color || '#e8e2d4';
    return [
      `--spine:${color}`, `--spine-ink:${spine.ink || '#18181b'}`,
      `--side:${spine.side || `color-mix(in srgb, ${color} 78%, #1a1a1a)`}`,
      `--cover-bg:${cover.background || color}`,
    ].join(';');
  }

  function textLength(text: string): number {
    return Array.from(text || '').reduce((n: number, ch: string) => n + (/[\x20-\x7e]/.test(ch) ? 0.55 : 1), 0);
  }

  // 去背景的人物图完整显示
  function coverVars(cover) {
    const contain = cover.fit === 'contain';
    return [
      `--fit:${contain ? 'contain' : 'cover'}`, `--pos:${cover.position || '50% 50%'}`,
      `--pad:${contain ? '7% 6% 5% 9%' : '0'}`,
    ].join(';');
  }

  const cssNumber = (name, fallback) => (
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || fallback
  );

  // 像 Paper：所有书统一显示高度，只保留真实的宽高比例和厚度差别；厚度略微放大，侧面才看得清
  function bookMetrics(book) {
    const H = cssNumber('--book-h', 320);
    const size = book.size || {};
    const scale = H / (size.height || 220);
    return {
      W: Math.round((size.width || 150) * scale),
      H,
      D: Math.round(Math.max(18, (size.thickness || 16) * scale * 1.8)),
    };
  }

  // 书脊：竖排书名；太窄时只留颜色、顶端小图和两侧转折
  function spineHtml(book, w, h) {
    const spine = book.spine || {};
    const author = spine.author ?? (book.author === book.title ? '' : book.author);
    const artH = spine.art ? Math.round(Math.min(w * 1.3, h * 0.22)) : 0;
    const authorSize = Math.max(8, Math.min(12, Math.floor(w * 0.3)));
    const reserve = 26 + (author ? textLength(author) * authorSize + 10 : 0);
    const titleSize = Math.max(8, Math.min(20, Math.floor(w * 0.5),
      Math.floor((h - artH - reserve) / Math.max(1, textLength(book.title)))));
    const style = [
      `--w:${w}px`, `--h:${h}px`, `--art-h:${artH}px`, `--title-size:${titleSize}px`,
      `--author-size:${authorSize}px`, colorVars(book),
    ].join(';');
    const art = artH
      ? `<img class="spine-art" src="${esc(spine.art)}" alt="" style="object-position:${esc(spine.artPosition || '50% 50%')}">`
      : '<span class="spine-rule"></span>';
    return `<span class="spine" style="${esc(style)}">${art}<span class="spine-text">`
      + `<span class="spine-title">${esc(book.title)}</span>`
      + (author ? `<span class="spine-author">${esc(author)}</span>` : '')
      + '</span></span>';
  }

  // 一本书 = 正面封面 + 左侧书脊 + 右侧书页切口 + 顶面，按真实比例搭成 3D 盒子
  function bookHtml(book) {
    const { W, H, D } = bookMetrics(book);
    const cover = book.cover || {};
    const style = [`--cw:${W}px`, `--ch:${H}px`, `--cd:${D}px`, colorVars(book), coverVars(cover)].join(';');
    const label = [book.title + (book.subtitle ? ` ${book.subtitle}` : ''), book.author].filter(Boolean).join('，');
    return `<li class="slot"><a class="book" href="${esc(book.directoryUrl || bookHash(book.id))}" data-id="${esc(book.id)}" aria-label="${esc(label)}" draggable="false" style="${esc(style)}">`
      + '<span class="bface front">'
      + (cover.src ? `<img src="${esc(cover.src)}" alt="" draggable="false">` : '')
      + '<span class="hinge"></span></span>'
      + `<span class="bface spine-face">${spineHtml(book, D, H)}</span>`
      + '<span class="bface fore-face"></span><span class="bface top-face"></span><span class="bface wall-shadow"></span>'
      + '</a></li>';
  }

  /* ---------- 书架页：一排正面封面，像 Paper 的手帐列表 ---------- */

  function matches(book, q) {
    if (!q) return true;
    const hay = [book.title, book.subtitle, book.author, book.translator, book.category, book.edition]
      .filter(Boolean).join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every((word) => hay.includes(word));
  }

  function shelvesHtml() {
    const large = books.length >= library.searchFrom;
    const visible = books.filter((book) => matches(book, query));
    if (!visible.length) return '<p class="shelf-empty">没有找到匹配的书。</p>';
    const row = (list) => `<div class="row"><ul class="track">${list.map(bookHtml).join('')}</ul></div>`;
    if (!large) return `<section class="shelf-group" aria-label="书架">${row(visible)}</section>`;

    const groups = new Map();
    visible.forEach((book) => {
      const key = book.category || '其他';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(book);
    });
    return [...groups].map(([name, list]) => (
      `<section class="shelf-group" aria-label="${esc(name)}"><h2>${esc(name)}</h2>${row(list)}</section>`
    )).join('');
  }

  // 书架只生成一次：去目录页时整个留着，回来直接放回去。
  // 书的封面在 3D 面上，新建的图片解码后 Chrome 偶尔不重画，留着已经画好的书架最稳，也更快
  let shelfPage = null;

  function renderShelf() {
    document.title = library.name;
    if (shelfPage) {
      app.replaceChildren(shelfPage);
    } else {
      const search = books.length >= library.searchFrom
        ? `<label class="search"><span>查找</span><input type="search" value="${esc(query)}" placeholder="书名、作者、分类" autocomplete="off"></label>`
        : '';
      app.innerHTML = `<div class="page shelf-view"><header class="identity"><h1>${esc(library.name)}</h1>${search}</header>`
        + '<div class="now"><strong></strong><span></span></div>'
        + `<div class="shelves">${shelvesHtml()}</div></div>`;
      shelfPage = app.firstElementChild;
      revealWhenReady(shelfPage);

      const input = app.querySelector<HTMLInputElement>('.search input');
      if (input) {
        input.addEventListener('input', () => {
          query = input.value.trim();
          app.querySelector('.shelves').innerHTML = shelvesHtml();
          revealWhenReady(shelfPage);
          settle();
        });
      }
    }

    const returning = lastBookId && app.querySelector<HTMLElement>(`.book[data-id="${CSS.escape(lastBookId)}"]`);
    lastBookId = null;
    settle(returning);
    if (returning) returning.focus({ preventScroll: true });
  }

  // 让书排重画一次：3D 面上的封面解码后 Chrome 偶尔不重画
  function repaint(root) {
    requestAnimationFrame(() => {
      root.querySelectorAll('.track').forEach((track) => {
        track.style.visibility = 'hidden';
        void track.offsetWidth;
        track.style.visibility = '';
      });
    });
  }

  // 封面要先经过访问验证再从存储读取，常常比页面慢一拍。
  // 书排先藏着，封面到齐（最多等 1.2 秒）再一起出现；每张封面加载完成后淡入，不会突然冒出来
  function revealWhenReady(root) {
    const images = [...root.querySelectorAll('.row img')];
    images.forEach((img) => {
      const done = () => img.classList.add('is-loaded');
      if (img.complete && img.naturalWidth) done();
      else img.addEventListener('load', done, { once: true });
    });
    root.classList.add('is-loading');
    const ready = Promise.all(images.map((img) => img.decode().catch(() => {})));
    Promise.race([ready, new Promise((r) => setTimeout(r, 1200))]).then(() => {
      root.classList.remove('is-loading');
      repaint(root);
    });
    ready.then(() => repaint(root));
  }

  // 记住上次打开的书，只存在这台设备的浏览器里；读写失败（无痕模式等）就当没有记录
  // 键名来自 books.json 的 library.storageKey，同一域名下的多个书库互不覆盖
  const lastKey = () => `${library.storageKey || 'bookshelf'}:last-book`;
  function rememberBook(id) {
    try { localStorage.setItem(lastKey(), id); } catch { /* 存不了就不记 */ }
  }
  function lastOpenedBook() {
    try {
      const id = localStorage.getItem(lastKey());
      return id ? app.querySelector(`.book[data-id="${CSS.escape(id)}"]`) : null;
    } catch {
      return null;
    }
  }

  // 选出当前书：返回时是刚才那本；否则是上次打开的那本；第一次访问随机选一本
  function settle(preferred?: HTMLElement | null) {
    const all = [...app.querySelectorAll('.book')];
    const current = preferred || lastOpenedBook() || all[Math.floor(Math.random() * all.length)];
    if (current) setCurrent(current, { scroll: 'instant' });
  }

  // 当前书放大、抬起，像 Paper 里选中的手帐
  // 点击、滚轮、键盘切换时书排会平滑滚过中间几本；滚动期间当前书固定为目标，标题不跟着闪
  let scrollTarget = null;
  let scrollTargetTimer = 0;
  function releaseTarget() {
    scrollTarget = null;
    clearTimeout(scrollTargetTimer);
  }

  // 当前那本书的目录页先在后台准备好（Chrome 的预渲染）：点开时页面已就绪，淡入淡出不必等加载。
  // 书停在中间 600ms 后才准备，转盘快速滑过时不白白加载
  let speculation = null;
  let prepareTimer = 0;
  function prepare(book) {
    clearTimeout(prepareTimer);
    if (!book?.directoryUrl || !HTMLScriptElement.supports?.('speculationrules')) return;
    const url = new URL(book.directoryUrl, location.href).href;
    if (new URL(url).origin !== location.origin || speculation?.dataset.url === url) return;
    prepareTimer = setTimeout(() => {
      speculation?.remove();
      speculation = Object.assign(document.createElement('script'), { type: 'speculationrules' });
      speculation.dataset.url = url;
      // 预渲染不可用时（省电模式、内存紧张等）退回到只预取页面本身
      speculation.textContent = JSON.stringify({ prerender: [{ urls: [url], eagerness: 'eager' }], prefetch: [{ urls: [url], eagerness: 'eager' }] });
      document.head.append(speculation);
    }, 600);
  }

  function setCurrent(bookEl, { scroll }: { scroll?: 'instant' | 'smooth' } = {}) {
    if (!bookEl || (bookEl.classList.contains('is-current') && !scroll)) return;
    const changed = !bookEl.classList.contains('is-current');
    app.querySelectorAll('.book.is-current').forEach((el) => el.classList.remove('is-current'));
    bookEl.classList.add('is-current');
    const slot = bookEl.parentElement;
    const book = byId(bookEl.dataset.id);
    prepare(book);
    const now = app.querySelector('.now');
    if (book && now && changed) {
      now.firstElementChild.textContent = book.title + (book.subtitle ? ` ${book.subtitle}` : '');
      now.lastElementChild.textContent = book.author ? `${book.author} 著` : '';
      showNew(book.id);
      if (!reduceMotion.matches) now.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 220, easing: EASE });
    }
    if (scroll) {
      const row = slot.closest('.row');
      const left = slot.offsetLeft + slot.offsetWidth / 2 - row.clientWidth / 2;
      const smooth = scroll !== 'instant' && !reduceMotion.matches;
      if (smooth && Math.abs(row.scrollLeft - left) > 1) {
        scrollTarget = bookEl;
        clearTimeout(scrollTargetTimer);
        // 兜底：个别浏览器没有 scrollend 事件
        scrollTargetTimer = setTimeout(releaseTarget, 900);
      }
      row.scrollTo({ left, behavior: smooth ? 'smooth' : 'instant' });
    }
  }

  // 键盘：Tab 或 ← → 切换，选中的书滑到中间
  app.addEventListener('focusin', (event) => {
    // 只响应键盘焦点；鼠标按下也会让链接获得焦点，那时交给点击逻辑处理
    const book = (event.target as Element).closest?.('a.book');
    if (book && book.matches(':focus-visible')) setCurrent(book, { scroll: 'smooth' });
  });
  app.addEventListener('keydown', (event) => {
    const book = (event.target as Element).closest?.('a.book');
    if (!book || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    const slot = book.parentElement;
    const next = event.key === 'ArrowLeft' ? slot.previousElementSibling : slot.nextElementSibling;
    if (next) {
      event.preventDefault();
      (next.firstElementChild as HTMLElement).focus({ preventScroll: true });
    }
  });

  // 离这一排视觉中线最近的书
  function nearest(row) {
    const center = row.getBoundingClientRect().left + row.clientWidth / 2;
    let best = null;
    let bestDistance = Infinity;
    row.querySelectorAll('.slot').forEach((slot) => {
      const r = slot.getBoundingClientRect();
      const distance = Math.abs(r.left + r.width / 2 - center);
      if (distance < bestDistance) { best = slot; bestDistance = distance; }
    });
    return best?.firstElementChild || null;
  }

  // 左右滚动或滑动：停在中间的那本就是当前书
  let scrollFrame = 0;
  app.addEventListener('scroll', (event) => {
    const row = event.target;
    if (!(row instanceof Element) || !row.classList.contains('row') || drag?.moved || scrollTarget) return;
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => setCurrent(nearest(row)));
  }, true);

  app.addEventListener('scrollend', (event) => {
    if (event.target instanceof Element && event.target.classList.contains('row')) releaseTarget();
  }, true);

  // 鼠标滚轮：上下滚一下就换一本；滚到头以后交还给页面滚动
  let wheelSum = 0;
  let wheelLock = 0;
  app.addEventListener('wheel', (event) => {
    const row = (event.target as Element).closest?.('.row');
    if (!row || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    const current = row.querySelector('.book.is-current') || nearest(row);
    const dir = Math.sign(event.deltaY);
    const slot = current?.parentElement;
    const next = dir > 0 ? slot?.nextElementSibling : slot?.previousElementSibling;
    if (!next) return;
    event.preventDefault();
    wheelSum += event.deltaY;
    if (performance.now() < wheelLock || Math.abs(wheelSum) < 30) return;
    wheelSum = 0;
    wheelLock = performance.now() + 280;
    setCurrent(next.firstElementChild, { scroll: 'smooth' });
  }, { passive: false });

  // 鼠标拖动：按住左右拖，松开后停到最近的一本；拖过的这一下不算点击
  let drag = null;
  app.addEventListener('pointerdown', (event) => {
    const row = (event.target as Element).closest?.('.row');
    if (!row || event.pointerType !== 'mouse' || event.button !== 0) return;
    releaseTarget();
    drag = { row, id: event.pointerId, x: event.clientX, left: row.scrollLeft, moved: false };
  });
  app.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.row.setPointerCapture(drag.id);
      drag.row.classList.add('is-dragging');
    }
    drag.row.scrollLeft = drag.left - dx;
  });
  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const { row, moved } = drag;
    drag = null;
    if (!moved) return;
    row.classList.remove('is-dragging');
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    const book = nearest(row);
    if (book) setCurrent(book, { scroll: 'smooth' });
  };
  app.addEventListener('pointerup', endDrag);
  app.addEventListener('pointercancel', endDrag);
  let suppressClick = false;

  /* ---------- 新章节：书名下一行“新增：…” ---------- */
  // 每本书的目录页里嵌着本书已上架章节的列表（阅读控件的 #rc-chapters）。服务器按登录邮箱记着每本书
  // “已经在目录页看到过”的章节（和阅读控件共用 /api/seen）。还有没看到过的新章节时，转到这本书时作者后面多一句“新增：…”；
  // 进了那本书的目录页就消失。没进去看也不会一直挂着：第一次出现 3 小时后自动消失，那几章算看到过；又有新章节时重新计时。
  // 第一次来时把现有章节都记为看到过。网址加 ?preview-new 时假装每本书最后一章是新加的，只预览、不写入。
  const fresh_titles = new Map<string, string[]>();
  function showNew(id: string) {
    const line = app.querySelector('.now span');
    if (!line) return;
    line.querySelector('em')?.remove();
    const titles = fresh_titles.get(id);
    if (!titles?.length) return;
    const em = document.createElement('em');
    em.textContent = titles.length === 1 ? `新增：${titles[0]}` : `新增 ${titles.length} 章：${titles[0]} 等`;
    line.append(em);
  }
  async function checkNew(book: any) {
    if (!book.directoryUrl || !/^https?:$/.test(location.protocol)) return;
    try {
      const page = await fetch(book.directoryUrl).then((r) => (r.ok ? r.text() : ''));
      const found = page.match(/<script type="application\/json" id="rc-chapters">([\s\S]*?)<\/script>/);
      if (!found) return;
      const info = JSON.parse(found[1]);
      const ids = info.chapters.map((c: any) => c.id);
      let fresh: string[];
      if (new URLSearchParams(location.search).has('preview-new')) {
        fresh = ids.slice(-1);
      } else {
        const api = `/api/seen/${encodeURIComponent(info.book)}`;
        const record = await fetch(api, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null));
        if (!record) return;
        if (!Array.isArray(record.seen)) {
          fetch(api, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seen: ids }) }).catch(() => {});
          return;
        }
        fresh = ids.filter((id: any) => !record.seen.includes(id));
        if (!fresh.length) return;
        const shown = Array.isArray(record.shown) ? record.shown : [];
        const put = (body: any) => fetch(api, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
        if (fresh.some((id: any) => !shown.includes(id)) || !record.shownAt) {
          put({ seen: record.seen, shown: fresh, shownAt: Date.now() });
        } else if (Date.now() - record.shownAt > 3 * 60 * 60 * 1000) {
          put({ seen: [...new Set([...record.seen, ...ids])] });
          return;
        }
      }
      const titles = info.chapters.filter((c: any) => fresh.includes(c.id)).map((c: any) => c.title);
      if (!titles.length) return;
      fresh_titles.set(book.id, titles);
      if (app.querySelector('.book.is-current')?.getAttribute('data-id') === book.id) showNew(book.id);
    } catch { /* 读不到就不提示 */ }
  }

  /* ---------- 书页 ---------- */

  function renderBook(id) {
    const book = byId(id);
    window.scrollTo(0, 0);
    if (!book) {
      document.title = library.name;
      app.innerHTML = '<div class="page book-view"><nav class="identity" aria-label="返回"><a class="back" href="#/">← 书架</a></nav>'
        + '<p class="missing">没有找到这本书。</p></div>';
      return;
    }
    lastBookId = book.id;
    if (book.directoryUrl) {
      rememberBook(book.id);
      location.replace(book.directoryUrl);
      return;
    }
    document.title = `${book.title} · ${library.name}`;

    const hasPages = (book.chapters || []).some((c) => c.pages);
    const chapters = (book.chapters || []).map((chapter) => {
      const unavailable = chapter.status === 'pending' || chapter.status === 'unpublished' || !chapter.href;
      const inner = `<span class="no">${esc(chapter.no)}</span><span class="title">${esc(chapter.title)}</span>`
        + `<span class="pages">${chapter.status === 'unpublished' ? '尚未上线' : unavailable ? '尚未整理' : esc(chapter.pages || '')}</span>`;
      return unavailable
        ? `<li><span class="chapter pending">${inner}</span></li>`
        : `<li><a class="chapter" href="${esc(chapterHref(book, chapter))}">${inner}</a></li>`;
    }).join('');

    const byline = [
      book.author ? `${esc(book.author)} 著` : '',
      book.translator ? `${esc(book.translator)} 译` : '',
    ].filter(Boolean).join('<br>');

    app.innerHTML = '<div class="page book-view">'
      + '<nav class="identity" aria-label="返回"><a class="back" href="#/">← 书架</a></nav>'
      + '<div class="book-layout">'
      + `<header class="book-head"><h1 tabindex="-1">${esc(book.title)}${book.subtitle ? `<small>${esc(book.subtitle)}</small>` : ''}</h1>`
      + (byline ? `<p class="byline">${byline}</p>` : '')
      + (book.edition ? `<p class="edition">${esc(book.edition)}</p>` : '')
      + '</header>'
      + `<section class="contents" aria-labelledby="contents-title"><h2 id="contents-title">目录${hasPages ? '<span>书页</span>' : ''}</h2><ol>${chapters}</ol></section>`
      + '</div></div>';
  }

  /* ---------- 打开与返回：安静的纸面淡入淡出 ---------- */
  // 不再把封面放大铺满屏幕：封面图分辨率有限，放大覆盖的转场显得刻意。
  // 点下去立刻盖上一层半透明纸色作为回应；页面切换由 CSS 的 @view-transition 在两页之间淡入淡出。

  const motionOK = () => !reduceMotion.matches && !!document.body.animate;
  // 支持跨页面视图过渡的浏览器会在两页之间自己淡入淡出；不支持的，先把纸色盖满再跳转
  const crossPageFade = 'onpagereveal' in window;
  let busy = false;

  async function leaveTo(url) {
    if (busy) return;
    busy = true;
    if (motionOK()) {
      const veil = document.createElement('div');
      veil.className = 'page-veil';
      veil.setAttribute('aria-hidden', 'true');
      document.body.append(veil);
      const settle = veil.animate([{ opacity: 0 }, { opacity: crossPageFade ? 0.45 : 1 }],
        { duration: crossPageFade ? 160 : 240, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
      if (!crossPageFade) await settle;
    }
    location.assign(url);
  }

  // 没有正式目录页的书在本页渲染目录，同样用淡入淡出切换
  function swap(update) {
    // 标签页在后台时浏览器会取消过渡，内容照常更新，不用报错
    if (motionOK() && document.startViewTransition) document.startViewTransition(update).ready.catch(() => {});
    else update();
  }

  function openBook(id) {
    const book = byId(id);
    rememberBook(id);
    if (book?.directoryUrl) {
      leaveTo(book.directoryUrl);
      return;
    }
    swap(() => {
      history.pushState(null, '', bookHash(id));
      renderBook(id);
      app.querySelector('h1')?.focus({ preventScroll: true });
    });
  }

  /* ---------- 路由与启动 ---------- */

  // 从浏览器缓存退回书架时，去掉离开时盖上的纸色
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    document.querySelectorAll('.page-veil').forEach((veil) => veil.remove());
    busy = false;
  });

  function render() {
    const id = routeId();
    if (id) renderBook(id);
    else renderShelf();
  }

  // 点旁边的书：先把它移到中间；点中间那本才打开
  app.addEventListener('click', (event) => {
    if (suppressClick) {
      event.preventDefault();
      return;
    }
    const book = (event.target as Element).closest<HTMLElement>('a.book');
    if (!book || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (!book.classList.contains('is-current')) {
      setCurrent(book, { scroll: 'smooth' });
      return;
    }
    openBook(book.dataset.id);
  });

  // 浏览器前进后退、点“← 书架”：本页目录与书架之间淡入淡出
  window.addEventListener('hashchange', () => swap(render));

  function validate(list) {
    const seen = new Set();
    return list.filter((book) => {
      if (!book || !book.id || !book.title) {
        console.warn('books.json：跳过缺少 id 或 title 的条目', book);
        return false;
      }
      if (seen.has(book.id)) {
        console.warn(`books.json：重复的 id「${book.id}」，只保留第一条`);
        return false;
      }
      seen.add(book.id);
      return true;
    });
  }

  fetch('books.json', { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      library = { ...library, ...(data.library || {}) };
      books = validate(data.books || []);
      render();
      books.forEach(checkNew);
    })
    .catch((error) => {
      const hint = location.protocol === 'file:'
        ? '直接打开文件时浏览器不允许读取 books.json，请用本地预览服务打开。'
        : `读取 books.json 失败：${esc(error.message)}`;
      app.innerHTML = `<p class="notice">${hint}</p>`;
    });
})();
