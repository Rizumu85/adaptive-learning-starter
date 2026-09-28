// 鼠标停在去往别页的链接上（上一章、下一章、书架、目录里的章节）时，浏览器先在后台把那一页准备好，
// 点下去就能直接淡入。图片链接和页内锚点不在此列。
if (HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
  const rules = document.createElement('script');
  rules.type = 'speculationrules';
  // 预渲染不可用时（省电模式、内存紧张等）退回到只预取页面本身
  const where = { and: [{ href_matches: '/*' }, { not: { selector_matches: 'a[data-image-preview], a.rc-ref, a[href^="#"]' } }] };
  rules.textContent = JSON.stringify({ prerender: [{ where, eagerness: 'moderate' }], prefetch: [{ where, eagerness: 'moderate' }] });
  document.head.append(rules);
}

// 阅读页统一控件的行为：
// 顶栏读的时候让开：往下滚就收起，往上滚一点、回到顶部、鼠标移到窗口上沿、键盘聚焦或目录展开时出现。
// 本章目录下拉点选、按 Esc、点外面都会关闭；滚动时标出当前小节。没有脚本时顶栏常驻，<details> 本身也能展开收起。
(() => {
  const bar = document.querySelector('.rc-bar');
  if (!bar) return;
  const toc = bar.querySelector('.rc-toc');
  const panel = toc && toc.querySelector('.rc-toc-panel');

  let hidden = false;
  let lastY = scrollY;
  let holdUntil = 0;
  const setHidden = (value) => {
    if (value === hidden) return;
    hidden = value;
    bar.classList.toggle('is-hidden', value);
  };
  const reveal = (holdMs = 0) => {
    setHidden(false);
    lastY = scrollY;
    holdUntil = performance.now() + holdMs;
  };
  // 本书工具：分段选择与开关。状态写在 aria-checked 上，改动后在控件上派发 change，由本书脚本响应
  const choose = (option, focus) => {
    const group = option.parentElement;
    if (focus) option.focus();
    if (option.getAttribute('aria-checked') === 'true') return;
    for (const item of group.children) {
      item.setAttribute('aria-checked', String(item === option));
      item.tabIndex = item === option ? 0 : -1;
    }
    group.dispatchEvent(new Event('change', { bubbles: true }));
  };
  bar.addEventListener('click', (event) => {
    const option = event.target.closest('.rc-segmented > [role="radio"]');
    if (option) { choose(option); return; }
    const toggle = event.target.closest('.rc-toggle');
    if (!toggle || toggle.getAttribute('aria-disabled') === 'true') return;
    toggle.setAttribute('aria-checked', String(toggle.getAttribute('aria-checked') !== 'true'));
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
  });
  bar.addEventListener('keydown', (event) => {
    const option = event.target.closest('.rc-segmented > [role="radio"]');
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!option || !step) return;
    event.preventDefault();
    const items = [...option.parentElement.children];
    choose(items[(items.indexOf(option) + step + items.length) % items.length], true);
  });

  // 只有键盘焦点留在顶栏时才一直显示；鼠标点过的控件不拦住收起
  const needed = () => (toc && toc.open) || !!bar.querySelector(':focus-visible');
  const follow = () => {
    const y = scrollY;
    const dy = y - lastY;
    if (y <= bar.offsetHeight || needed()) { reveal(); return; }
    if (performance.now() < holdUntil) { lastY = y; return; }
    // 小幅抖动累计起来再判断方向，避免触控板轻微回弹让顶栏闪烁
    if (Math.abs(dy) < 8) return;
    setHidden(dy > 0);
    lastY = y;
  };

  bar.addEventListener('focusin', () => reveal());
  addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' && event.clientY < 24) reveal();
  }, { passive: true });

  if (toc) {
    const close = () => { toc.open = false; };
    toc.addEventListener('toggle', () => { if (toc.open) reveal(); });
    // 从目录跳到小节时顶栏留着，让人看清自己到了哪里；接着往下读才收起
    panel.addEventListener('click', (event) => { if (event.target.closest('a')) { close(); reveal(900); } });
    document.addEventListener('click', (event) => { if (toc.open && !toc.contains(event.target)) close(); });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toc.open) { close(); toc.querySelector('summary').focus(); }
    });

    // 本书专属工具（如语言、注音切换）：窄屏时收进下拉面板顶部，宽屏时放回顶栏
    const bookTools = toc.parentElement.querySelector(':scope > .rc-book-tools');
    if (bookTools) {
      const narrow = matchMedia('(max-width: 740px)');
      const place = () => {
        if (narrow.matches) panel.prepend(bookTools);
        else toc.before(bookTools);
      };
      place();
      narrow.addEventListener('change', place);
    }
  }

  const links = panel ? [...panel.querySelectorAll('a[href^="#"]')] : [];
  const targets = links.map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))));

  // 章节速览：页面右侧一列细刻度，展示本章结构。本章目录里的节是长刻度，节里的小标题是短刻度；
  // 平时很淡，指过去变清楚，悬停显示标题，点击跳过去；正在读的地方加深。
  // 刻度放在正文右侧的空白里，空白不够时隐藏；触屏改用下面的拖动条。重新打开页面时浏览器自己会回到上次的滚动位置，这里不另记“上次读到”。
  const main = document.querySelector('main');
  const headingText = (node) => {
    const copy = node.cloneNode(true);
    copy.querySelectorAll('rt, rp, .ja').forEach((n) => n.remove());
    const zh = copy.querySelector('.zh-heading');
    return (zh || copy).textContent.replace(/\s+/g, ' ').trim();
  };
  // 目录里的每一节落在它自己（若本身是标题）或它的第一个标题上
  const majors = new Map();
  targets.forEach((target, i) => {
    if (!target) return;
    const spot = target.matches('h2,h3') ? target : target.querySelector('h2,h3') || target;
    majors.set(spot, links[i].textContent.replace(/\s+/g, ' ').trim());
  });
  const spots = main ? [...new Set([...majors.keys(), ...main.querySelectorAll('h2,h3')])]
    .filter((el) => main.contains(el))
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)) : [];
  let ticks = [];
  let rail = null;
  let marker = null;
  if (spots.length > 1) {
    rail = document.createElement('nav');
    rail.className = 'rc-rail';
    rail.setAttribute('aria-label', '章节速览');
    // 每个大节前留出半格空白分组；整列高度按“刻度数 + 组间空白”分配
    const groups = majors.size ? spots.filter((s) => majors.has(s)).length : 1;
    rail.style.setProperty('--rc-ticks', String(spots.length + Math.max(0, groups - 1) * 1.5));
    spots.forEach((spot, i) => {
      if (!spot.id) spot.id = `rc-h${i + 1}`;
      const tick = document.createElement('a');
      tick.className = majors.has(spot) || !majors.size ? 'rc-tick rc-major' : 'rc-tick';
      tick.href = `#${spot.id}`;
      const text = majors.get(spot) || headingText(spot);
      const label = document.createElement('span');
      label.className = 'rc-tick-label';
      label.textContent = text;
      tick.append(label);
      rail.append(tick);
    });
    // 当前位置：一根墨色短线，滚动时按弹簧滑到对应刻度，而不是一格格跳
    marker = document.createElement('span');
    marker.className = 'rc-rail-marker';
    marker.setAttribute('aria-hidden', 'true');
    document.body.append(rail);
    ticks = [...rail.querySelectorAll('.rc-tick')];
    rail.append(marker);

    // 放大镜：指针附近的刻度变长，越近越长，像程序坞；密的时候也好点中
    let centers = [];
    let magFrame = 0;
    const measure = () => { centers = ticks.map((t) => { const r = t.getBoundingClientRect(); return r.top + r.height / 2; }); };
    rail.addEventListener('pointerenter', measure);
    rail.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || magFrame) return;
      const y = event.clientY;
      magFrame = requestAnimationFrame(() => {
        magFrame = 0;
        ticks.forEach((tick, i) => {
          const near = Math.max(0, 1 - Math.abs(centers[i] - y) / 56);
          tick.style.setProperty('--rc-mag', (1 + 1.4 * near * near).toFixed(2));
        });
      });
    });
    rail.addEventListener('pointerleave', () => ticks.forEach((tick) => tick.style.removeProperty('--rc-mag')));

    // 正文右边实际剩下的空白够放刻度（约 60px）才显示；按内容量，不按固定窗口宽度
    const fit = () => {
      let right = 0;
      for (const el of [main, ...main.querySelectorAll(':scope > *, :scope > * > *')].slice(0, 400)) {
        const r = el.getBoundingClientRect();
        if (!r.width || (r.left <= 1 && r.right >= innerWidth - 1)) continue;
        right = Math.max(right, r.right);
      }
      rail.classList.toggle('is-cramped', innerWidth - right < 60);
    };
    let fitTimer = 0;
    addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(fit, 100); });
    addEventListener('load', fit);
    fit();
  }

  // 触屏的拖动条：平时看不见；快速滚动（短时间滚过将近一屏）时，右侧淡淡显出本章各节的横刻度，当前位置是一根横向墨线，停下约一秒淡出。
  // 用横线而不是竖条，免得和浏览器自己的滚动条重复。按住墨线上下拖时逐节跳到小节开头，并显示小节名；
  // 不连续滚动，长章节里也不会上窜下跳。刚出现的一小会儿不接受按压，免得正常滑动时手指碰上去。离屏幕边缘留出距离，避免和系统返回手势冲突。
  let scrub = null;
  let scrubLabel = null;
  if (spots.length > 1 && matchMedia('(hover: none)').matches) {
    scrub = document.createElement('div');
    scrub.className = 'rc-scrub';
    scrub.setAttribute('aria-hidden', 'true');
    const marks = document.createElement('span');
    marks.className = 'rc-scrub-ticks';
    const handle = document.createElement('span');
    handle.className = 'rc-scrub-handle';
    // 把手是页边伸出的一块纸质索引标签，两道短横线表示可以抓着拖；旁边的纸签写着当前小节
    const grip = document.createElement('span');
    grip.className = 'rc-scrub-grip';
    scrubLabel = document.createElement('span');
    scrubLabel.className = 'rc-scrub-label';
    handle.append(grip, scrubLabel);
    scrub.append(marks, handle);
    document.body.append(scrub);

    const HANDLE = 56;
    const room = () => Math.max(1, scrub.clientHeight - HANDLE);
    const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const long = () => document.documentElement.scrollHeight > innerHeight * 4;
    const moveHandle = (f) => { handle.style.transform = `translateY(${(Math.min(1, Math.max(0, f)) * room()).toFixed(1)}px)`; };
    let fadeTimer = 0;
    let dragging = false;
    let armedAt = 0;
    let stops = [];
    const fade = () => { clearTimeout(fadeTimer); fadeTimer = setTimeout(() => { if (!dragging) scrub.classList.remove('is-active'); }, 1200); };
    // 每个小节在轨道上的位置：按跳到那一节后页面实际停下的位置计算，和把手的换算一致，停靠时正好落在刻度上。
    // 每一节都有刻度，大节长、小标题短而淡
    const measureStops = () => {
      stops = spots.map((spot) => {
        const margin = parseFloat(getComputedStyle(spot).scrollMarginTop) || 0;
        return { spot, f: Math.min(1, Math.max(0, (spot.getBoundingClientRect().top + scrollY - margin) / maxScroll())) };
      });
      marks.replaceChildren(...stops.map(({ spot, f }) => {
        const tick = document.createElement('span');
        tick.className = majors.has(spot) || !majors.size ? 'rc-scrub-tick rc-major' : 'rc-scrub-tick';
        tick.style.top = `${(f * room() + HANDLE / 2).toFixed(1)}px`;
        return tick;
      }));
    };

    // 快速滚动才出现：最近 300ms 内滚过的距离超过八成屏高
    const recent = [];
    addEventListener('scroll', () => {
      if (dragging) return;
      if (!long() || (toc && toc.open)) { scrub.classList.remove('is-active'); return; }
      const now = performance.now();
      recent.push([now, scrollY]);
      while (recent.length && now - recent[0][0] > 300) recent.shift();
      const active = scrub.classList.contains('is-active');
      if (!active) {
        if (Math.abs(scrollY - recent[0][1]) < innerHeight * 0.8) return;
        measureStops();
        armedAt = now;
        scrub.classList.add('is-active');
      }
      moveHandle(scrollY / maxScroll());
      fade();
    }, { passive: true });

    let grab = 0;
    let at = -1;
    handle.addEventListener('pointerdown', (event) => {
      if (!scrub.classList.contains('is-active') || performance.now() - armedAt < 250) return;
      event.preventDefault();
      dragging = true;
      try { handle.setPointerCapture(event.pointerId); } catch { /* 拿不到捕获时仍按普通移动处理 */ }
      grab = event.clientY - handle.getBoundingClientRect().top;
      at = -1;
      measureStops();
      scrub.classList.add('is-dragging');
      clearTimeout(fadeTimer);
    });
    handle.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const f = Math.min(1, Math.max(0, (event.clientY - scrub.getBoundingClientRect().top - grab) / room()));
      let nearest = 0;
      stops.forEach((stop, i) => { if (Math.abs(stop.f - f) < Math.abs(stops[nearest].f - f)) nearest = i; });
      if (nearest === at) return;
      at = nearest;
      const { spot } = stops[nearest];
      moveHandle(stops[nearest].f);
      scrubLabel.textContent = majors.get(spot) || headingText(spot);
      spot.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      scrub.classList.remove('is-dragging');
      // 松手后留在停靠的刻度上；之后再滚动才按页面位置移动
      moveHandle(at >= 0 ? stops[at].f : scrollY / maxScroll());
      fade();
    };
    handle.addEventListener('pointerup', release);
    handle.addEventListener('pointercancel', release);
  }

  const mark = () => {
    // 顶端越过视口上四分之一就算正在读；跳转落点（顶栏留白加小节上边距）总在这条线以上
    const line = Math.max(120, innerHeight * 0.25);
    let current = -1;
    targets.forEach((target, i) => { if (target && target.getBoundingClientRect().top <= line) current = i; });
    links.forEach((link, i) => link.toggleAttribute('aria-current', i === current));
    let here = -1;
    spots.forEach((spot, i) => { if (spot.getBoundingClientRect().top <= line) here = i; });
    ticks.forEach((tick, i) => tick.toggleAttribute('aria-current', i === here));
    if (scrubLabel) {
      const spot = spots[Math.max(0, here)];
      scrubLabel.textContent = majors.get(spot) || headingText(spot);
    }
    if (marker) {
      const tick = ticks[Math.max(0, here)];
      marker.style.transform = `translateY(${tick.offsetTop + tick.offsetHeight / 2 - 1}px)`;
      marker.classList.toggle('is-shown', here >= 0);
    }
  };

  let frame = 0;
  addEventListener('scroll', () => {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; follow(); mark(); });
  }, { passive: true });
  mark();
  // 浏览器恢复滚动位置、跳到地址里的锚点都发生在脚本之后，那时再判断一次
  addEventListener('load', () => mark());
  addEventListener('hashchange', () => mark());
})();

