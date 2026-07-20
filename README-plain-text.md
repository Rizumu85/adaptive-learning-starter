# Adaptive Learning Starter

给 Codex 一套可逐步调教的课程学习方法。它不替你堆摘要，而是先找出真正需要理解的部分，再为每个难点选择合适的表达方式。

适合视频课程、网页课件、PDF 与其他连续学习资料。不限学科，也不绑定 Blender、Heptabase 或某个课程平台。

## 你会得到什么

- 观看前地图：开始前只标出要留意的概念、结果和可略看的部分。
- 课后重点重建：假设你轻松看过一遍，重新讲清遗漏、绕口和需要真正理解的内容。
- 可复用笔记：区分长期知识、操作流程、经验参数与无需反复记录的细节。
- 合适的视觉媒介：界面位置用静图，短操作用 Animated WebP，空间关系或状态变化用交互 HTML。
- 持续适配：记录你的基础、困惑、已知内容与偏好，后续课程不再从零猜测。

## 学习循环

1. 看前：只带着少量问题进入课程。
2. 看后：重建必须理解的概念、老师的经验和可复用操作。
3. 选择：你决定哪些值得保存，AI 推荐笔记、静图、Animated WebP 或交互 HTML。
4. 迭代：把“已经会了”和“仍然卡住”写回学习记录，下一节课随之调整。

## 最快开始

1. 在 GitHub 选择 Code → Download ZIP。
2. 把下载的 ZIP 拖进 Codex。
3. 发送下面这段话：

```text
请读取压缩包中的 README.md 和 adaptive-learning的安装与使用说明.md，
帮我安装 adaptive-course-teacher skill，并创建一个新的学习项目。

如果目标位置已有同名 skill，不要覆盖，先告诉我差异。
安装完成后告诉我 skill 路径和学习项目路径。
```

安装完成后，新建一个 Codex 任务并打开学习项目。第一次使用时发送：

```text
请使用 $adaptive-course-teacher。

先读取 AGENTS.md、ONBOARDING.md、MISSION.md、NOTES.md 和 DESIGN.md。
不要立刻制作笔记或课件。先分批了解我的目标、基础、学习阻力、
笔记习惯和可用工具，然后更新 MISSION.md 与 NOTES.md。
```

更完整的安装、首次调教和日常用法见 `adaptive-learning的安装与使用说明.md`。

## 它如何判断媒介

- 找不到界面位置：优先使用静态截图，例如按钮、菜单与设置入口。
- 操作顺序容易忘：优先使用 Animated WebP，例如短步骤、状态切换与重复动作。
- 空间关系难以想象：优先使用交互 HTML 或 3D，例如坐标、旋转、层级与约束关系。
- 需要以后查询：优先使用 Markdown 笔记，例如原则、流程、参数与对照表。
- 只需这次听懂：保留为对话解释，不制造无用笔记。

不是每个难点都需要做成交互课件。最轻的媒介能讲清楚时，就停在那里。

## 仓库内容

```text
adaptive-learning-starter/
├── codex-skill/adaptive-course-teacher/   # 可安装的 Codex skill
│   ├── references/                        # 教学与媒体制作流程
│   └── assets/examples/                   # 三类 HTML 课件样本
├── project-template/                      # 新学习项目模板
└── adaptive-learning的安装与使用说明.md     # 可直接转发的完整说明
```

HTML 样本包括长文阅读型、分步骤交互型和多状态对比型。它们是设计起点，不是每门课都必须套用的固定模板。

## 手动安装

把 `codex-skill\adaptive-course-teacher` 复制到 `%USERPROFILE%\.agents\skills\adaptive-course-teacher`。

重新打开 Codex，再把 `project-template` 的内容复制到学习项目根目录。

## 隐私与课程授权

仓库不包含付费课程视频、PDF、登录信息、个人笔记或平台卡片 ID。学习者需要自行提供有权使用的课程来源，并明确授权 AI 访问登录后的页面或评论区。

