// 对照阅读：原文 / 译文 / 对照三种视图与注音开关，偏好按书保存在本机。
// 控件的点选和方向键由 reader-chrome.js 负责并派发 change 事件；这里只读写状态并应用到正文。
// 编辑这个文件，然后运行 npm run build 生成 bilingual.js。
(() => {
  const view = document.querySelector<HTMLElement>('[data-bilingual-view]');
  if (!view) return;
  const ruby = document.querySelector<HTMLElement>('[data-bilingual-ruby]');
  const views = ['parallel', 'target', 'source'];
  const storageKey = `${document.body.dataset.bilingualKey || 'bilingual'}:reader`;

  const options = () => [...view.querySelectorAll<HTMLElement>('[data-value]')];
  const currentView = () => options().find((o) => o.getAttribute('aria-checked') === 'true')?.dataset.value || 'parallel';
  const rubyOn = () => !ruby || ruby.getAttribute('aria-checked') === 'true';

  function setView(value: string) {
    for (const option of options()) {
      const on = option.dataset.value === value;
      option.setAttribute('aria-checked', String(on));
      option.tabIndex = on ? 0 : -1;
    }
  }

  function apply() {
    const current = currentView();
    document.body.dataset.view = current;
    document.body.classList.toggle('hide-ruby', !rubyOn());
    // 只看译文时没有注音可开关
    ruby?.setAttribute('aria-disabled', String(current === 'target'));
    try { localStorage.setItem(storageKey, JSON.stringify({ view: current, ruby: rubyOn() })); } catch { /* 存不了就不记 */ }
  }

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && views.includes(saved.view)) {
      setView(saved.view);
      ruby?.setAttribute('aria-checked', String(saved.ruby !== false));
    }
  } catch { /* 读不到就用默认 */ }
  apply();
  view.addEventListener('change', apply);
  ruby?.addEventListener('change', apply);
})();
