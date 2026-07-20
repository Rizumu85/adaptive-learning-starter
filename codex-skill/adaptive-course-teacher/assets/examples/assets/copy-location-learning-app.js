(function () {
  const h = React.createElement;
  const { useEffect, useRef, useState } = React;

  const steps = [
    {
      eyebrow: "练习 1 · 跟随",
      title: "位置跟随",
      copy: "Owner 使用 Target 的位置。",
      stage: "Target 去哪，Owner 就去哪",
      next: "下一步：Offset",
      accent: "#147d8f",
      tone: "teal"
    },
    {
      eyebrow: "练习 2 · Offset",
      title: "保留相对距离",
      copy: "关闭时贴到 Target。开启时保留原来的距离。",
      stage: "观察两者之间的距离",
      next: "下一步：Space",
      accent: "#147d8f",
      tone: "yellow"
    },
    {
      eyebrow: "练习 3 · Space",
      title: "坐标空间怎么换算",
      copy: "Space 不是移动功能。它规定从哪套坐标系读取位置，再用哪套坐标系交给 Owner。",
      stage: "同一个位置数字，换一套坐标轴解释",
      next: "下一步：Connected",
      accent: "#147d8f",
      tone: "teal"
    },
    {
      eyebrow: "练习 4 · Connected",
      title: "Connected 会挡住位移",
      copy: "Connected 是骨骼的连接关系，不是 Copy Location 参数。它把 Owner 头部焊在父骨骼尾部，Owner 不能整体平移。",
      stage: "约束想移动，骨骼连接不允许",
      next: "查看四句总结",
      accent: "#147d8f",
      tone: "rose"
    }
  ];

  function GlassPanel(props) {
    return h("section", { className: `glass rounded-[8px] ${props.className || ""}` }, props.children);
  }

  function Button(props) {
    const muted = props.muted ? "text-caption" : "text-ink-soft";
    return h(
      "button",
      {
        type: "button",
        disabled: props.disabled,
        onClick: props.onClick,
        className: `inline-flex min-h-[38px] items-center justify-center gap-[5px] rounded-[8px] border border-surface-line bg-white px-[13px] py-[7px] text-[14px] font-normal ${muted} shadow-[0_1px_2px_rgba(0,0,0,.02)] transition duration-200 ease-out hover:-translate-y-px hover:border-[#d4d4d8] hover:shadow-[0_3px_8px_rgba(0,0,0,.04)] active:scale-[.97] disabled:pointer-events-none disabled:opacity-40 ${props.className || ""}`
      },
      props.accent ? h("span", { className: "h-[5px] w-[5px] rounded-full", style: { backgroundColor: props.accentColor || "#147d8f" }, "aria-hidden": "true" }) : null,
      props.children
    );
  }

  function Segmented(props) {
    const selectedIndex = props.options.findIndex((option) => option.value === props.value);
    return h(
      "div",
      { className: "relative grid grid-cols-2 rounded-[8px] bg-surface-muted p-1" },
      h("span", {
        className: "pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-[6px] border border-white/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,.04)] transition-transform duration-300 [transition-timing-function:cubic-bezier(.2,.8,.2,1)]",
        style: {
          transform: `translateX(${selectedIndex * 100}%)`,
          borderColor: props.accent || "rgba(255,255,255,.8)",
          boxShadow: `0 2px 8px rgba(0,0,0,.04), 0 0 0 1px ${props.accent || "transparent"}22`
        }
      }),
      props.options.map((option) => h(
        "button",
        {
          type: "button",
          key: option.value,
          onClick: () => props.onChange(option.value),
          className: `relative z-10 px-2 py-[8px] text-center text-[16px] font-normal transition-colors duration-200 ${props.value === option.value ? "text-ink-soft" : "text-caption"}`,
          "aria-pressed": props.value === option.value
        },
        h("span", { className: "block" }, option.label),
        option.hint ? h("span", { className: "mt-px block text-[12px] opacity-75" }, option.hint) : null
      ))
    );
  }

  function Feedback(props) {
    const tones = {
      orange: "border-[#f2b84b]/40 bg-[#fff8e8]",
      yellow: "border-[#f2b84b]/40 bg-[#fff8e8]",
      teal: "border-[#147d8f]/25 bg-[#eef5f6]",
      mint: "border-[#6a7f2f]/30 bg-[#f1f6e6]",
      rose: "border-[#c44f37]/25 bg-[#fff0ec]"
    };
    return h(
      "div",
      { className: `mt-4 flex gap-2 rounded-[8px] border px-3 py-3 text-[14px] leading-[1.55] text-ink-soft ${tones[props.tone] || tones.teal}` },
      h("span", { className: `mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full ${props.color || "bg-teal"}`, "aria-hidden": "true" }),
      h("span", null, props.children)
    );
  }

  function Task(props) {
    if (props.step === 0) {
      return h(
        React.Fragment,
        null,
        h("div", { className: "mb-2 flex items-center justify-between" },
          h("label", { htmlFor: "target-move", className: "text-[14px] text-ink-soft" }, "Target 的位置"),
          h("span", { className: "tabular-nums text-[14px]", style: { color: props.accent } }, props.move.toFixed(1))
        ),
        h("input", {
          id: "target-move",
          className: "range-input",
          type: "range",
          min: -2.1,
          max: 1.2,
          step: 0.1,
          value: props.move,
          style: { "--range-color": props.accent },
          onChange: (event) => props.setMove(Number(event.target.value))
        }),
        h(Feedback, { tone: props.tone, color: "bg-teal" }, "Owner 骨骼跟随金色 Target。透明骨骼标记 Owner 原位置。")
      );
    }

    if (props.step === 1) {
      return h(
        React.Fragment,
        null,
        h(Segmented, {
          accent: props.accent,
          value: props.offset ? "on" : "off",
          onChange: (value) => props.setOffset(value === "on"),
          options: [
            { value: "off", label: "关闭", hint: "贴到 Target" },
            { value: "on", label: "Offset", hint: "保留距离" }
          ]
        }),
        h(Feedback, { tone: props.tone, color: "bg-[#f2b84b]" }, props.offset ? "金色连线保留原来的距离。" : "Owner 贴到 Target。")
      );
    }

    if (props.step === 2) {
      return h(
        React.Fragment,
        null,
        h("div", { className: "mb-4 grid gap-2 text-[12px]" },
          h("div", { className: "grid grid-cols-[122px_1fr] items-center gap-2 rounded-[8px] bg-surface-muted px-3 py-2" },
            h("span", { className: "whitespace-nowrap text-caption" }, "Target Space · 读取"),
            h("span", { className: "text-[13px] text-ink" }, "Target 自身 Y = +1")
          ),
          h("div", { className: "flex items-center justify-center gap-2 text-caption" },
            h("span", { "aria-hidden": "true" }, "↓"),
            h("span", null, "坐标值交给 Owner")
          ),
          h("div", { className: "grid grid-cols-[122px_1fr] items-center gap-2 rounded-[8px] bg-surface-muted px-3 py-2" },
            h("span", { className: "whitespace-nowrap text-caption" }, "Owner Space · 接收"),
            h("span", { className: "text-[13px] text-ink" }, props.ownerSpace === "local" ? "按 Owner 自身轴" : "按场景固定轴")
          )
        ),
        h(Segmented, {
          accent: props.accent,
          value: props.ownerSpace,
          onChange: props.setOwnerSpace,
          options: [
            { value: "world", label: "World", hint: "场景固定轴" },
            { value: "local", label: "Local", hint: "Owner 自身轴" }
          ]
        }),
        h(Feedback, { tone: props.ownerSpace === "local" ? "teal" : "mint", color: props.ownerSpace === "local" ? "bg-teal" : "bg-[#6a7f2f]" },
          props.ownerSpace === "local" ? "Y = +1 在 Owner 自身坐标系中解释，位置落在斜向 Local Y 上。" : "Y = +1 在场景坐标系中解释，位置落在固定的 World Y 上。"
        )
      );
    }

    return h(
      React.Fragment,
      null,
      h("div", { className: "mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center text-[12px]" },
        h("div", { className: "rounded-[8px] bg-surface-muted px-2 py-2 text-ink" }, "Parent Tail"),
        h("span", { className: props.connected ? "text-[#c44f37]" : "text-caption" }, props.connected ? "焊在同一点" : "可以分开"),
        h("div", { className: "rounded-[8px] bg-surface-muted px-2 py-2 text-ink" }, "Owner Head")
      ),
      h(Segmented, {
        accent: props.accent,
        value: props.connected ? "on" : "off",
        onChange: (value) => props.setConnected(value === "on"),
        options: [
          { value: "off", label: "未连接", hint: "Owner 可整体移动" },
          { value: "on", label: "Connected", hint: "Head 焊在 Parent Tail" }
        ]
      }),
      h(Feedback, { tone: props.tone, color: "bg-rose" }, props.connected ? "Copy Location 想把 Owner 放到红色虚影处。红圈焊点让实际 Owner 留在 Parent Tail。" : "焊点解除，Owner 可以整体移动到 Target。")
    );
  }

  function Summary() {
    const rows = [
      ["读", "Target Space", "从哪套坐标系取得数字", "bg-orange"],
      ["写", "Owner Space", "用哪套坐标系接收位置", "bg-teal"],
      ["加", "Offset", "保留原来的相对距离", "bg-[#f2b84b]"],
      ["焊", "Connected", "头部位置由父骨骼控制", "bg-rose"]
    ];
    return h(
      GlassPanel,
      { className: "enter-soft mx-auto mt-5 w-full max-w-[720px] p-6" },
      h("p", { className: "section-serif mb-2" }, "四句总结"),
      h("h2", { className: "title-serif mb-4" }, "读、写、加、焊"),
      h("div", { className: "grid gap-1 sm:grid-cols-2" },
        rows.map((row) => h("div", { key: row[0], className: "flex items-start gap-3 rounded-[6px] px-3 py-3 hover:bg-white/50" },
          h("span", { className: `mt-[8px] h-[5px] w-[5px] shrink-0 rounded-full ${row[3]}` }),
          h("div", null,
          h("div", { className: "text-[16px] text-ink" }, `${row[0]} · ${row[1]}`),
            h("div", { className: "mt-1 text-[14px] text-ink-muted" }, row[2])
          )
        ))
      )
    );
  }

  function App() {
    const [step, setStep] = useState(0);
    const [move, setMove] = useState(-0.8);
    const [offset, setOffset] = useState(true);
    const [ownerSpace, setOwnerSpace] = useState("local");
    const [connected, setConnected] = useState(true);
    const [summary, setSummary] = useState(false);
    const canvasRef = useRef(null);
    const sceneRef = useRef(null);

    useEffect(() => {
      sceneRef.current = window.createPaperCourseCopyLocationScene(canvasRef.current);
      return () => sceneRef.current && sceneRef.current.destroy();
    }, []);

    useEffect(() => {
      if (sceneRef.current) sceneRef.current.update({ step, move, offset, ownerSpace, connected });
    }, [step, move, offset, ownerSpace, connected]);

    const current = steps[step];
    const goNext = () => {
      if (step < 3) {
        setStep(step + 1);
        setSummary(false);
      } else {
        setSummary(true);
        window.setTimeout(() => document.querySelector("#summary")?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
      }
    };

    return h(
      "main",
      { className: "mx-auto w-full max-w-[1152px] px-4 py-6 sm:py-8", style: { "--step-color": current.accent } },
      h("header", { className: "lesson-header enter-soft mb-6 flex w-full flex-wrap items-end justify-between gap-5" },
        h("div", { className: "min-w-0" },
          h("p", { className: "lesson-kicker" }, "02 14 · BLENDER RIGGING / COPY LOCATION"),
          h("h1", { className: "lesson-title" }, "Copy Location：位置传递实验"),
          h("p", { className: "lesson-lede" }, "骨骼 Copy Location 约束的参数属性与空间关系说明。")
        ),
        h("div", { className: "w-full min-w-[190px] max-w-[260px] sm:w-[260px]" },
          h("div", { className: "mb-2 flex items-center justify-between text-[13px] text-caption" },
            h("span", null, `${step + 1} / 4`),
            h("span", null, "读 · 写 · 加 · 焊")
          ),
          h("div", { className: "h-[3px] overflow-hidden rounded-full bg-surface-line" },
            h("div", { className: "h-full rounded-full transition-[width,background-color] duration-300", style: { width: `${(step + 1) * 25}%`, backgroundColor: current.accent } })
          )
        )
      ),

      h("div", { className: "grid items-stretch gap-[18px] lg:grid-cols-[minmax(0,1fr)_330px]" },
        h("section", { className: "scene-shell enter-soft" },
          h("canvas", { id: "scene", ref: canvasRef, "aria-label": "Copy Location 三维演示" }),
          h("div", { className: "pointer-events-none absolute left-4 top-4 z-[2] flex items-center gap-2 rounded-[8px] border border-white/80 bg-white/70 px-3 py-2 text-[13px] text-ink-soft shadow-[0_4px_16px_rgba(24,24,27,.05)] backdrop-blur-xl" },
            h("span", { className: "h-[5px] w-[5px] rounded-full", style: { backgroundColor: current.accent } }),
            h("span", null, current.stage)
          ),
          step === 2 ? h("div", { className: "pointer-events-none absolute bottom-4 left-4 z-[2] rounded-[8px] border border-white/80 bg-white/70 px-3 py-2 text-[12px] leading-6 text-ink-muted shadow-[0_4px_16px_rgba(24,24,27,.05)] backdrop-blur-xl" },
            h("div", { className: "flex items-center gap-2" }, h("span", { className: "h-[5px] w-[5px] rounded-full bg-[#6a7f2f]" }), "场景固定的 World Y"),
            h("div", { className: "flex items-center gap-2" }, h("span", { className: "h-[5px] w-[5px] rounded-full bg-[#147d8f]" }), "Owner 自身的 Local Y")
          ) : null
        ),

        h(GlassPanel, { className: "coach-panel enter-soft flex w-full flex-col lg:w-[330px]" },
          h("div", { className: "flex-1 px-7 pb-5 pt-7" },
            h("p", { className: "section-serif mb-2" }, current.eyebrow),
            h("h2", { className: "title-serif mb-3" }, current.title),
            h("p", { className: "w-full text-[16px] leading-[1.55] text-ink-soft" }, current.copy),
            h("div", { className: "mx-2 my-5 h-px bg-surface-line/60" }),
            h(Task, { step, move, setMove, offset, setOffset, ownerSpace, setOwnerSpace, connected, setConnected, accent: current.accent, tone: current.tone })
          ),
          h("div", { className: "shrink-0 border-t border-surface-line/60 bg-white/35 px-7 py-5 backdrop-blur-xl" },
            h("div", { className: "flex items-center gap-2" },
            h(Button, { muted: true, disabled: step === 0, onClick: () => { setStep(Math.max(0, step - 1)); setSummary(false); } }, "返回"),
            h(Button, { accent: true, accentColor: current.accent, onClick: goNext, className: "ml-auto" }, current.next)
            )
          )
        )
      ),

      h("div", { id: "summary" }, summary ? h(Summary) : null)
    );
  }

  ReactDOM.createRoot(document.querySelector("#root")).render(h(App));
})();
