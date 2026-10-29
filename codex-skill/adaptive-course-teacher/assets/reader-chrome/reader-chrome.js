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
  // 刻度放在正文右侧的空白里，空白不够时隐藏；触屏改用下面的拖动条。重新打开页面时浏览器自己会回到上次的滚动位置，刻度上不另标“上次读到”
  // （读到哪一章哪一节另由下面的“上次读到”记在服务器上，给目录页和书架用）。
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
  // 目录页不放速览：章节列表本身就是目录，刻度只会是一排没有层次的线
  const onContents = !!document.querySelector('.rc-bar .rc-here');
  const spots = main && !onContents ? [...new Set([...majors.keys(), ...main.querySelectorAll('h2,h3')])]
    // 页面里自带的导航（比如章内小目录）里的标题不算本章结构
    .filter((el) => main.contains(el) && !el.closest('nav'))
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)) : [];
  // 页面自己带 id 的标题（下面给刻度补的 id 不算）：本章没有目录时，“上次读到”记到这些标题上
  const anchored = new Set(spots.filter((spot) => spot.id));
  let ticks = [];
  let rail = null;
  let marker = null;
  if (spots.length > 1) {
    rail = document.createElement('nav');
    rail.className = 'rc-rail';
    rail.setAttribute('aria-label', '章节速览');
    // 每个大节前留出半格空白分组；整列高度按“刻度数 + 组间空白”分配
    // 没有层次（每个刻度都是大节，或者本章没有目录）时，全部用淡的短刻度，不分组：一排同样深的长线太重
    const flat = !majors.size || spots.every((s) => majors.has(s));
    const groups = flat ? 1 : spots.filter((s) => majors.has(s)).length;
    rail.style.setProperty('--rc-ticks', String(spots.length + Math.max(0, groups - 1) * 1.5));
    spots.forEach((spot, i) => {
      if (!spot.id) spot.id = `rc-h${i + 1}`;
      const tick = document.createElement('a');
      tick.className = !flat && majors.has(spot) ? 'rc-tick rc-major' : 'rc-tick';
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
    // 正在读的这一节记在顶栏上（data-rc-section / data-rc-section-title），变了就在顶栏上派发 rc-section，给“上次读到”用。
    // 用本章目录里的节；本章没有目录时用页面自己带 id 的标题。还没读到第一节时为空
    let section = null;
    if (links.length) {
      if (current >= 0 && targets[current] && targets[current].id) section = [targets[current].id, links[current].textContent.replace(/\s+/g, ' ').trim()];
    } else {
      for (let i = here; i >= 0 && !section; i--) if (anchored.has(spots[i])) section = [spots[i].id, headingText(spots[i])];
    }
    const [sectionId, sectionTitle] = section || ['', ''];
    if (bar.dataset.rcSection !== sectionId) {
      bar.dataset.rcSection = sectionId;
      bar.dataset.rcSectionTitle = sectionTitle;
      bar.dispatchEvent(new Event('rc-section'));
    }
    if (scrubLabel) {
      const spot = spots[Math.max(0, here)];
      scrubLabel.textContent = majors.get(spot) || headingText(spot);
    }
    if (marker) {
      // 按实际（带小数的）位置对齐到刻度中线；offsetTop 会取整，差出不到一像素也看得出来
      const tick = ticks[Math.max(0, here)];
      const box = tick.getBoundingClientRect();
      const y = box.top - rail.getBoundingClientRect().top + box.height / 2 - marker.offsetHeight / 2;
      marker.style.transform = `translateY(${y.toFixed(2)}px)`;
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
// 鼠标悬停或键盘聚焦时就地浮出预览卡片（图显示小图和图注，文字显示标题和第一段说明，只指向别处的句子不放）；触屏第一次轻点预览、再点跳转。
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
  // 箭头用线条图标，不用箭头符号字符：苹果设备会把那类字符画成彩色 emoji
  back.innerHTML = '<svg class="rc-return-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M6 3.5 2.5 7 6 10.5M2.5 7H10a3.5 3.5 0 0 1 0 7H8.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>回到原文';
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
  // 双语书（body[data-view]）：卡片只显示一种语言。只看原文时取 .source，其余（对照、只看译文）取 .target
  const sourceOnly = () => document.body.dataset.view === 'source';
  const plain = (node) => {
    const copy = node.cloneNode(true);
    copy.querySelectorAll('rt, rp, .ja').forEach((n) => n.remove());
    if (document.body.dataset.view && copy.querySelector('.source, .target, .source-heading, .target-heading')) {
      copy.querySelectorAll(sourceOnly() ? '.target, .target-heading' : '.source, .source-heading').forEach((n) => n.remove());
    }
    return copy.textContent.replace(/\s+/g, ' ').trim();
  };
  const line = (className, textContent) => Object.assign(document.createElement('p'), { className, textContent });
  // 目标是空的定位标记（比如只标页码的锚点）时，要预览的是它后面的内容：一直到下一个同类标记为止
  const following = (el) => {
    if (el.childElementCount || el.textContent.trim()) return [];
    const kind = el.classList[0];
    const walker = el.ownerDocument.createTreeWalker(el.ownerDocument.body, NodeFilter.SHOW_ELEMENT);
    walker.currentNode = el;
    const found = [];
    for (let node = walker.nextNode(); node && found.length < 600; node = walker.nextNode()) {
      if (kind ? node.classList.contains(kind) : node.id) break;
      found.push(node);
    }
    return found;
  };
  // 卡片里的文字只放说明本身：整句只是指向别处的引用（“参考第141页。”“（→p.233）”“233ページ参照。”“See p. 12.”）
  // 在卡片里没有用，略去；括号里只有页码或图号的指路也略去。写进句子里的引用（“……，几乎不动，参考第142页。”）原样保留
  const NUMS = String.raw`\d+(?:\s*[-–—~～]\s*\d+)?(?:\s*(?:[、,，&]|和|与|及|and)\s*\d+(?:\s*[-–—~～]\s*\d+)?)*`;
  const PLACE = String.raw`(?:第\s*${NUMS}\s*[页頁]|${NUMS}\s*(?:ページ|頁)|(?:pp?\.?|pages?)\s*${NUMS}|(?:[图圖図]|fig(?:ure)?s?\.?)\s*\d+(?:[-–.]\d+)*)(?:\s*(?:的|の)?\s*[图圖図]\s*\d+(?:[-–.]\d+)*)?`;
  const POINTER = new RegExp(`^(?:${[
    String.raw`(?:→|⇒|->)\s*${PLACE}(?:\s*参照)?`,
    String.raw`(?:(?:关于|有关|至于|对于)[^，,。；;]{0,30}?(?:(?:详细|具体|更多)?(?:介绍|说明|解释|内容|图示|图解|讨论))?[，,]?\s*)?(?:请|可|可以|也可|还可|另请|另|详|亦)?(?:参考|参见|参阅|参照|见|详见)\s*${PLACE}(?:\s*的?(?:内容|说明|介绍|图示|图解))?`,
    String.raw`(?:(?:詳しく|詳細|くわしく)は\s*)?${PLACE}\s*(?:を|も)?\s*(?:参照|参考)(?:のこと|してください|して下さい|ください|されたい)?`,
    String.raw`(?:(?:for|on)\s+(?:more|details|further)[^,]{0,60},\s*)?(?:please\s+)?(?:see|refer to|cf\.?|compare)(?:\s+also)?\s+${PLACE}(?:\s+for\s+(?:more|details|further)[\w\s]{0,30})?`,
  ].join('|')})$`, 'i');
  const BARE_PLACE = new RegExp(`^${PLACE}$`, 'i');
  const bare = (text) => {
    let t = text.trim().replace(/[\s。．.！!？?；;，,]+$/, '');
    for (let m; (m = t.match(/^[（(【[]\s*([\s\S]*?)\s*[）)】\]]$/));) t = m[1].replace(/[\s。．.！!？?；;，,]+$/, '');
    return t;
  };
  const pointerOnly = (text, inBrackets) => {
    const t = bare(text);
    return POINTER.test(t) || (inBrackets && BARE_PLACE.test(t));
  };
  // 按句切开：中日文按 。！？，西文按句末的 . ! ? 加空格，p. / fig. / cf. 这类缩写后面不断句
  const sentencesOf = (text) => {
    const out = [];
    let start = 0;
    for (const m of text.matchAll(/[。！？]+|[.!?]+(?=\s|$)/g)) {
      if (m[0] === '.' && /(?:^|[\s(（])(?:p|pp|cf|figs?|vol|ch|no|e\.g|i\.e|vs)$/i.test(text.slice(start, m.index))) continue;
      const close = text.slice(m.index + m[0].length).match(/^[」』”’"')）]*/)[0];
      const stop = m.index + m[0].length + close.length;
      out.push(text.slice(start, stop));
      start = stop;
    }
    if (start < text.length) out.push(text.slice(start));
    return out;
  };
  // 段首的“名称（原文）：”是词条名；名称后面只剩指路时整段算空
  const TERM = /^\s*([^：:（(。！？!?]{1,40}?)\s*(?:[（(][^）)]*[）)])?\s*[：:]/;
  const previewText = (node) => {
    const text = plain(node);
    const head = text.match(TERM);
    const prefix = head ? head[0] : '';
    const rest = text.slice(prefix.length);
    const body = sentencesOf(rest)
      .map((s) => {
        const kept = s.replace(/\s*[（(]([^（）()]{1,60})[）)]/g, (all, inner) => (pointerOnly(inner, true) ? '' : all));
        return kept === s || /[\p{L}\p{N}]/u.test(kept) ? kept : '';
      })
      .filter((s) => !pointerOnly(s, false))
      .join('');
    if (body === rest) return text;
    return body.trim() ? `${prefix}${body}`.replace(/\s+/g, ' ').trim() : '';
  };
  // 一段定义的词条名：段首“名称：”，或段里标成 <dfn> 的名称
  const fold = (s) => (s || '').replace(/\s*[（(][^）)]*[）)]\s*$/, '').trim().toLowerCase();
  const termsOf = (node) => {
    if (!node) return [];
    const head = plain(node).match(TERM);
    return [head && head[1], ...[...node.querySelectorAll('dfn')].map(plain)].map(fold).filter(Boolean);
  };
  // 一段文字目标预览哪一段：目标本身是段落时就是它；否则在目标（或空锚点之后那一截）里找。
  // 双语页只在当前语言的段落里找；单语时跳过 12 字以内的短段。引用所在段落的词条名（或引用文字本身）
  // 和某一段的词条名相同时，优先那一段，而不是开头第一段
  const excerptOf = (el, after, link, lang) => {
    if (el.matches('p')) {
      const text = previewText(el);
      return text ? { node: el, text } : null;
    }
    const all = (selector) => [...el.querySelectorAll(selector), ...after.filter((node) => node.matches(selector))];
    const inLang = lang ? all(lang) : [];
    const min = inLang.length ? 0 : 12;
    const pool = (inLang.length ? inLang : all('p'))
      .map((node) => ({ node, text: previewText(node) })).filter(({ text }) => text.length > min);
    const wanted = link ? [...termsOf(link.closest('p')), fold(plain(link))].filter(Boolean) : [];
    return (wanted.length && pool.find(({ node }) => termsOf(node).some((t) => wanted.includes(t)))) || pool[0] || null;
  };

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
        const caption = (el.matches('img') ? el.closest('figure') : el)?.querySelector('figcaption');
        const text = caption ? plain(caption) : img.alt;
        if (text) parts.push(line('rc-peek-caption', text));
        // 图下面标了 data-rc-actions 的操作（比如在线填写、下载空白表），卡片里也列出来
        const actions = el.querySelector('[data-rc-actions]');
        if (actions) {
          const row = document.createElement('p');
          row.className = 'rc-peek-actions';
          actions.querySelectorAll('a[href]').forEach((a) => {
            const copy = a.cloneNode(true);
            copy.removeAttribute('class');
            copy.href = new URL(a.getAttribute('href'), url).href;
            row.append(copy);
          });
          if (row.childElementCount) parts.push(row);
        }
      } else {
        const after = following(el);
        const first = (selector) => after.find((node) => node.matches(selector)) || null;
        const heading = el.matches('h1,h2,h3,h4') ? el : el.querySelector('h1,h2,h3,h4') || first('h1,h2,h3,h4');
        const lang = document.body.dataset.view ? (sourceOnly() ? 'p.source' : 'p.target') : null;
        const para = excerptOf(el, after, link, lang);
        if (heading) parts.push(line('rc-peek-title', plain(heading)));
        if (para) parts.push(line('rc-peek-text', para.text));
        // 那一处只有图（没有标题和成段文字）时，预览第一张图
        const picture = !heading && !para && first('figure img');
        if (picture) {
          const pic = document.createElement('img');
          pic.className = 'rc-peek-img';
          pic.src = samePage ? (picture.currentSrc || picture.src) : new URL(picture.getAttribute('src'), url).href;
          pic.alt = picture.alt;
          pic.dataset.target = href;
          pic.addEventListener('load', () => { if (current === link) place(link); }, { once: true });
          parts.push(pic);
        }
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
  // 按下的那一刻记两件事，点击时用它们判断，不看点击那一刻的状态：
  // 一是这一次是手指、笔、鼠标还是键盘——有的手机浏览器（旧一些的 Safari、Firefox 和各种内置浏览器）的 click 事件不带 pointerType；
  // 二是卡片是不是已经为这条引用开着——有的浏览器在按下和点击之间会先触发悬停或聚焦，把卡片提前打开，
  // 那样第一次轻点就会被当成“再点一次”而直接跳走
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let pressed = '';
  let openAtPress = null;
  const press = (kind) => { pressed = kind; openAtPress = card.hidden ? null : current; };
  addEventListener('pointerdown', (event) => press(event.pointerType || ''), true);
  addEventListener('touchstart', () => press('touch'), { capture: true, passive: true });
  addEventListener('keydown', () => { pressed = 'key'; }, true);
  document.addEventListener('click', (event) => {
    const pic = event.target.closest('.rc-peek-img');
    if (pic && current) {
      // 卡片里的小图直接打开图片预览（同页且那张图可预览时），否则跳过去看
      const el = local(pic.dataset.target);
      const viewer = el && (el.matches('img') ? el.closest('a[data-image-preview]') : el.querySelector('a[data-image-preview]'));
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
    // 指向几处时没有唯一的去处，点引用只打开卡片；触屏第一次轻点也只预览，再点才跳。
    // 键盘直接跳（聚焦时卡片已经开着）；鼠标也直接跳，但只在主要输入确实是鼠标的设备上——
    // 认不出是什么、或者手机把轻点报成鼠标时，按触屏处理
    const kind = event.pointerType || pressed;
    const direct = kind === 'key' || ((kind === 'mouse' || !kind) && fine.matches);
    const touch = !direct && openAtPress !== link;
    if (targetsOf(link).length > 1 || touch) {
      event.preventDefault();
      open(link).then((shown) => { if (!shown) location.assign(link.href); });
      return;
    }
    const el = local(link.getAttribute('href'));
    if (el) { event.preventDefault(); jump(link, el); }
  });
})();

// 目录页和章节页里嵌着本书已上架章节的列表（#rc-chapters，配置写了书架 id 时才有）。下面两件事都靠它，都需要已登录的私有站点。
//
// 新章节：读者上次在目录页看到之后新加的章节，在目录页的章名后标一个小小的“新”。
// 服务器按登录邮箱记着每本书“已经在目录页看到过”的章节；目录页显示出“新”的同时就记为看到过，刷新后不再显示。
// 第一次来时把现有章节都记为看到过，什么都不标。章节页不写记录。
// 网址加 ?preview-new 时，假装最后一章是新加的，只用来预览样子，不写入记录。本地打开文件或没有接口时什么都不做。
//
// 上次读到：章节页记下读者读到哪一章、哪一节；目录页在页头下给一行“继续阅读 · 章名 · 节名”，并在那一章的章名后标“上次”；
// 书架在当前那本书下面写“上次读到：…”。服务器按登录邮箱给每位读者存一份，里面每本书一条（GET /api/position 取全部，
// PUT /api/position/<书架 id> 记一本）。只记章和节，不记滚动位置：重新打开同一章时浏览器自己会回到原来的滚动位置。
// 正在读的节（顶栏记着的那一节）变了，停 2 秒后记下；离开页面或切到别的标签页时立刻记下。第一次读取成功后才开始记，
// 所以本地打开文件或没有这个接口时什么都不做。这一次打开页面后还没读到过任何一节时，停在本章开头不覆盖同一章里更深的位置。
// 网址加 ?preview-position 时，目录页假装上次读到第一章，只看样子，不连服务器；章节页这时什么都不记。
(() => {
  const data = document.getElementById('rc-chapters');
  if (!data) return;
  let info;
  try { info = JSON.parse(data.textContent); } catch { return; }
  const ids = info.chapters.map((c) => c.id);
  const onContents = !info.current;
  const params = new URLSearchParams(location.search);
  const online = /^https?:$/.test(location.protocol);
  const same = (href) => href.split('#')[0].split('?')[0].replace(/index\.html$/, '');
  const titleOf = (link, title) => link.querySelector('[class$="-title"],[class$="-name"],[class="title"],[class="name"]')
    || [...link.querySelectorAll('span,strong,em,b')].find((el) => !el.children.length && el.textContent.trim() === title)
    || link;
  // 在目录里指向这一章的链接的章名后加一个小标记（“新”“上次”）。同一章还有指向章内某处的附加链接（比如“复习”）时，只标指向整章的那个
  const tag = (chapter, className, text) => {
    const target = same(new URL(chapter.url, location.href).href);
    const found = [...document.querySelectorAll('a[href]')]
      .filter((link) => !link.closest('.rc-bar, .rc-foot, .rc-continue') && same(link.href) === target && !link.querySelector(`.${className}`));
    const whole = found.filter((link) => !link.hash);
    (whole.length ? whole : found).forEach((link) => {
      const mark = document.createElement('span');
      mark.className = className;
      mark.textContent = text;
      titleOf(link, chapter.title).append(mark);
    });
  };

  function newChapters() {
    const mark = (fresh) => info.chapters.forEach((chapter) => { if (fresh.has(chapter.id)) tag(chapter, 'rc-new', '新'); });
    if (params.has('preview-new')) { if (onContents) mark(new Set(ids.slice(-1))); return; }
    if (!online) return;
    const api = `/api/seen/${encodeURIComponent(info.book)}`;
    const save = (seen) => fetch(api, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seen }) }).catch(() => {});
    fetch(api, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((record) => {
      if (!record) return;
      if (!Array.isArray(record.seen)) { save(ids); return; }
      if (!onContents) return;
      const fresh = ids.filter((id) => !record.seen.includes(id));
      if (!fresh.length) return;
      mark(new Set(fresh));
      save([...new Set([...record.seen, ...ids])]);
    }).catch(() => {});
  }

  // 目录页：页头下的“继续阅读”和章名后的“上次”。position 是这本书的记录，没有或那一章已不在目录里时什么都不显示。
  // 这一行放在页面的 h1 和紧跟着它的几段文字（原名、作者）后面；书想放在别处时，给那个位置的元素加 data-rc-continue
  function showContinue(position) {
    document.querySelectorAll('.rc-continue, .rc-last').forEach((node) => node.remove());
    const chapter = position && info.chapters.find((c) => c.id === position.chapter);
    if (!chapter) return;
    tag(chapter, 'rc-last', '上次');
    const url = new URL(chapter.url, location.href);
    if (position.section) url.hash = position.section;
    const line = document.createElement('p');
    line.className = 'rc-continue';
    const link = document.createElement('a');
    link.href = url.href;
    const part = (className, text) => link.append(Object.assign(document.createElement('span'), { className, textContent: text }));
    part('rc-continue-label', '继续阅读');
    // 没有小节目录的章，记下的“小节”就是章名本身，只显示一次
    for (const text of [chapter.title, position.section && ![chapter.title, position.chapterTitle].includes(position.sectionTitle) ? position.sectionTitle : '']) {
      if (!text) continue;
      part('rc-continue-sep', '·');
      part('rc-continue-where', text);
    }
    line.append(link);
    const slot = document.querySelector('[data-rc-continue]');
    const h1 = [...document.querySelectorAll('h1')].find((el) => !el.closest('.rc-bar'));
    if (slot) { slot.append(line); return; }
    if (!h1) return;
    let after = h1;
    while (after.nextElementSibling && after.nextElementSibling.matches('p:not(.rc-continue)')) after = after.nextElementSibling;
    after.after(line);
  }

  // 要不要把这里（next）记成上次读到的地方。和已记下的（saved）一样就不记；这一次打开页面后还没读到过任何一节（engaged 为假）时，
  // 停在本章开头不覆盖同一章里已记下的某一节：从另一台设备、或从目录点进同一章时页面在顶上，读者看一眼就走也不丢位置。
  // 读到过某一节再回到开头，才记成本章开头
  function worthSaving(next, saved, engaged) {
    if (saved && saved.url === next.url && saved.chapter === next.chapter && (saved.section || '') === next.section) return false;
    return !(!engaged && !next.section && saved && saved.chapter === next.chapter && saved.section);
  }

  function lastRead() {
    const preview = params.has('preview-position');
    if (!preview && !online) return;
    if (onContents) {
      if (preview) {
        const first = info.chapters[0];
        if (first) showContinue({ chapter: first.id, section: 'preview', sectionTitle: '示例小节' });
        return;
      }
      const load = () => fetch('/api/position', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null))
        .then((record) => { if (record && typeof record === 'object') showContinue(record[info.book]); }).catch(() => {});
      load();
      // 从章节页退回到目录页（浏览器从缓存里取回这一页）时重新读一次
      addEventListener('pageshow', (event) => { if (event.persisted) load(); });
      return;
    }
    const bar = document.querySelector('.rc-bar');
    const chapter = info.chapters.find((c) => c.id === info.current);
    // 整理中的章节不在列表里，不记
    if (preview || !bar || !chapter) return;
    const api = `/api/position/${encodeURIComponent(info.book)}`;
    let saved;           // 服务器上这本书的记录；读到之前是 undefined，什么都不记
    let engaged = false; // 这一次打开页面后读到过某一节
    let timer = 0;
    const here = () => ({
      url: location.pathname, chapter: info.current, chapterTitle: chapter.title.slice(0, 120),
      section: bar.dataset.rcSection || '', sectionTitle: (bar.dataset.rcSectionTitle || '').slice(0, 200),
    });
    const save = (keepalive) => {
      clearTimeout(timer);
      if (saved === undefined) return;
      const next = here();
      if (!worthSaving(next, saved, engaged)) return;
      const before = saved;
      saved = next;
      // keepalive：页面正在关闭或切走时请求也能发出去；没存上时下一次照常再记
      fetch(api, { method: 'PUT', keepalive, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); })
        .catch(() => { if (saved === next) saved = before; });
    };
    const later = () => { clearTimeout(timer); timer = setTimeout(() => save(false), 2000); };
    bar.addEventListener('rc-section', () => {
      if (bar.dataset.rcSection) engaged = true;
      later();
    });
    addEventListener('pagehide', () => save(true));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(true); });
    // 浏览器恢复滚动位置、跳到网址里的小节都在页面加载完时发生，那之后再开始
    const start = () => fetch('/api/position', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((record) => {
      if (!record || typeof record !== 'object') return;
      saved = record[info.book] || null;
      later();
    }).catch(() => {});
    if (document.readyState === 'complete') start();
    else addEventListener('load', start, { once: true });
  }

  newChapters();
  lastRead();
})();

