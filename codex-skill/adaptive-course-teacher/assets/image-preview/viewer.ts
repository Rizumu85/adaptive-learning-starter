import Panzoom from '@panzoom/panzoom';
import type { PanzoomObject } from '@panzoom/panzoom';
declare const VIEWER_ICONS: Record<string, string>;

// Critically damped spring (response 0.3 s), sampled for CSS/WAAPI; same feel as the shelf and reader chrome.
const SPRING = 'linear(0,0.067,0.205,0.358,0.499,0.619,0.715,0.79,0.848,0.89,0.921,0.944,0.96,0.972,0.981,0.986,0.991,0.993,0.995,0.997,0.998,0.999,1)';
const SPRING_MS = 480;
const MAX_SCALE = 8;

const initialized = Symbol.for('adaptive-learning.image-preview');
if (!(window as any)[initialized]) {
  (window as any)[initialized] = true;
  const zh = document.documentElement.lang.toLowerCase().startsWith('zh');
  const labels: Record<string, string> = zh
    ? { title: '图片预览', back: '返回', close: '返回阅读', previous: '上一张', next: '下一张', out: '缩小', in: '放大', reset: '适应窗口', loading: '正在加载图片…', error: '图片加载失败，请返回后重试。', image: '图片' }
    : { title: 'Image preview', back: 'Back', close: 'Back to reading', previous: 'Previous image', next: 'Next image', out: 'Zoom out', in: 'Zoom in', reset: 'Fit to window', loading: 'Loading image…', error: 'Image could not load. Go back and try again.', image: 'Image' };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const button = (action: string, icon = '', text = '') => `<button type="button" data-action="${action}" aria-label="${labels[action]}" title="${labels[action]}">${icon && VIEWER_ICONS[icon]}${text}</button>`;

  const dialog = document.createElement('dialog');
  dialog.className = 'al-image-preview';
  dialog.setAttribute('aria-label', labels.title);
  // The dialog itself takes focus on opening (see open()), so it must be focusable from script in every browser.
  dialog.tabIndex = -1;
  dialog.innerHTML = `<div class="al-viewer-backdrop"></div>`
    + `<div class="al-viewer-stage"><div class="al-viewer-canvas"><img class="al-viewer-image" alt="" draggable="false"></div><p class="al-viewer-status" role="status"></p></div>`
    + `<div class="al-viewer-top">${button('close', 'back', `<span>${labels.back}</span>`)}<span class="al-viewer-count"></span></div>`
    + `<div class="al-viewer-bottom"><p class="al-viewer-caption"></p><div class="al-viewer-controls">${button('previous', 'previous')}<span class="al-viewer-sep"></span>${button('out', 'out')}${button('reset')}${button('in', 'in')}<span class="al-viewer-sep"></span>${button('next', 'next')}</div></div>`;
  document.body.append(dialog);

  const $ = <T extends Element>(selector: string) => dialog.querySelector<T>(selector)!;
  const backdrop = $<HTMLElement>('.al-viewer-backdrop');
  const stage = $<HTMLElement>('.al-viewer-stage');
  const canvas = $<HTMLElement>('.al-viewer-canvas');
  const image = $<HTMLImageElement>('.al-viewer-image');
  const status = $<HTMLElement>('.al-viewer-status');
  const chrome = [$<HTMLElement>('.al-viewer-top'), $<HTMLElement>('.al-viewer-bottom')];
  const scaleButton = $<HTMLButtonElement>('[data-action="reset"]');
  const control = (action: string) => $<HTMLButtonElement>(`[data-action="${action}"]`);

  let links: HTMLAnchorElement[] = [];
  let index = 0;
  let panzoom: PanzoomObject | null = null;
  let request = 0;
  let trigger: HTMLAnchorElement | null = null;
  let closing = false;
  let busy = false;

  const motion = () => !reduceMotion.matches;
  const thumbOf = (link: HTMLAnchorElement | null) => link?.querySelector('img') ?? null;

  // The image fits between the floating top and bottom controls, never above its own pixels.
  function insets() {
    const top = chrome[0].getBoundingClientRect().bottom + 12;
    const bottom = innerHeight - chrome[1].getBoundingClientRect().top + 12;
    canvas.style.padding = `${top}px 16px ${bottom}px`;
    return { width: stage.clientWidth - 32, height: stage.clientHeight - top - bottom };
  }

  function size(width: number, height: number, capAtNatural: boolean) {
    const room = insets();
    const factor = Math.max(0.001, Math.min(room.width / width, room.height / height, capAtNatural ? 1 : Infinity));
    image.style.width = `${width * factor}px`;
    image.style.height = `${height * factor}px`;
  }

  function fit(animate = false) {
    if (!image.naturalWidth) return;
    size(image.naturalWidth, image.naturalHeight, true);
    panzoom?.reset({ animate });
  }

  function syncControls(scale = 1) {
    scaleButton.textContent = `${Math.round(scale * 100)}%`;
    scaleButton.disabled = !panzoom || scale <= 1.001;
    control('out').disabled = !panzoom || scale <= 1.001;
    control('in').disabled = !panzoom || scale >= MAX_SCALE;
    control('previous').disabled = index === 0;
    control('next').disabled = index === links.length - 1;
  }

  // Fades start from the element's current opacity, so a half-dragged close continues smoothly.
  function fade(elements: Element[], show: boolean, duration = 240, delay = 0) {
    return Promise.all(elements.map(element => element.animate(
      [{ opacity: show ? 0 : getComputedStyle(element).opacity }, { opacity: show ? 1 : 0 }],
      { duration: motion() ? duration : 120, delay: motion() ? delay : 0, easing: 'ease-out', fill: 'forwards' },
    ).finished.catch(() => {})));
  }

  async function show(nextIndex: number, options: { opening?: boolean; direction?: number } = {}) {
    index = nextIndex;
    const token = ++request;
    panzoom?.destroy();
    panzoom = null;
    image.getAnimations().forEach(animation => animation.cancel());
    image.style.transform = '';
    image.style.visibility = 'hidden';
    canvas.style.transform = '';
    status.textContent = '';
    const link = links[index];
    image.alt = link.dataset.previewCaption || thumbOf(link)?.alt || link.closest('figure')?.querySelector('figcaption')?.textContent?.trim() || labels.image;
    $('.al-viewer-caption').textContent = image.alt;
    $('.al-viewer-count').textContent = `${index + 1} / ${links.length}`;
    syncControls();
    image.src = link.href;
    const decoded = image.decode().then(() => true, () => false);
    const slow = setTimeout(() => { if (token === request) status.textContent = labels.loading; }, 300);

    const ok = await decoded;
    clearTimeout(slow);
    if (token !== request || !dialog.open) return;
    if (!ok) {
      status.textContent = labels.error;
      return;
    }
    status.textContent = '';
    // Panzoom moves the full-size canvas, not the centered image, so pointer-centered zoom does not jump.
    panzoom = Panzoom(canvas, { minScale: 1, maxScale: MAX_SCALE, panOnlyWhenZoomed: true, canvas: true, animate: false, duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    fit();
    image.style.visibility = 'visible';
    syncControls();
    // Opening: the full picture settles in from just below full size while the paper fades in, no enlarged thumbnail.
    if (options.opening && motion()) {
      image.animate([{ transform: 'scale(.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: SPRING_MS, easing: SPRING });
    }
    if (options.direction && motion()) {
      image.animate([{ transform: `translateX(${options.direction * 48}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: SPRING_MS, easing: SPRING });
    }
  }

  async function go(step: number, from = 0) {
    const target = index + step;
    if (busy || target < 0 || target >= links.length) return;
    busy = true;
    if (motion()) {
      await image.animate([{ transform: `translateX(${from}px)`, opacity: 1 }, { transform: `translateX(${from - step * 64}px)`, opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
    }
    busy = false;
    show(target, { direction: step });
  }

  function open(link: HTMLAnchorElement) {
    links = [...document.querySelectorAll<HTMLAnchorElement>('a[data-image-preview]')].filter(a => thumbOf(a) && /^(file:|https?:|blob:)/.test(a.href) && a.dataset.previewGroup === link.dataset.previewGroup);
    trigger = link;
    closing = false;
    document.documentElement.classList.add('al-preview-open');
    dialog.showModal();
    // Focus goes to the dialog, not to a control: the keys work at once and no button is left wearing a focus ring
    // that the reader did not ask for (opening by touch or mouse showed one on the back button). Tab reaches the back button first.
    dialog.focus();
    fade([backdrop], true, 280);
    fade(chrome, true, 280, 120);
    show(links.indexOf(link), { opening: true });
  }

  async function close() {
    if (closing || !dialog.open) return;
    closing = true;
    request++;
    // Closing is the opening in reverse, continuing from wherever a pull-down left the picture.
    const from = getComputedStyle(image).transform;
    const settle = motion() && image.style.visibility === 'visible'
      ? image.animate([{ transform: from === 'none' ? 'none' : from, opacity: 1 }, { transform: `${from === 'none' ? '' : from} scale(.96)`, opacity: 0 }], { duration: 220, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {})
      : null;
    fade(chrome, false, 160);
    await Promise.all([settle, fade([backdrop], false, motion() ? 260 : 120)]);
    dialog.close();
  }

  function act(action: string) {
    if (action === 'close') close();
    if (action === 'previous') go(-1);
    if (action === 'next') go(1);
    if (action === 'in') panzoom?.zoomIn({ animate: motion() });
    if (action === 'out') panzoom?.zoomOut({ animate: motion() });
    if (action === 'reset') fit(motion());
  }

  document.querySelectorAll('a[data-image-preview]').forEach(link => link.setAttribute('aria-haspopup', 'dialog'));
  document.addEventListener('click', event => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-image-preview]') : null;
    if (!link || !thumbOf(link) || !/^(file:|https?:|blob:)/.test(link.href)) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0 || dialog.open) return;
    event.preventDefault();
    link.setAttribute('aria-haspopup', 'dialog');
    open(link);
  });
  dialog.addEventListener('click', event => {
    const pressed = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
    if (pressed) act(pressed.dataset.action!);
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => {
    request++;
    panzoom?.destroy();
    panzoom = null;
    image.removeAttribute('src');
    image.style.visibility = 'hidden';
    for (const element of [backdrop, stage, ...chrome]) element.getAnimations().forEach(animation => animation.cancel());
    backdrop.style.opacity = '';
    chrome.forEach(element => { element.style.opacity = ''; });
    image.getAnimations().forEach(animation => animation.cancel());
    document.documentElement.classList.remove('al-preview-open');
    trigger?.focus({ preventScroll: true });
  });
  dialog.addEventListener('keydown', event => {
    const action = ({ '+': 'in', '=': 'in', '-': 'out', '0': 'reset', ArrowLeft: 'previous', ArrowRight: 'next' } as Record<string, string>)[event.key];
    if (action) { event.preventDefault(); act(action); }
  });
  stage.addEventListener('wheel', event => { event.preventDefault(); panzoom?.zoomWithWheel(event); }, { passive: false });
  stage.addEventListener('dblclick', event => {
    if (!panzoom) return;
    if (panzoom.getScale() > 1.01) fit(motion());
    else panzoom.zoomToPoint(2.5, event, { animate: motion() });
  });
  canvas.addEventListener('panzoomchange', ((event: CustomEvent) => {
    syncControls(event.detail.scale);
    if (event.detail.scale <= 1 && panzoom) panzoom.pan(0, 0, { force: true, silent: true });
  }) as EventListener);
  new ResizeObserver(() => { if (dialog.open && !closing) fit(); }).observe(stage);

  // At fit size, a one-finger (or mouse) drag pages sideways or pulls down to close; zoomed drags pan instead.
  type Drag = { x: number; y: number; axis: '' | 'x' | 'y'; dx: number; dy: number; samples: [number, number, number][] };
  const pointers = new Set<number>();
  let drag: Drag | null = null;
  stage.addEventListener('pointerdown', event => {
    pointers.add(event.pointerId);
    if (pointers.size > 1) { release(false); return; }
    if (!panzoom || panzoom.getScale() > 1.01 || busy || closing) return;
    drag = { x: event.clientX, y: event.clientY, axis: '', dx: 0, dy: 0, samples: [[event.clientX, event.clientY, event.timeStamp]] };
  });
  addEventListener('pointermove', event => {
    if (!drag || !pointers.has(event.pointerId)) return;
    drag.dx = event.clientX - drag.x;
    drag.dy = event.clientY - drag.y;
    drag.samples = [...drag.samples.slice(-4), [event.clientX, event.clientY, event.timeStamp]];
    if (!drag.axis && Math.hypot(drag.dx, drag.dy) > 8) drag.axis = Math.abs(drag.dx) > Math.abs(drag.dy) ? 'x' : drag.dy > 0 ? 'y' : '';
    if (drag.axis === 'x') {
      // Resist past the first and last image, like the edge of a scroll view.
      const edge = (drag.dx > 0 && index === 0) || (drag.dx < 0 && index === links.length - 1);
      const dx = edge ? drag.dx * 300 / (300 + Math.abs(drag.dx)) : drag.dx;
      image.style.transform = `translateX(${dx}px)`;
    }
    if (drag.axis === 'y') {
      const dy = Math.max(0, drag.dy);
      image.style.transform = `translate(${drag.dx * 0.5}px, ${dy}px) scale(${1 - Math.min(dy, 400) / 1600})`;
      backdrop.style.opacity = String(1 - Math.min(dy / 360, 0.75));
      chrome.forEach(element => { element.style.opacity = String(1 - Math.min(dy / 120, 1)); });
    }
  });
  const end = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    if (drag) release(true);
  };
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);

  function release(commit: boolean) {
    const current = drag;
    drag = null;
    if (!current || !current.axis) return;
    const [x0, y0, t0] = current.samples[Math.max(0, current.samples.length - 3)];
    const [x1, y1, t1] = current.samples[current.samples.length - 1];
    const vx = (x1 - x0) / Math.max(1, t1 - t0);
    const vy = (y1 - y0) / Math.max(1, t1 - t0);
    const step = current.dx < 0 ? 1 : -1;
    if (commit && current.axis === 'x' && (Math.abs(current.dx) > 80 || (Math.abs(vx) > 0.45 && Math.abs(current.dx) > 24)) && links[index + step]) {
      image.style.transform = '';
      go(step, current.dx);
      return;
    }
    if (commit && current.axis === 'y' && (current.dy > 110 || (vy > 0.5 && current.dy > 24))) {
      close();
      return;
    }
    // Not far enough: spring back to rest from wherever the drag left it.
    const from = image.style.transform;
    image.style.transform = '';
    backdrop.style.opacity = '';
    chrome.forEach(element => { element.style.opacity = ''; });
    if (motion() && from) image.animate([{ transform: from }, { transform: 'none' }], { duration: SPRING_MS, easing: SPRING });
  }
}