// 文中引用（a.rc-ref）：指向一张图或别处一段文字。描述和图隔得远时不必来回滚动——
// 鼠标悬停或键盘聚焦时就地浮出预览卡片（图显示小图和图注，文字显示标题和开头几行）；触屏第一次轻点预览、再点跳转。
// 一个引用也可以指向几处（data-refs 按文中顺序列出）：卡片里依次列出每一处，各自可以跳过去；点引用本身只是打开卡片。
// 跳过去后目标闪一下，左下角留“回到原文”，点它回到刚才读的位置。跨页引用在能读取同站页面时同样预览。
(() => {
  if (!document.querySelector('a.rc-ref')) return;
  const card = document.createElement('div');
  card.className = 'rc-peek';
  card.id = 'rc-peek';
  card.setAttribute('role', 'tooltip');
  card.hidden = true;
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'rc-return';
  back.textContent = '↩ 回到原文';
  back.hidden = true;
  document.body.append(card, back);

  const pageOf = (href) => href.split('#')[0];
  // href 是第一处（没有脚本时照常跳转）；data-refs 用空格分隔列出全部目标
  const targetsOf = (link) => (link.dataset.refs || link.getAttribute('href') || '').trim().split(/\s+/).filter(Boolean);
  const parse = (href) => {
    const url = new URL(href, location.href);
    return { url, id: decodeURIComponent(url.hash.slice(1)), samePage: pageOf(url.href) === pageOf(location.href) };
  };
  // 同页目标同步取得（点击时要立刻决定是否拦下默认跳转）；跨页目标读取那一页再找
  const local = (href) => {
    if (!href) return null;
    const { id, samePage } = parse(href);
    return samePage && id ? document.getElementById(id) : null;
  };
  const docs = new Map();
  const load = (url) => {
    if (!docs.has(url)) {
      docs.set(url, fetch(url).then((r) => (r.ok ? r.text() : null))
        .then((text) => text && new DOMParser().parseFromString(text, 'text/html')).catch(() => null));
    }
    return docs.get(url);
  };
  async function resolve(href) {
    const { url, id, samePage } = parse(href);
    if (!id) return null;
    const doc = samePage ? document : await load(pageOf(url.href));
    const el = doc && doc.getElementById(id);
    return el ? { el, samePage, url, href } : null;
  }
  const plain = (node) => {
    const copy = node.cloneNode(true);
    copy.querySelectorAll('rt, rp, .ja').forEach((n) => n.remove());
    return copy.textContent.replace(/\s+/g, ' ').trim();
  };
  const line = (className, textContent) => Object.assign(document.createElement('p'), { className, textContent });

  let current = null;
  let token = 0;
  let showTimer = 0;
  let hideTimer = 0;
  function place(link) {
    const r = link.getBoundingClientRect();
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const below = r.bottom + 10 + h <= innerHeight - 8 || r.top - 10 - h < 8;
    card.dataset.side = below ? 'below' : 'above';
    card.style.top = `${below ? r.bottom + 10 : r.top - 10 - h}px`;
    card.style.left = `${Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8)}px`;
  }
  // 返回 false 表示一处也读不到（比如本地文件读不了别的章节），调用方改为直接跳转
  async function open(link) {
    clearTimeout(hideTimer);
    if (current === link && !card.hidden) return true;
    const mine = ++token;
    const found = (await Promise.all(targetsOf(link).map(resolve))).filter(Boolean);
    if (mine !== token) return true;
    if (!found.length) return false;
    const many = found.length > 1;
    const blocks = found.map(({ el, samePage, url, href }) => {
      // 指向图（figure 或 img）时预览图；指向一页或一段文字时预览标题和开头，即使那一页里有图
      const img = el.matches('img') ? el : el.matches('figure') ? el.querySelector('img') : null;
      const parts = [];
      if (img) {
        const pic = document.createElement('img');
        pic.className = 'rc-peek-img';
        pic.src = samePage ? (img.currentSrc || img.src) : new URL(img.getAttribute('src'), url).href;
        pic.alt = img.alt;
        pic.dataset.target = href;
        pic.addEventListener('load', () => { if (current === link) place(link); }, { once: true });
        parts.push(pic);
        const caption = el.querySelector('figcaption');
        const text = caption ? plain(caption) : img.alt;
        if (text) parts.push(line('rc-peek-caption', text));
      } else {
        const heading = el.matches('h1,h2,h3,h4') ? el : el.querySelector('h1,h2,h3,h4');
        const para = el.matches('p') ? el : [...el.querySelectorAll('p')].find((p) => plain(p).length > 12);
        if (heading) parts.push(line('rc-peek-title', plain(heading)));
        if (para) parts.push(line('rc-peek-text', plain(para)));
      }
      const go = Object.assign(document.createElement('a'), { className: 'rc-peek-go', href: url.href, textContent: img ? '在文中看这张图 →' : '跳到这里 →' });
      go.dataset.target = href;
      parts.push(go);
      if (!many) return parts;
      const item = document.createElement('div');
      item.className = 'rc-peek-item';
      item.append(...parts);
      return [item];
    });
    card.classList.toggle('is-many', many);
    card.replaceChildren(...blocks.flat());
    current?.removeAttribute('aria-describedby');
    current = link;
    link.setAttribute('aria-describedby', 'rc-peek');
    card.hidden = false;
    card.classList.remove('is-open');
    place(link);
    requestAnimationFrame(() => card.classList.add('is-open'));
    return true;
  }
  function close() {
    token++;
    clearTimeout(showTimer);
    card.classList.remove('is-open');
    card.hidden = true;
    current?.removeAttribute('aria-describedby');
    current = null;
  }

  // 跳到同页目标：记下出发点，目标闪一下，留“回到原文”
  let origin = null;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const flash = (el) => { el.classList.remove('rc-flash'); void el.offsetWidth; el.classList.add('rc-flash'); };
  const watch = new IntersectionObserver((entries) => {
    if (origin && entries.some((e) => e.target === origin && e.isIntersecting)) { back.hidden = true; origin = null; watch.disconnect(); }
  });
  function jump(link, el) {
    close();
    origin = link;
    watch.disconnect();
    el.scrollIntoView({ block: 'center', behavior: reduce.matches ? 'auto' : 'smooth' });
    flash(el);
    back.hidden = false;
    // 滚动结束后才开始看出发点是否回到视野，免得刚起跳就把按钮收掉
    setTimeout(() => { if (origin === link) watch.observe(link); }, 900);
  }
  back.addEventListener('click', () => {
    if (!origin) return;
    const link = origin;
    back.hidden = true;
    origin = null;
    watch.disconnect();
    link.scrollIntoView({ block: 'center', behavior: reduce.matches ? 'auto' : 'smooth' });
    flash(link);
    link.focus({ preventScroll: true });
  });

  document.addEventListener('pointerover', (event) => {
    if (event.pointerType !== 'mouse') return;
    const link = event.target.closest('a.rc-ref');
    if (link) { clearTimeout(hideTimer); clearTimeout(showTimer); showTimer = setTimeout(() => open(link), 180); }
    else if (event.target.closest('.rc-peek')) clearTimeout(hideTimer);
  });
  document.addEventListener('pointerout', (event) => {
    if (event.pointerType !== 'mouse' || !event.target.closest('a.rc-ref, .rc-peek')) return;
    if (event.relatedTarget && event.relatedTarget.closest && event.relatedTarget.closest('a.rc-ref, .rc-peek')) return;
    clearTimeout(showTimer);
    hideTimer = setTimeout(close, 220);
  });
  document.addEventListener('focusin', (event) => {
    const link = event.target.closest && event.target.closest('a.rc-ref');
    if (link && link.matches(':focus-visible')) open(link);
    else if (!(event.target.closest && event.target.closest('.rc-peek'))) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !card.hidden) { const link = current; close(); if (link) link.focus(); }
  });
  addEventListener('scroll', () => { if (!card.hidden && !card.matches(':hover')) close(); }, { passive: true });
  document.addEventListener('click', (event) => {
    const pic = event.target.closest('.rc-peek-img');
    if (pic && current) {
      // 卡片里的小图直接打开图片预览（同页且那张图可预览时），否则跳过去看
      const el = local(pic.dataset.target);
      const viewer = el && el.querySelector('a[data-image-preview]');
      const link = current;
      close();
      if (viewer) viewer.click();
      else if (el) jump(link, el);
      else location.assign(new URL(pic.dataset.target, location.href).href);
      return;
    }
    const link = event.target.closest('a.rc-ref, a.rc-peek-go');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      if (!event.target.closest('.rc-peek')) close();
      return;
    }
    if (link.matches('.rc-peek-go')) {
      const from = current;
      const el = local(link.dataset.target);
      if (el && from) { event.preventDefault(); jump(from, el); }
      return;
    }
    // 指向几处时没有唯一的去处，点引用只打开卡片；触屏第一次轻点也只预览，再点才跳
    const touch = event.pointerType && event.pointerType !== 'mouse' && current !== link;
    if (targetsOf(link).length > 1 || touch) {
      event.preventDefault();
      open(link).then((shown) => { if (!shown) location.assign(link.href); });
      return;
    }
    const el = local(link.getAttribute('href'));
    if (el) { event.preventDefault(); jump(link, el); }
  });
})();