// 标记这张：放大看图时，右上角页码旁有一个“标记这张”。读者看到哪张图有问题（裁歪了、底色不对、缺译文）就点一下，
// 服务器按登录邮箱和书记下这张图在哪一页、是哪个文件；再点一次取消。标了以后旁边多一个“加说明”，可以写一句哪里不对，不写也行。
// 清单留给做书的人照着去修，正文里不显示任何标记。
// 需要已登录的私有站点提供 /api/flags/<书在站点上的文件夹名>；没有这个接口（本地打开、别的站点）时按钮不出现。
// 网址加 ?preview-flag 时不连服务器，只用来看样子，刷新后不保留。
(() => {
  const demo = new URLSearchParams(location.search).has('preview-flag');
  if (!demo && !/^https?:$/.test(location.protocol)) return;
  const start = () => {
    // 控件放进共用图片预览的顶栏（image-preview 的 .al-viewer-top），靠它的图片地址知道正在看哪一张
    const dialog = document.querySelector('dialog.al-image-preview');
    const count = dialog && dialog.querySelector('.al-viewer-count');
    const image = dialog && dialog.querySelector('.al-viewer-image');
    if (!count || !image) return;
    // 页面和图片都记成书的文件夹（网址第一段）里的相对路径；写法和服务器接受的一致，不合的不提供标记
    const folder = location.pathname.split('/').filter(Boolean)[0] || '';
    const inside = (href) => {
      const path = new URL(href, location.href).pathname.replace(/\/$/, '/index.html');
      const rest = path.startsWith(`/${folder}/`) ? path.slice(folder.length + 2) : '';
      return /^[A-Za-z0-9._~%\/-]{1,300}$/.test(rest) && !/(^|\/)\./.test(rest) ? rest : '';
    };
    const api = `/api/flags/${encodeURIComponent(folder)}`;
    const make = (tag, className, html = '') => {
      const el = document.createElement(tag);
      el.className = className;
      el.hidden = true;
      el.innerHTML = html;
      return el;
    };
    const group = make('span', 'rc-flag-group');
    const noteButton = make('button', 'rc-flag-note', '<span></span>');
    const button = make('button', 'rc-flag', '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/></svg><span></span>');
    const editor = make('div', 'rc-flag-edit', '<input type="text" maxlength="200" enterkeyhint="done" autocomplete="off" aria-label="这张图哪里不对" placeholder="哪里不对？可以不写">');
    noteButton.type = 'button';
    button.type = 'button';
    group.append(noteButton, button);
    count.before(group);
    count.parentElement.append(editor);
    const input = editor.firstElementChild;
    const label = button.lastElementChild;

    let flags = null;   // 图片路径 → 记录。读到服务器的清单之前是 null，控件不出现
    let asked = false;
    let current = null; // 正在看的这张：{ page, image, figure }
    let editing = '';   // 正在写说明的那张图的路径
    let noteTimer = 0;
    const render = (text) => {
      const flag = flags && current ? flags.get(current.image) : null;
      group.hidden = button.hidden = !(flags && current);
      button.setAttribute('aria-pressed', String(!!flag));
      label.textContent = text || (flag ? '已标记' : '标记这张');
      button.title = flag ? '取消标记' : '标记这张图有问题，留到之后修';
      noteButton.hidden = !flag;
      noteButton.firstElementChild.textContent = flag && flag.note ? flag.note : '加说明';
      noteButton.title = flag && flag.note ? '改说明' : '写一句哪里不对，可以不写';
      noteButton.classList.toggle('has-note', !!(flag && flag.note));
    };
    const read = () => (demo ? Promise.resolve({ flags: [] }) : fetch(api, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)))
      .then((record) => { flags = record && Array.isArray(record.flags) ? new Map(record.flags.map((f) => [f.image, f])) : null; })
      .catch(() => { flags = null; });
    let saving = Promise.resolve();
    const save = () => {
      clearTimeout(noteTimer);
      render();
      if (demo) return;
      const body = JSON.stringify({ flags: [...flags.values()] });
      // 没存上时以服务器上的清单为准重新显示，并说一声，免得读者以为记下了
      saving = saving.then(() => fetch(api, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body }))
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); })
        .catch(() => read().then(() => { render(flags ? '没存上，再点一次' : ''); noteTimer = setTimeout(render, 2400); }));
    };
    // 收起说明输入框；keep 为真时把写的内容记到那张图的标记上（空着就是去掉说明）
    const closeEditor = (keep) => {
      if (editor.hidden) return;
      const flag = flags && flags.get(editing);
      const note = input.value.replace(/\s+/g, ' ').trim();
      editor.hidden = true;
      editing = '';
      if (!keep || !flag || note === (flag.note || '')) return;
      const { note: old, at, ...rest } = flag;
      flags.set(flag.image, note ? { ...rest, note, at } : { ...rest, at });
      save();
    };
    const look = () => {
      closeEditor(true);
      const link = image.getAttribute('src') && [...document.querySelectorAll('a[data-image-preview]')].find((a) => a.href === image.src);
      const page = inside(location.href);
      const path = link ? inside(link.href) : '';
      const id = link ? (link.closest('figure') || link).id : '';
      current = page.endsWith('.html') && path ? { page, image: path, figure: /^[\w.:-]{1,120}$/.test(id) ? id : '' } : null;
      if (current && !asked) { asked = true; read().then(() => render()); }
      render();
    };
    new MutationObserver(look).observe(image, { attributes: true, attributeFilter: ['src'] });

    button.addEventListener('click', () => {
      if (!flags || !current) return;
      closeEditor(false);
      const { page, image: path, figure } = current;
      if (flags.has(path)) flags.delete(path);
      else flags.set(path, figure ? { page, image: path, figure, at: Date.now() } : { page, image: path, at: Date.now() });
      save();
    });
    noteButton.addEventListener('click', () => {
      const flag = flags && current && flags.get(current.image);
      if (!flag) return;
      if (!editor.hidden) { closeEditor(true); return; }
      editing = flag.image;
      input.value = flag.note || '';
      editor.hidden = false;
      input.focus();
      input.select();
    });
    // 输入时的按键不交给图片预览（它用 + - 0 和方向键缩放、翻图）；回车记下，Esc 放弃这次改动而不是关掉预览
    // 收起后把焦点交还给预览窗口本身，方向键等照常可用，也不在哪个按钮上留下焦点框；浏览器不让窗口本身得到焦点时退回到“加说明”
    const leave = (keep) => {
      closeEditor(keep);
      dialog.focus();
      if (document.activeElement !== dialog) noteButton.focus();
    };
    input.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.isComposing) return;
      if (event.key === 'Enter') { event.preventDefault(); leave(true); }
      if (event.key === 'Escape') { event.preventDefault(); leave(false); }
    });
    // 点到别处就记下并收起；点的是“加说明”本身时交给它自己的点击去收，免得刚收起又被打开。
    // 图片区域会拦下按下的默认动作，输入框不会因此失去焦点，所以按下时自己收
    input.addEventListener('blur', (event) => { if (event.relatedTarget !== noteButton) closeEditor(true); });
    dialog.addEventListener('pointerdown', (event) => {
      if (!editor.hidden && !event.target.closest('.rc-flag-edit, .rc-flag-note')) closeEditor(true);
    }, true);
  };
  // 图片预览的脚本可能排在这个脚本后面，等页面的脚本都跑完再找它
  if (document.readyState === 'complete') start();
  else addEventListener('load', start, { once: true });
})();
// 折叠：正文里标了要点句（.rc-brief，作者原句一字不改）的页面，顶栏多一个“折叠”开关。折叠时每段只显示要点句，
// 段末一个省略号；点一段在原地展开全文，展开后段末有一个“折回”小按钮，只有点它才收回（乱点不会收回去）。
// 默认折叠；读者关掉后记在本机，换一章也保持关着。没有要点句的页面不出现。
// 动效（学 TextFold）：要点句里每个字从旧位置滑到新位置。为了不改动正文排版（改了会让断行跳一下），
// 不去拆正文，而是量出每个字的位置，在上面一层放这些字的替身飞过去，落定后换回正文；折起来的句子淡入，
// 段落高度平滑变化；展开后不加任何标记。只动视野里的段落；减少动态效果时只淡入淡出
(() => {
  const tools = document.querySelector('.rc-bar .rc-tools');
  if (!tools || !document.querySelector('p[data-fold]')) return;
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const spring = getComputedStyle(root).getPropertyValue('--rc-spring').trim() || 'cubic-bezier(0.23,1,0.32,1)';
  const easeOut = 'cubic-bezier(0.23,1,0.32,1)';
  const FLY = 520;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'rc-toggle rc-skim-toggle';
  toggle.setAttribute('role', 'switch');
  toggle.textContent = '折叠';
  toggle.title = '每段只显示作者原文里的要点句，点一段展开全文';
  const refoldButton = () => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rc-refold';
    button.title = '折回要点';
    button.setAttribute('aria-label', '折回要点');
    button.innerHTML = '<svg viewBox="0 0 16 12" aria-hidden="true"><path d="M3 9 8 4l5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return button;
  };
  const setOpen = (p, open) => {
    p.classList.toggle('rc-open', open);
    p.querySelector(':scope > .rc-refold')?.remove();
    if (open) p.append(refoldButton());
  };

  // 要点句里每个看得见的字的位置（只量，不改正文）
  const glyphs = (p) => {
    const out = [];
    const range = document.createRange();
    for (const brief of p.querySelectorAll('.rc-brief')) {
      const walker = document.createTreeWalker(brief, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        // 量的时候就把字体和颜色记成定值：computed style 是活的，正文变透明后再读就成了透明
        const cs = getComputedStyle(node.parentElement);
        const style = { fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle, color: cs.color };
        let i = 0;
        for (const ch of node.data) {
          const next = i + ch.length;
          if (ch.trim()) {
            range.setStart(node, i);
            range.setEnd(node, next);
            const rect = range.getClientRects()[0];
            if (rect && rect.width) out.push({ ch, rect, style });
          }
          i = next;
        }
      }
    }
    return out;
  };
  const visible = (p) => {
    const r = p.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  };

  // change() 改变折叠状态；paragraphs 里在视野内的段落会动起来
  const fold = (paragraphs, change, opening) => {
    const moving = paragraphs.filter(visible).slice(0, 16);
    for (const p of moving) p.rcStop?.();
    if (reduce.matches || !moving.length) {
      change();
      if (opening) for (const p of moving) for (const rest of p.querySelectorAll('.rc-rest')) rest.animate({ opacity: [0, 1] }, { duration: 200, easing: 'ease' });
      return;
    }
    const run = () => {
      const before = moving.map((p) => ({ p, glyphs: glyphs(p), height: p.getBoundingClientRect().height }));
      change();
      const layer = document.createElement('div');
      layer.className = 'rc-fly';
      layer.setAttribute('aria-hidden', 'true');
      document.body.append(layer);
      const sx = scrollX;
      const sy = scrollY;
      const all = [];
      for (const { p, glyphs: from, height } of before) {
        const to = glyphs(p);
        const animations = [];
        p.classList.add('rc-flying');
        from.forEach((g, i) => {
          const end = to[i];
          if (!end || end.ch !== g.ch) return;
          const twin = document.createElement('span');
          twin.textContent = g.ch;
          const s = g.style;
          Object.assign(twin.style, {
            left: `${end.rect.left + sx}px`, top: `${end.rect.top + sy}px`, height: `${end.rect.height}px`, lineHeight: `${end.rect.height}px`,
            fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, fontStyle: s.fontStyle, color: s.color,
          });
          layer.append(twin);
          const dx = g.rect.left - end.rect.left;
          const dy = g.rect.top - end.rect.top;
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) animations.push(twin.animate({ transform: [`translate(${dx}px, ${dy}px)`, 'none'] }, { duration: FLY, easing: spring }));
        });
        const after = p.getBoundingClientRect().height;
        if (Math.abs(after - height) > 1) animations.push(p.animate({ height: [`${height}px`, `${after}px`] }, { duration: 380, easing: easeOut }));
        if (opening) for (const rest of p.querySelectorAll('.rc-rest')) animations.push(rest.animate({ opacity: [0, 1] }, { duration: 360, delay: 120, easing: easeOut, fill: 'backwards' }));
        let stopped = false;
        p.rcStop = () => { if (stopped) return; stopped = true; animations.forEach((a) => a.cancel()); p.classList.remove('rc-flying'); };
        all.push(...animations);
        Promise.allSettled(animations.map((a) => a.finished)).then(() => { if (!stopped) { stopped = true; p.classList.remove('rc-flying'); } });
      }
      Promise.allSettled(all.map((a) => a.finished)).then(() => layer.remove());
      // 保险：动画迟迟没放完（页面在后台被放慢等）时，换回正文、收掉替身，不留空白
      setTimeout(() => { for (const { p } of before) p.rcStop?.(); layer.remove(); }, FLY + 1500);
    };
    if (opening) { run(); return; }
    // 收回：先让要折起来的句子淡出，再让要点句滑回去
    const fading = moving.flatMap((p) => [...p.querySelectorAll('.rc-rest')].map((rest) =>
      rest.animate({ opacity: [1, 0] }, { duration: 140, easing: 'ease', fill: 'forwards' })));
    Promise.allSettled(fading.map((a) => a.finished)).then(() => { run(); fading.forEach((a) => a.cancel()); });
  };

  const setSkim = (on) => {
    root.classList.toggle('rc-skim', on);
    toggle.setAttribute('aria-checked', String(on));
    for (const p of document.querySelectorAll('p[data-fold].rc-open')) setOpen(p, false);
  };
  let saved = true;
  try { saved = localStorage.getItem('rc-skim') !== '0'; } catch { /* 存不了就每次按默认折叠 */ }
  setSkim(saved);
  tools.prepend(toggle);
  // 顶栏的点击处理已经翻转了 aria-checked 并派发 change
  toggle.addEventListener('change', () => {
    const on = toggle.getAttribute('aria-checked') === 'true';
    toggle.setAttribute('aria-checked', String(!on));  // 先复原，由 setSkim 在动画里改
    const targets = [...document.querySelectorAll('p[data-fold]')].filter((p) => !p.classList.contains('rc-open'));
    fold(targets, () => setSkim(on), !on);
    try { localStorage.setItem('rc-skim', on ? '1' : '0'); } catch { /* 同上 */ }
  });
  document.addEventListener('click', (event) => {
    if (!root.classList.contains('rc-skim')) return;
    const refold = event.target.closest('.rc-refold');
    if (refold) {
      const p = refold.closest('p[data-fold]');
      fold([p], () => setOpen(p, false), false);
      return;
    }
    if (event.target.closest('a, button, .note-zone')) return;
    const p = event.target.closest('p[data-fold]:not(.rc-open)');
    if (!p || getSelection().toString()) return;
    fold([p], () => setOpen(p, true), true);
  });
})();
