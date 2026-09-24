(() => {
  // node_modules/perfect-freehand/dist/esm/index.mjs
  var { PI: e } = Math;
  var t = e + 1e-4;
  var n = 0.5;
  var r = [1, 1];
  function i(e2, t2, n2, r2 = (e3) => e3) {
    return e2 * r2(0.5 - t2 * (0.5 - n2));
  }
  var { min: a } = Math;
  function o(e2, t2, n2) {
    let r2 = a(1, t2 / n2);
    return a(1, e2 + (a(1, 1 - r2) - e2) * (r2 * 0.275));
  }
  function s(e2) {
    return [-e2[0], -e2[1]];
  }
  function c(e2, t2) {
    return [e2[0] + t2[0], e2[1] + t2[1]];
  }
  function l(e2, t2, n2) {
    return e2[0] = t2[0] + n2[0], e2[1] = t2[1] + n2[1], e2;
  }
  function u(e2, t2) {
    return [e2[0] - t2[0], e2[1] - t2[1]];
  }
  function d(e2, t2, n2) {
    return e2[0] = t2[0] - n2[0], e2[1] = t2[1] - n2[1], e2;
  }
  function f(e2, t2) {
    return [e2[0] * t2, e2[1] * t2];
  }
  function p(e2, t2, n2) {
    return e2[0] = t2[0] * n2, e2[1] = t2[1] * n2, e2;
  }
  function m(e2, t2) {
    return [e2[0] / t2, e2[1] / t2];
  }
  function h(e2) {
    return [e2[1], -e2[0]];
  }
  function g(e2, t2) {
    let n2 = t2[0];
    return e2[0] = t2[1], e2[1] = -n2, e2;
  }
  function ee(e2, t2) {
    return e2[0] * t2[0] + e2[1] * t2[1];
  }
  function _(e2, t2) {
    return e2[0] === t2[0] && e2[1] === t2[1];
  }
  function v(e2) {
    return Math.hypot(e2[0], e2[1]);
  }
  function y(e2, t2) {
    let n2 = e2[0] - t2[0], r2 = e2[1] - t2[1];
    return n2 * n2 + r2 * r2;
  }
  function b(e2) {
    return m(e2, v(e2));
  }
  function x(e2, t2) {
    return Math.hypot(e2[1] - t2[1], e2[0] - t2[0]);
  }
  function S(e2, t2, n2) {
    let r2 = Math.sin(n2), i2 = Math.cos(n2), a2 = e2[0] - t2[0], o2 = e2[1] - t2[1], s2 = a2 * i2 - o2 * r2, c2 = a2 * r2 + o2 * i2;
    return [s2 + t2[0], c2 + t2[1]];
  }
  function C(e2, t2, n2, r2) {
    let i2 = Math.sin(r2), a2 = Math.cos(r2), o2 = t2[0] - n2[0], s2 = t2[1] - n2[1], c2 = o2 * a2 - s2 * i2, l2 = o2 * i2 + s2 * a2;
    return e2[0] = c2 + n2[0], e2[1] = l2 + n2[1], e2;
  }
  function w(e2, t2, n2) {
    return c(e2, f(u(t2, e2), n2));
  }
  function te(e2, t2, n2, r2) {
    let i2 = n2[0] - t2[0], a2 = n2[1] - t2[1];
    return e2[0] = t2[0] + i2 * r2, e2[1] = t2[1] + a2 * r2, e2;
  }
  function T(e2, t2, n2) {
    return c(e2, f(t2, n2));
  }
  var E = [0, 0];
  var D = [0, 0];
  var O = [0, 0];
  function k(e2, n2) {
    let r2 = T(e2, b(h(u(e2, c(e2, [1, 1])))), -n2), i2 = [], a2 = 1 / 13;
    for (let n3 = a2; n3 <= 1; n3 += a2) i2.push(S(r2, e2, t * 2 * n3));
    return i2;
  }
  function A(e2, n2, r2) {
    let i2 = [], a2 = 1 / r2;
    for (let r3 = a2; r3 <= 1; r3 += a2) i2.push(S(n2, e2, t * r3));
    return i2;
  }
  function j(e2, t2, n2) {
    let r2 = u(t2, n2), i2 = f(r2, 0.5), a2 = f(r2, 0.51);
    return [u(e2, i2), u(e2, a2), c(e2, a2), c(e2, i2)];
  }
  function M(e2, n2, r2, i2) {
    let a2 = [], o2 = T(e2, n2, r2), s2 = 1 / i2;
    for (let n3 = s2; n3 < 1; n3 += s2) a2.push(S(o2, e2, t * 3 * n3));
    return a2;
  }
  function ne(e2, t2, n2) {
    return [c(e2, f(t2, n2)), c(e2, f(t2, n2 * 0.99)), u(e2, f(t2, n2 * 0.99)), u(e2, f(t2, n2))];
  }
  function N(e2, t2, n2) {
    return e2 === false || e2 === void 0 ? 0 : e2 === true ? Math.max(t2, n2) : e2;
  }
  function re(e2, t2, n2) {
    return e2.slice(0, 10).reduce((e3, r2) => {
      let i2 = r2.pressure;
      return t2 && (i2 = o(e3, r2.distance, n2)), (e3 + i2) / 2;
    }, e2[0].pressure);
  }
  function P(e2, n2 = {}) {
    let { size: r2 = 16, smoothing: a2 = 0.5, thinning: f2 = 0.5, simulatePressure: m2 = true, easing: _2 = (e3) => e3, start: v2 = {}, end: b2 = {}, last: x2 = false } = n2, { cap: S2 = true, easing: w2 = (e3) => e3 * (2 - e3) } = v2, { cap: T2 = true, easing: P2 = (e3) => --e3 * e3 * e3 + 1 } = b2;
    if (e2.length === 0 || r2 <= 0) return [];
    let F2 = e2[e2.length - 1].runningLength, I2 = N(v2.taper, r2, F2), L2 = N(b2.taper, r2, F2), R2 = (r2 * a2) ** 2, z = [], B = [], V = re(e2, m2, r2), H = i(r2, f2, e2[e2.length - 1].pressure, _2), U, W = e2[0].vector, G = e2[0].point, K = G, q = G, J = K, Y = false;
    for (let n3 = 0; n3 < e2.length; n3++) {
      let { pressure: a3 } = e2[n3], { point: s2, vector: h2, distance: v3, runningLength: b3 } = e2[n3], x3 = n3 === e2.length - 1;
      if (!x3 && F2 - b3 < 3) continue;
      f2 ? (m2 && (a3 = o(V, v3, r2)), H = i(r2, f2, a3, _2)) : H = r2 / 2, U === void 0 && (U = H);
      let S3 = b3 < I2 ? w2(b3 / I2) : 1, T3 = F2 - b3 < L2 ? P2((F2 - b3) / L2) : 1;
      H = Math.max(0.01, H * Math.min(S3, T3));
      let k2 = (x3 ? e2[n3] : e2[n3 + 1]).vector, A2 = x3 ? 1 : ee(h2, k2), j2 = ee(h2, W) < 0 && !Y, M2 = A2 !== null && A2 < 0;
      if (j2 || M2) {
        g(E, W), p(E, E, H);
        for (let e3 = 0; e3 <= 1; e3 += 0.07692307692307693) d(D, s2, E), C(D, D, s2, t * e3), q = [D[0], D[1]], z.push(q), l(O, s2, E), C(O, O, s2, t * -e3), J = [O[0], O[1]], B.push(J);
        G = q, K = J, M2 && (Y = true);
        continue;
      }
      if (Y = false, x3) {
        g(E, h2), p(E, E, H), z.push(u(s2, E)), B.push(c(s2, E));
        continue;
      }
      te(E, k2, h2, A2), g(E, E), p(E, E, H), d(D, s2, E), q = [D[0], D[1]], (n3 <= 1 || y(G, q) > R2) && (z.push(q), G = q), l(O, s2, E), J = [O[0], O[1]], (n3 <= 1 || y(K, J) > R2) && (B.push(J), K = J), V = a3, W = h2;
    }
    let X = [e2[0].point[0], e2[0].point[1]], Z = e2.length > 1 ? [e2[e2.length - 1].point[0], e2[e2.length - 1].point[1]] : c(e2[0].point, [1, 1]), Q = [], $ = [];
    if (e2.length === 1) {
      if (!(I2 || L2) || x2) return k(X, U || H);
    } else {
      I2 || L2 && e2.length === 1 || (S2 ? Q.push(...A(X, B[0], 13)) : Q.push(...j(X, z[0], B[0])));
      let t2 = h(s(e2[e2.length - 1].vector));
      L2 || I2 && e2.length === 1 ? $.push(Z) : T2 ? $.push(...M(Z, t2, H, 29)) : $.push(...ne(Z, t2, H));
    }
    return z.concat($, B.reverse(), Q);
  }
  var F = [0, 0];
  function I(e2) {
    return e2 != null && e2 >= 0;
  }
  function L(e2, t2 = {}) {
    let { streamline: i2 = 0.5, size: a2 = 16, last: o2 = false } = t2;
    if (e2.length === 0) return [];
    let s2 = 0.15 + (1 - i2) * 0.85, l2 = Array.isArray(e2[0]) ? e2 : e2.map(({ x: e3, y: t3, pressure: r2 = n }) => [e3, t3, r2]);
    if (l2.length === 2) {
      let e3 = l2[1];
      l2 = l2.slice(0, -1);
      for (let t3 = 1; t3 < 5; t3++) l2.push(w(l2[0], e3, t3 / 4));
    }
    l2.length === 1 && (l2 = [...l2, [...c(l2[0], r), ...l2[0].slice(2)]]);
    let u2 = [{ point: [l2[0][0], l2[0][1]], pressure: I(l2[0][2]) ? l2[0][2] : 0.25, vector: [...r], distance: 0, runningLength: 0 }], f2 = false, p2 = 0, m2 = u2[0], h2 = l2.length - 1;
    for (let e3 = 1; e3 < l2.length; e3++) {
      let t3 = o2 && e3 === h2 ? [l2[e3][0], l2[e3][1]] : w(m2.point, l2[e3], s2);
      if (_(m2.point, t3)) continue;
      let r2 = x(t3, m2.point);
      if (p2 += r2, e3 < h2 && !f2) {
        if (p2 < a2) continue;
        f2 = true;
      }
      d(F, m2.point, t3), m2 = { point: t3, pressure: I(l2[e3][2]) ? l2[e3][2] : n, vector: b(F), distance: r2, runningLength: p2 }, u2.push(m2);
    }
    return u2[0].vector = u2[1]?.vector || [0, 0], u2;
  }
  function R(e2, t2 = {}) {
    return P(L(e2, t2), t2);
  }

  // src/practice.ts
  var key = "adaptive-example:original-sentence:v1";
  var fresh = () => ({ version: 1, typed: "", strokes: [], rows: 6, recalling: false, attempts: 0, reveals: 0 });
  var storageWarning = "";
  function read() {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fresh();
      const value = JSON.parse(raw);
      const finite = (n2) => typeof n2 === "number" && Number.isFinite(n2);
      if (value?.version !== 1 || typeof value.typed !== "string" || typeof value.recalling !== "boolean" || !Number.isInteger(value.rows) || value.rows < 6 || value.rows > 100 || !Number.isInteger(value.attempts) || value.attempts < 0 || !Number.isInteger(value.reveals) || value.reveals < 0 || !Array.isArray(value.strokes) || !value.strokes.every((stroke) => Array.isArray(stroke) && stroke.every((p2) => Array.isArray(p2) && p2.length === 3 && p2.every(finite) && p2[0] >= 0 && p2[0] <= 1 && p2[1] >= 0 && p2[1] <= 6400 && p2[2] >= 0 && p2[2] <= 1))) {
        throw new Error("Invalid saved record");
      }
      return value;
    } catch {
      storageWarning = "\u65E7\u8BB0\u5F55\u65E0\u6CD5\u8BFB\u53D6\uFF0C\u672C\u6B21\u5185\u5BB9\u5C1A\u672A\u4FDD\u5B58\u3002";
      return fresh();
    }
  }
  var state = read();
  var catalog = document.querySelector("#catalog-status");
  if (catalog) {
    catalog.textContent = storageWarning || (state.typed || state.strokes.length ? `\u6709\u8349\u7A3F \xB7 \u56DE\u5FC6\u7EC3\u4E60 ${state.attempts} \u6B21 \xB7 \u67E5\u770B\u539F\u53E5 ${state.reveals} \u6B21` : "\u5C1A\u65E0\u672C\u673A\u8BB0\u5F55");
  }
  var canvas = document.querySelector("#paper");
  if (canvas) setup(canvas);
  function setup(paper) {
    const context = paper.getContext("2d");
    const typed = document.querySelector("#typed");
    const status = document.querySelector("#save-status");
    const recall = document.querySelector("#recall");
    const undo = document.querySelector("#undo");
    const add = document.querySelector("#add");
    const reference = document.querySelector("#reference");
    const typedPanel = document.querySelector("#typed-panel");
    let active = null;
    let pointer = null;
    let maySave = !storageWarning;
    if (!maySave) {
      const recover = document.createElement("button");
      recover.textContent = "\u7528\u672C\u6B21\u7EC3\u4E60\u66FF\u6362\u65E7\u8BB0\u5F55";
      recover.type = "button";
      recover.onclick = () => {
        maySave = true;
        save();
        recover.remove();
      };
      status.after(recover);
    }
    function save() {
      if (!maySave) {
        status.textContent = storageWarning;
        return;
      }
      try {
        localStorage.setItem(key, JSON.stringify(state));
        status.textContent = "\u5DF2\u4FDD\u5B58\u5728\u5F53\u524D\u6D4F\u89C8\u5668";
      } catch {
        status.textContent = "\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u4FDD\u7559\u6B64\u9875\u3002\u5F53\u524D\u8F93\u5165\u4ECD\u5728\u9875\u9762\u4E2D\u3002";
      }
    }
    function render() {
      const width = paper.clientWidth;
      const height = state.rows * 64;
      const dpr = window.devicePixelRatio || 1;
      paper.style.height = `${height}px`;
      paper.width = Math.round(width * dpr);
      paper.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = "#202024";
      for (const stroke of [...state.strokes, ...active ? [active] : []]) {
        const outline = R(stroke.map(([x2, y2, pressure]) => [x2 * width, y2, pressure]), {
          size: 3,
          thinning: 0.25,
          smoothing: 0.6,
          streamline: 0.45,
          simulatePressure: false,
          last: stroke !== active
        });
        if (!outline.length) continue;
        context.beginPath();
        context.moveTo(outline[0][0], outline[0][1]);
        for (const [x2, y2] of outline.slice(1)) context.lineTo(x2, y2);
        context.closePath();
        context.fill();
      }
      undo.disabled = state.strokes.length === 0;
      add.disabled = state.rows >= 100;
    }
    function phase() {
      reference.hidden = state.recalling;
      typedPanel.hidden = state.recalling;
      document.querySelector(".workspace").classList.toggle("recalling", state.recalling);
      recall.textContent = state.recalling ? "\u67E5\u770B\u539F\u53E5" : "\u5408\u4E0A\u539F\u53E5";
      recall.setAttribute("aria-pressed", String(state.recalling));
      document.querySelector("#phase").textContent = state.recalling ? "\u51ED\u8BB0\u5FC6\u5199\u51FA\u521A\u624D\u7684\u53E5\u5B50" : "\u9605\u8BFB\u6216\u5BF9\u7167\u539F\u53E5";
      render();
    }
    typed.value = state.typed;
    status.textContent = storageWarning || "\u8BB0\u5F55\u4FDD\u5B58\u5728\u5F53\u524D\u6D4F\u89C8\u5668";
    typed.oninput = () => {
      state.typed = typed.value;
      typed.style.height = "auto";
      typed.style.height = `${typed.scrollHeight}px`;
      save();
    };
    recall.onclick = () => {
      state.recalling = !state.recalling;
      if (state.recalling) state.attempts += 1;
      else state.reveals += 1;
      phase();
      save();
    };
    undo.onclick = () => {
      state.strokes.pop();
      render();
      save();
    };
    add.onclick = () => {
      state.rows = Math.min(100, state.rows + 2);
      render();
      save();
    };
    function append(event) {
      if (!active) return;
      const rect = paper.getBoundingClientRect();
      const x2 = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y2 = Math.max(0, Math.min(state.rows * 64, event.clientY - rect.top));
      const pressure = event.pointerType === "pen" ? Math.max(0.05, event.pressure) : 0.5;
      active.push([x2, y2, pressure]);
    }
    paper.onpointerdown = (event) => {
      if (pointer !== null || event.button !== 0 || event.pointerType === "touch") return;
      event.preventDefault();
      pointer = event.pointerId;
      active = [];
      paper.setPointerCapture(pointer);
      append(event);
      render();
    };
    paper.onpointermove = (event) => {
      if (event.pointerId !== pointer) return;
      const samples = event.getCoalescedEvents?.() || [];
      for (const sample of samples.length ? samples : [event]) append(sample);
      render();
    };
    function finish(event) {
      if (event.pointerId !== pointer || !active) return;
      state.strokes.push(active);
      active = null;
      pointer = null;
      render();
      save();
    }
    paper.onpointerup = finish;
    paper.onpointercancel = finish;
    paper.onlostpointercapture = finish;
    new ResizeObserver(render).observe(paper);
    phase();
  }
})();
