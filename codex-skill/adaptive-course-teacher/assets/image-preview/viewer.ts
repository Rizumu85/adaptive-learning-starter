import Panzoom from '@panzoom/panzoom';
import type { PanzoomObject } from '@panzoom/panzoom';
declare const VIEWER_ICONS: Record<string, string>;

const initialized = Symbol.for('adaptive-learning.image-preview');
if (!(window as any)[initialized]) {
  (window as any)[initialized] = true;
  let links: HTMLAnchorElement[] = [];
  const zh = document.documentElement.lang.toLowerCase().startsWith('zh');
  const labels = zh
    ? { title:'图片预览', close:'返回阅读', back:'返回', previous:'上一张', next:'下一张', out:'缩小', in:'放大', reset:'适应窗口', scale:'缩放比例', loading:'正在加载图片…', error:'图片加载失败，请返回后重试。', image:'图片' }
    : { title:'Image preview', close:'Back to reading', back:'Back', previous:'Previous image', next:'Next image', out:'Zoom out', in:'Zoom in', reset:'Fit to window', scale:'Zoom level', loading:'Loading image...', error:'Image could not load. Go back and try again.', image:'Image' };
  const dialog = document.createElement('dialog');
  dialog.className = 'al-image-preview';
  dialog.setAttribute('aria-label', labels.title);
  const button = (action, label, icon, text = '') => `<button type="button" data-action="${action}" aria-label="${label}" title="${label}">${VIEWER_ICONS[icon]}${text}</button>`;
  dialog.innerHTML = `<header class="al-viewer-bar">${button('close', '返回阅读', 'back', '<span>返回</span>')}<p class="al-viewer-caption"></p><span class="al-viewer-count"></span></header><div class="al-viewer-stage"><div class="al-viewer-canvas"><img class="al-viewer-image" alt="" draggable="false"></div><p class="al-viewer-status" role="status"></p></div><div class="al-viewer-controls">${button('previous', '上一张', 'previous')}${button('out', '缩小', 'out')}<output aria-label="缩放比例">100%</output>${button('in', '放大', 'in')}${button('reset', '适应窗口', 'reset')}${button('next', '下一张', 'next')}</div>`;
  document.body.append(dialog);
  for (const control of dialog.querySelectorAll<HTMLButtonElement>('button[data-action]')) {
    control.title = control.ariaLabel = labels[control.dataset.action];
  }
  dialog.querySelector('[data-action="close"] span')!.textContent = labels.back;
  dialog.querySelector('output')!.setAttribute('aria-label', labels.scale);
  const stage = dialog.querySelector<HTMLElement>('.al-viewer-stage')!;
  const canvas = dialog.querySelector<HTMLElement>('.al-viewer-canvas')!;
  const image = dialog.querySelector<HTMLImageElement>('img')!;
  const status = dialog.querySelector<HTMLElement>('.al-viewer-status')!;
  const output = dialog.querySelector<HTMLOutputElement>('output')!;
  let index = 0;
  let panzoom: PanzoomObject | null;
  let request = 0;
  let trigger: HTMLAnchorElement;

  function fit() {
    if (!panzoom) return;
    const factor = Math.max(0.001, Math.min((stage.clientWidth - 32) / image.naturalWidth, (stage.clientHeight - 32) / image.naturalHeight, 1));
    image.style.width = `${image.naturalWidth * factor}px`;
    image.style.height = `${image.naturalHeight * factor}px`;
    panzoom.reset({ animate: false });
  }

  async function show(nextIndex) {
    index = nextIndex;
    const token = ++request;
    panzoom?.destroy();
    panzoom = null;
    image.style.visibility = 'hidden';
    canvas.style.transform = '';
    output.value = '100%';
    status.textContent = labels.loading;
    const link = links[index];
    image.alt = link.dataset.previewCaption || link.querySelector('img')?.alt || link.closest('figure')?.querySelector('figcaption')?.textContent || labels.image;
    dialog.querySelector('.al-viewer-caption').textContent = image.alt;
    dialog.querySelector('.al-viewer-count').textContent = `${index + 1} / ${links.length}`;
    for (const action of ['out', 'in', 'reset']) dialog.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.disabled = true;
    dialog.querySelector<HTMLButtonElement>('[data-action="previous"]')!.disabled = index === 0;
    dialog.querySelector<HTMLButtonElement>('[data-action="next"]')!.disabled = index === links.length - 1;
    image.src = link.href;
    try {
      await image.decode();
      if (token !== request || !dialog.open) return;
      // Match the transformed surface to the viewport so focal coordinates stay aligned.
      panzoom = Panzoom(canvas, { minScale: 1, maxScale: 8, panOnlyWhenZoomed: true, canvas: true, animate: false });
      fit();
      image.style.visibility = 'visible';
      status.textContent = '';
      for (const action of ['in', 'reset']) dialog.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.disabled = false;
    } catch {
      if (token === request && dialog.open) status.textContent = labels.error;
    }
  }

  function act(action) {
    if (action === 'close') dialog.close();
    if (action === 'previous' && index > 0) show(index - 1);
    if (action === 'next' && index < links.length - 1) show(index + 1);
    if (action === 'in') panzoom?.zoomIn();
    if (action === 'out') panzoom?.zoomOut();
    if (action === 'reset') fit();
  }
  document.querySelectorAll('a[data-image-preview]').forEach(link => link.setAttribute('aria-haspopup', 'dialog'));
  document.addEventListener('click', event => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-image-preview]') : null;
      if (!link || !link.querySelector('img') || !/^(file:|https?:|blob:)/.test(link.href)) return;
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      if (dialog.open) return;
      event.preventDefault();
      links = [...document.querySelectorAll<HTMLAnchorElement>('a[data-image-preview]')].filter(a => a.querySelector('img') && /^(file:|https?:|blob:)/.test(a.href) && a.dataset.previewGroup === link.dataset.previewGroup);
      link.setAttribute('aria-haspopup', 'dialog');
      trigger = link;
      document.documentElement.classList.add('al-preview-open');
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>('[data-action="close"]')!.focus();
      show(links.indexOf(link));
  });
  dialog.addEventListener('click', event => {
    const control = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
    if (control) act(control.dataset.action);
  });
  dialog.addEventListener('close', () => {
    request++;
    panzoom?.destroy();
    panzoom = null;
    image.removeAttribute('src');
    document.documentElement.classList.remove('al-preview-open');
    trigger?.focus({ preventScroll: true });
  });
  dialog.addEventListener('keydown', event => {
    const action = { '+': 'in', '=': 'in', '-': 'out', '0': 'reset', ArrowLeft: 'previous', ArrowRight: 'next' }[event.key];
    if (action) { event.preventDefault(); act(action); }
  });
  stage.addEventListener('wheel', event => { event.preventDefault(); panzoom?.zoomWithWheel(event); }, { passive: false });
  stage.addEventListener('dblclick', event => {
    if (!panzoom) return;
    if (panzoom.getScale() > 1.01) fit();
    else panzoom.zoomToPoint(2, event);
  });
  canvas.addEventListener('panzoomchange', (event: CustomEvent) => {
    const scale = event.detail.scale;
    output.value = `${Math.round(scale * 100)}%`;
    dialog.querySelector<HTMLButtonElement>('[data-action="out"]')!.disabled = scale <= 1;
    dialog.querySelector<HTMLButtonElement>('[data-action="in"]')!.disabled = scale >= 8;
    if (scale <= 1 && panzoom) panzoom.pan(0, 0, { force: true, silent: true });
  });
  new ResizeObserver(() => { if (dialog.open) fit(); }).observe(stage);
}
