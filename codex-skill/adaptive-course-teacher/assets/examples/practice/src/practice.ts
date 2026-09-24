import { getStroke } from "perfect-freehand";

type Point = [number, number, number];
type State = { version: 1; typed: string; strokes: Point[][]; rows: number; recalling: boolean; attempts: number; reveals: number };
const key = "adaptive-example:original-sentence:v1";
const fresh = (): State => ({ version: 1, typed: "", strokes: [], rows: 6, recalling: false, attempts: 0, reveals: 0 });
let storageWarning = "";
function read(): State {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fresh();
    const value = JSON.parse(raw);
    const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
    if (value?.version !== 1 || typeof value.typed !== "string" || typeof value.recalling !== "boolean"
      || !Number.isInteger(value.rows) || value.rows < 6 || value.rows > 100
      || !Number.isInteger(value.attempts) || value.attempts < 0
      || !Number.isInteger(value.reveals) || value.reveals < 0
      || !Array.isArray(value.strokes)
      || !value.strokes.every((stroke: unknown) => Array.isArray(stroke) && stroke.every((p: unknown) =>
        Array.isArray(p) && p.length === 3 && p.every(finite) && p[0] >= 0 && p[0] <= 1
        && p[1] >= 0 && p[1] <= 6400 && p[2] >= 0 && p[2] <= 1))) {
      throw new Error("Invalid saved record");
    }
    return value;
  } catch {
    storageWarning = "旧记录无法读取，本次内容尚未保存。";
    return fresh();
  }
}
const state = read();
const catalog = document.querySelector<HTMLElement>("#catalog-status");
if (catalog) {
  catalog.textContent = storageWarning || (state.typed || state.strokes.length
    ? `有草稿 · 回忆练习 ${state.attempts} 次 · 查看原句 ${state.reveals} 次`
    : "尚无本机记录");
}
const canvas = document.querySelector<HTMLCanvasElement>("#paper");
if (canvas) setup(canvas);

function setup(paper: HTMLCanvasElement): void {
  const context = paper.getContext("2d")!;
  const typed = document.querySelector<HTMLTextAreaElement>("#typed")!;
  const status = document.querySelector<HTMLElement>("#save-status")!;
  const recall = document.querySelector<HTMLButtonElement>("#recall")!;
  const undo = document.querySelector<HTMLButtonElement>("#undo")!;
  const add = document.querySelector<HTMLButtonElement>("#add")!;
  const reference = document.querySelector<HTMLElement>("#reference")!;
  const typedPanel = document.querySelector<HTMLElement>("#typed-panel")!;
  let active: Point[] | null = null;
  let pointer: number | null = null;
  // Preserve unreadable records until the learner explicitly chooses to replace them.
  let maySave = !storageWarning;
  if (!maySave) {
    const recover = document.createElement("button");
    recover.textContent = "用本次练习替换旧记录";
    recover.type = "button";
    recover.onclick = () => { maySave = true; save(); recover.remove(); };
    status.after(recover);
  }
  function save(): void {
    if (!maySave) { status.textContent = storageWarning; return; }
    try { localStorage.setItem(key, JSON.stringify(state)); status.textContent = "已保存在当前浏览器"; }
    catch { status.textContent = "保存失败，请保留此页。当前输入仍在页面中。"; }
  }
  function render(): void {
    const width = paper.clientWidth;
    const height = state.rows * 64;
    const dpr = window.devicePixelRatio || 1;
    paper.style.height = `${height}px`;
    paper.width = Math.round(width * dpr);
    paper.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = "#202024";
    for (const stroke of [...state.strokes, ...(active ? [active] : [])]) {
      const outline = getStroke(stroke.map(([x, y, pressure]) => [x * width, y, pressure]), {
        size: 3, thinning: .25, smoothing: .6, streamline: .45,
        simulatePressure: false, last: stroke !== active,
      });
      if (!outline.length) continue;
      context.beginPath();
      context.moveTo(outline[0][0], outline[0][1]);
      for (const [x, y] of outline.slice(1)) context.lineTo(x, y);
      context.closePath(); context.fill();
    }
    undo.disabled = state.strokes.length === 0;
    add.disabled = state.rows >= 100;
  }
  function phase(): void {
    reference.hidden = state.recalling;
    typedPanel.hidden = state.recalling;
    document.querySelector(".workspace")!.classList.toggle("recalling", state.recalling);
    recall.textContent = state.recalling ? "查看原句" : "合上原句";
    recall.setAttribute("aria-pressed", String(state.recalling));
    document.querySelector("#phase")!.textContent = state.recalling ? "凭记忆写出刚才的句子" : "阅读或对照原句";
    render();
  }
  typed.value = state.typed;
  status.textContent = storageWarning || "记录保存在当前浏览器";
  typed.oninput = () => { state.typed = typed.value; typed.style.height = "auto"; typed.style.height = `${typed.scrollHeight}px`; save(); };
  recall.onclick = () => {
    state.recalling = !state.recalling;
    if (state.recalling) state.attempts += 1;
    else state.reveals += 1;
    phase(); save();
  };
  undo.onclick = () => { state.strokes.pop(); render(); save(); };
  add.onclick = () => { state.rows = Math.min(100, state.rows + 2); render(); save(); };
  function append(event: PointerEvent): void {
    if (!active) return;
    const rect = paper.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(state.rows * 64, event.clientY - rect.top));
    const pressure = event.pointerType === "pen" ? Math.max(.05, event.pressure) : .5;
    active.push([x, y, pressure]);
  }
  paper.onpointerdown = event => {
    if (pointer !== null || event.button !== 0 || event.pointerType === "touch") return;
    event.preventDefault(); pointer = event.pointerId; active = [];
    paper.setPointerCapture(pointer); append(event); render();
  };
  paper.onpointermove = event => {
    if (event.pointerId !== pointer) return;
    const samples = event.getCoalescedEvents?.() || [];
    for (const sample of samples.length ? samples : [event]) append(sample);
    render();
  };
  function finish(event: PointerEvent): void {
    if (event.pointerId !== pointer || !active) return;
    // Do not append pointer-up's zero pressure or displaced position.
    state.strokes.push(active); active = null; pointer = null; render(); save();
  }
  paper.onpointerup = finish;
  paper.onpointercancel = finish;
  paper.onlostpointercapture = finish;
  new ResizeObserver(render).observe(paper);
  phase();
}
