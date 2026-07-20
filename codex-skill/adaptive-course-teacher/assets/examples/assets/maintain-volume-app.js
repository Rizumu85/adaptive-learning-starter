(function () {
  const panel = document.querySelector("#panel-body");
  const back = document.querySelector("#back");
  const next = document.querySelector("#next");
  const progressNumber = document.querySelector("#progress-number");
  const progressFill = document.querySelector("#progress-fill");
  const stageStatus = document.querySelector("#stage-status");
  const axisLegend = document.querySelector("#axis-legend");
  const compareLabels = document.querySelector("#compare-labels");
  const scene = window.createMaintainVolumeScene(document.querySelector("#scene"));

  let step = 0;
  let freeAxis = "y";
  let mode = "strict";
  let operation = "y";
  let amount = 1;

  const axisName = { x: "X", y: "Y", z: "Z" };
  const modeName = { strict: "Strict", uniform: "Uniform", single: "Single Axis" };

  function values() {
    return window.calculateMaintainVolumeScale({ step, freeAxis, mode, operation, amount });
  }

  function volume(value) {
    return value.x * value.y * value.z;
  }

  function scaleReadout(value) {
    return `X ${value.x.toFixed(2)} × Y ${value.y.toFixed(2)} × Z ${value.z.toFixed(2)}`;
  }

  function slider() {
    return `<div class="range-head"><label for="amount">${operation === "uniform" ? "整体缩放 S" : `${axisName[operation]} 轴缩放`}</label><span class="range-actions"><span class="range-value">${amount.toFixed(1)}</span><button class="range-reset" type="button" ${amount === 1 ? "disabled" : ""}>重置为 1</button></span></div>
      <input id="amount" type="range" min="0.5" max="2" step="0.1" value="${amount}">`;
  }

  function axisControl() {
    return `<div class="segmented axes" data-index="${["x", "y", "z"].indexOf(freeAxis)}">
      <span class="segment-capsule" aria-hidden="true"></span>
      ${["x", "y", "z"].map((axis) => `<button class="segment" type="button" data-axis="${axis}" aria-pressed="${freeAxis === axis}"><strong>${axis.toUpperCase()}</strong></button>`).join("")}
    </div>`;
  }

  function modeControl() {
    const modes = [["strict", "Strict"], ["uniform", "Uniform"], ["single", "Single Axis"]];
    return `<div class="segmented modes" data-index="${modes.findIndex(([key]) => key === mode)}">
      <span class="segment-capsule" aria-hidden="true"></span>
      ${modes.map(([key, label]) => `<button class="segment" type="button" data-mode="${key}" aria-pressed="${mode === key}"><strong>${label}</strong></button>`).join("")}
    </div>`;
  }

  function operationControl() {
    const operations = [["x", "只缩放 X"], ["y", "只缩放 Y"], ["z", "只缩放 Z"], ["uniform", "整体缩放 S"]];
    return `<div class="operation-list">${operations.map(([key, label]) => `<button class="operation ${operation === key ? "active" : ""}" type="button" data-operation="${key}">${label}</button>`).join("")}</div>`;
  }

  function resultFeedback(value, prefix) {
    const v = volume(value);
    const kept = Math.abs(v - 1) < .02;
    return `<div class="metric"><span>${scaleReadout(value)}</span><b>体积 ${v.toFixed(2)}</b></div>
      <div class="feedback ${kept ? "" : "warning"}"><span class="dot"></span><span>${prefix || (kept ? "体积保持为 1.00。未直接操作的轴承担了补偿。" : "这次操作没有触发补偿。物体体积已经改变。")}</span></div>`;
  }

  function comparisonValues() {
    return Object.fromEntries(["strict", "uniform", "single"].map((modeKey) => [
      modeKey,
      window.calculateMaintainVolumeScale({ step: 2, freeAxis: "y", mode: modeKey, operation, amount })
    ]));
  }

  function updateComparisonLabels(result) {
    Object.entries(result).forEach(([modeKey, value]) => {
      document.querySelector(`#volume-${modeKey}`).textContent = `体积 ${volume(value).toFixed(2)}`;
      document.querySelector(`#mode-${modeKey}`).classList.toggle("preserved", Math.abs(volume(value) - 1) < .02);
      document.querySelector(`#axes-${modeKey}`).innerHTML = axisAction(modeKey);
    });
  }

  function axisToken(axis) {
    return `<i class="axis-token axis-${axis}">${axis.toUpperCase()}</i>`;
  }

  function axisAction(modeKey) {
    if (amount === 1) return "默认 1.0 · 无变化";
    const input = operation === "uniform"
      ? `${axisToken("x")}${axisToken("y")}${axisToken("z")}`
      : axisToken(operation);
    let compensated = [];
    if (operation === "y") compensated = ["x", "z"];
    if (operation === "uniform" && modeKey !== "single") compensated = ["x", "z"];
    if (operation === "x" && modeKey === "strict") compensated = ["z"];
    if (operation === "z" && modeKey === "strict") compensated = ["x"];
    const result = compensated.length
      ? `补偿 ${compensated.map(axisToken).join("")}`
      : "不补偿";
    return `输入 ${input}<em>→</em>${result}`;
  }

  function comparisonFeedback(result) {
    const preserved = Object.entries(result)
      .filter(([, value]) => Math.abs(volume(value) - 1) < .02)
      .map(([modeKey]) => modeName[modeKey]);
    const operationName = operation === "uniform" ? "整体缩放 S" : `只缩放 ${axisName[operation]}`;
    return `${operationName}：${preserved.join(" 与 ")} 保持体积，其余模式不补偿。`;
  }

  function bindSlider() {
    const input = panel.querySelector("#amount");
    const reset = panel.querySelector(".range-reset");
    input.addEventListener("input", () => {
      amount = Number(input.value);
      panel.querySelector(".range-value").textContent = amount.toFixed(1);
      reset.disabled = amount === 1;
      const value = scene.update({ step, freeAxis, mode, operation, amount });
      if (step === 2) {
        const result = comparisonValues();
        updateComparisonLabels(result);
        panel.querySelector(".feedback span:last-child").textContent = comparisonFeedback(result);
        return;
      }
      panel.querySelector(".metric").outerHTML = `<div class="metric"><span>${scaleReadout(value)}</span><b>体积 ${volume(value).toFixed(2)}</b></div>`;
      const feedback = panel.querySelector(".feedback");
      const kept = Math.abs(volume(value) - 1) < .02;
      feedback.classList.toggle("warning", !kept);
      feedback.querySelector("span:last-child").textContent = currentFeedback(value);
    });
    reset.addEventListener("click", () => {
      amount = 1;
      render();
    });
  }

  function renderOne() {
    freeAxis = "y";
    operation = "y";
    mode = "strict";
    const value = scene.update({ step, freeAxis, mode, operation, amount });
    panel.innerHTML = `<p class="eyebrow">练习 1 · 先看结果</p>
      <h2>拉长一边，另外两边收窄</h2>
      <p class="step-copy">这一页把 Free Axis 固定为 Y。先拖动 Y 缩放，只观察 X 和 Z。</p>
      <div class="rule"></div>${slider()}
      ${resultFeedback(value, currentFeedback(value))}`;
    bindSlider();
  }

  function renderTwo() {
    operation = freeAxis;
    const value = scene.update({ step, freeAxis, mode: "strict", operation, amount });
    panel.innerHTML = `<p class="eyebrow">练习 2 · 换一根 Free Axis</p>
      <h2>把刚才的 Y 换成 X 或 Z</h2>
      <p class="step-copy">练习 1 使用的就是 Free Axis Y。现在切换轴，观察同一套补偿规则。</p>
      <div class="rule"></div>
      <p class="control-label">选择 Free Axis</p>${axisControl()}
      <div class="control-gap"></div>${slider()}
      ${resultFeedback(value, currentFeedback(value))}`;
    panel.querySelectorAll("[data-axis]").forEach((button) => button.addEventListener("click", () => {
      freeAxis = button.dataset.axis;
      operation = freeAxis;
      render();
    }));
    bindSlider();
  }

  function modeFeedback(value) {
    const v = volume(value);
    const result = Math.abs(v - 1) < .02
      ? `${modeName[mode]} 触发了补偿。`
      : `${modeName[mode]} 没有触发补偿，体积变成 ${v.toFixed(2)}。`;
    const comparison = operation === "x"
      ? "只缩放 X 时，只有 Strict 会响应。"
      : "整体缩放 S 时，Strict 与 Uniform 会响应。";
    return `${result}${comparison}`;
  }

  function currentFeedback(value) {
    if (step === 2) return modeFeedback(value);
    if (amount === 1) return "当前是默认缩放 1.0。拖动滑杆，再观察三根轴的变化。";
    const direction = amount > 1 ? "拉长" : "压缩";
    const compensation = amount > 1 ? "收窄" : "变宽";
    if (step === 0) return `Y 被${direction}，X 与 Z 同时${compensation}。外形改变，体积仍接近 1.00。`;
    return `${axisName[freeAxis]} 是主要${direction}方向。另两根轴同时${compensation}。`;
  }

  function renderThree() {
    freeAxis = "y";
    scene.update({ step, freeAxis, mode, operation, amount });
    const result = comparisonValues();
    updateComparisonLabels(result);
    panel.innerHTML = `<p class="eyebrow">练习 3 · 同时比较</p>
      <h2>三个球使用同一次缩放</h2>
      <p class="step-copy">Free Axis 固定为 Y。三个球分别使用 Strict、Uniform 和 Single Axis。</p>
      <div class="rule"></div>
      <div class="trigger-key"><span><b>补偿</b>　自动修改其他轴，把体积拉回 1.00</span><span><b>Mode</b>　决定哪些缩放操作会开始补偿，不是补偿力度</span></div>
      ${operationControl()}
      <div class="control-gap"></div>${slider()}
      <div class="feedback"><span class="dot"></span><span>${comparisonFeedback(result)}</span></div>`;
    panel.querySelectorAll("[data-operation]").forEach((button) => button.addEventListener("click", () => {
      operation = button.dataset.operation;
      render();
    }));
    bindSlider();
  }

  function renderFour() {
    amount = 1;
    freeAxis = "y";
    operation = "y";
    mode = "strict";
    scene.update({ step, freeAxis, mode, operation, amount });
    panel.innerHTML = `<p class="eyebrow">练习 4 · 实际选择</p>
      <h2>先用 Strict，再按需要收窄</h2>
      <p class="step-copy">Mode 决定哪些缩放操作可以触发体积补偿。</p>
      <div class="rule"></div>
      <div class="mode-table" role="table" aria-label="Maintain Volume 模式比较">
        <div class="mode-row head" role="row"><span>Mode</span><span>会响应</span></div>
        <div class="mode-row recommended" role="row"><b>Strict</b><span>Free Axis、其他单轴、整体 S</span></div>
        <div class="mode-row" role="row"><b>Uniform</b><span>Free Axis、整体 S</span></div>
        <div class="mode-row" role="row"><b>Single Axis</b><span>只响应 Free Axis</span></div>
      </div>
      <div class="feedback"><span class="dot"></span><span>不确定时保留 Strict。只想让指定轴驱动补偿，再换成 Uniform 或 Single Axis。</span></div>
      <div class="recall"><b>功能意义</b><span>拉长时自动收窄，压短时自动变粗。角色部位不会因为缩放而凭空增加或减少体量。</span><b>一句话记忆</b><span>Free Axis 管主要形变；Mode 管什么操作会开始补偿。</span></div>`;
  }

  function render() {
    progressNumber.textContent = `${step + 1} / 4`;
    progressFill.style.width = `${(step + 1) * 25}%`;
    back.disabled = step === 0;
    next.textContent = ["下一步：Free Axis", "下一步：比较 Mode", "下一步：怎么选", "回到第一步"][step];
    stageStatus.textContent = ["拉长 Y，观察 X 与 Z", "Free Axis 决定主要变化方向", "Mode 决定补偿的触发范围", "先认 Free Axis，再选 Mode"][step];
    compareLabels.hidden = step !== 2;
    axisLegend.hidden = step === 2;
    if (step === 0) renderOne();
    if (step === 1) renderTwo();
    if (step === 2) renderThree();
    if (step === 3) renderFour();
  }

  function prepareModeComparison() {
    freeAxis = "y";
    operation = "x";
    mode = "strict";
    amount = 1.6;
  }

  back.addEventListener("click", () => {
    if (step === 3) prepareModeComparison();
    step = Math.max(0, step - 1);
    render();
  });
  next.addEventListener("click", () => {
    if (step === 1) prepareModeComparison();
    step = step === 3 ? 0 : step + 1;
    if (step === 0) amount = 1;
    render();
  });
  render();
})();
