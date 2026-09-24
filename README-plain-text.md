# Adaptive Learning Starter

## 学一本书时

“帮我学这本书”默认只启动一个短小节：核对原页、给阅读地图、等你阅读反馈，不自动加工全书或批量做 HTML。参考旧项目是了解偏好，不是复制其课件数量或推定你的新学科水平。建仓与教学产物分别确定范围；明确要求的全书目录等批量任务仍可一次完成。

可以直接说：“参考我的旧项目了解学习偏好，帮我读这本书。先确认阅读位置，给一个小节的阅读地图，等我反馈后继续；有具体难点再选择笔记或课件。”

给 Codex 一套可逐步调教的课程学习方法。它不替你堆摘要，而是先找出真正需要理解的部分，再为每个难点选择合适的表达方式。

适合视频课程、网页课件、PDF 与其他连续学习资料。不限学科，也不绑定 Blender、Heptabase 或某个课程平台。

## 你会得到什么

- 观看前地图：开始前只标出要留意的概念、结果和可略看的部分。
- 课后重点重建：假设你轻松看过一遍，重新讲清遗漏、绕口和需要真正理解的内容。
- 可复用笔记：区分长期知识、操作流程、经验参数与无需反复记录的细节。
- 合适的视觉媒介：界面位置用静图，短操作用 Animated WebP，空间关系或状态变化用交互 HTML。
- 持续适配：记录你的基础、困惑、已知内容与偏好，后续课程不再从零猜测。
- 可验证的课件：把教学和测验分开，保留学习进度，检查本地直开、手机、数位笔、朗读与旧记录等真实使用条件。

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

## 从真实课件沉淀的制作规范

- 先教学，再独立作答：演示和提示在练习前出现；需要检验回忆时隐藏答案。识别、跟做、独立完成、正确性和呈现质量分别记录。
- 文案先删后改：先决定哪些文字删除、保留或缩短，再重写留下的内容。教材或课程原文保持锁定，聊天过程和 AI 自我说明不进入课件。
- 文案由当前 Agent 完成：先删无意义、重复和聊天残留，再参考教材的教学语气改写，最后通读实际页面。不需要另一个 AI、额外账号或付费服务；文案修改不会顺带重做 UI 或算法。
- 素材保留来源与授权边界：付费、登录后或个人授权的文件只放本地忽略目录；裁切和透明抠图保留原始像素，不用相似素材冒充原件。
- 交互课件本地优先：可编辑代码使用 TypeScript，本地打包浏览器需要的 JavaScript；需要双击学习时不依赖 CDN 或开发服务器。
- 按真实设备验收：除桌面和手机布局外，还检查进度恢复、旧记录、撤销与恢复、高清画布、笔压、抬笔、朗读同步和无障碍反馈。

## 仓库内容

```text
adaptive-learning-starter/
├── codex-skill/adaptive-course-teacher/   # 可安装的 Codex skill
│   ├── references/                        # 教学与媒体制作流程
│   └── assets/examples/                   # 阅读、交互、对比与读写练习样本
├── project-template/                      # 新学习项目模板
└── adaptive-learning的安装与使用说明.md     # 可直接转发的完整说明
```

HTML 样本包括长文阅读型、分步骤交互型、多状态对比型和[读写练习](./codex-skill/adaptive-course-teacher/assets/examples/practice/index.html)。下载后可直接打开；读写样例包含目录、打字参考、手写稿纸、整页隐藏参考答案和本机记录恢复。它使用原创短句与系统字体，不包含教材扫描图或个人授权字体。这些是设计起点，不是每门课都必须套用的固定模板。

## 课本学习与项目续接

[课本图片复用流程](./codex-skill/adaptive-course-teacher/references/media-workflow.md#source-crops-and-transparent-cutouts)覆盖原页取图、照片去白边、插画留白转透明、边缘检查和 HTML 排版。保留原画内容，按适当大小展示；相邻两页按画面关系对齐，透明插画的外层容器也避免留下白色矩形背景。

[课本学习指南](./codex-skill/adaptive-course-teacher/references/textbook-learning.md)提供可选的阅读、示范、练习、纠错和迁移流程。新项目先根据学科、学习目标和实际能力选择、调整或省略步骤，并说明为什么适用。默写、手写、注音和造句属于读写学习的示例，不是所有课本课程的默认要求；资料分析和开卷解题等任务也不必隐藏参考资料。

[工作目录规则](./codex-skill/adaptive-course-teacher/references/workspace-management.md)适用于任何网盘，也适用于不使用网盘的项目。普通项目沿用原目录；大量下载、解压或提取前才检查同步位置。确认过的路径保存在被 Git 忽略的可选本机配置中，新对话沿用，换电脑时验证。笔记和作业不能把临时缓存当唯一存放位置；该规则不会自动移动项目或替你修改网盘设置。

[私有部署指南](./codex-skill/adaptive-course-teacher/references/private-delivery.md)分别管理 Git 收录、构建包含和站点访问。个人授权素材是否能用于托管要按具体授权判断；默认构建不带私有素材，获准的私有部署显式加入所需资源，并验证未登录访问受到限制。

`codex-skill/adaptive-course-teacher/references/learner-facing-copy.md` 与 `codex-skill/adaptive-course-teacher/references/interactive-courseware.md` 分别保存文案审核和交互课件的完整制作规范。

## 软件概念与操作跟练

学习软件概念或跟随视频操作时，可启用 [软件学习专用指南](./codex-skill/adaptive-course-teacher/references/software-learning.md)：核对版本与操作环境、区分试错和最终流程、应用学习者自己的命名规范，并分别记录观看、理解与实操进度。它不要求其他学科套用软件跟练的方法。

解释从适合当前主题的具象现象出发，再引入概念，不预设固定比喻。纸感样式、HTML 样例、截图和 Animated WebP 流程都是可选资源，按学习者项目的需要选用和调整。

## 手动安装

把 `codex-skill\adaptive-course-teacher` 复制到 `%USERPROFILE%\.agents\skills\adaptive-course-teacher`。

重新打开 Codex，再把 `project-template` 的内容复制到学习项目根目录。

## 隐私与课程授权

仓库不包含付费课程视频、PDF、登录信息、个人笔记或平台卡片 ID。学习者需要自行提供有权使用的课程来源，并明确授权 AI 访问登录后的页面或评论区。
