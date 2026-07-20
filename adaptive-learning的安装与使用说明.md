# 自适应课程学习助手：安装与使用说明

这是一个配合 Codex 使用的课程学习助手。它可以根据你的学习情况提供：

- 观看前地图
- 课后重点重建
- 跟练笔记
- 静态讲解图
- Animated WebP 动图
- 交互 HTML 课件
- 课程评论区常见问题整理

## 一、让 Codex 自动安装

不需要手动解压或复制文件。把从 GitHub 下载的 ZIP 直接拖进 Codex，然后发送：

```text
请读取附件中的 Adaptive Learning Starter，并完成安装。

要求：
1. 先读取 ZIP 内的 START-HERE.md。
2. 检查压缩包内容，不要运行来源不明的可执行文件。
3. 把 codex-skill/adaptive-course-teacher 安装到：
   %USERPROFILE%\.agents\skills\adaptive-course-teacher
4. 如果目标位置已经存在同名 skill，不要直接覆盖，先告诉我差异。
5. 询问我的学习项目要保存在哪里。
6. 创建学习项目目录，并把 project-template 中的全部内容复制到项目根目录。
7. 验证 SKILL.md、AGENTS.md、DESIGN.md、ONBOARDING.md、
   MISSION.md 和 NOTES.md 都已正确放置。
8. 告诉我最终的 skill 安装路径和学习项目路径。
```

安装完成后，重新打开 Codex或新建一个任务。用 Codex 打开刚创建的学习项目。

## 二、第一次建立学习档案

在新的学习项目中发送：

```text
请使用 $adaptive-course-teacher。

先读取 AGENTS.md、ONBOARDING.md、MISSION.md、NOTES.md 和 DESIGN.md。
不要立刻制作笔记或课件。

先分批问我必要的问题，了解我的学习目标、已有基础、理解阻力、
笔记习惯和可用工具，然后更新 MISSION.md 与 NOTES.md。
```

AI 会先了解你的情况，再逐步调整教学和笔记方式。

## 三、开始一节课程

提供课程链接、视频或本地文件，然后发送：

```text
开始这一节：<课程链接或文件>。

先读取 transcript、课程资料和评论区（如果有权限）。
给我观看前地图：重点看什么、什么可以略看、结束时应该理解什么。
暂时不要制作永久笔记。
```

## 四、轻松看完以后

发送：

```text
我轻松看完了。

假设我有些地方听懂了，有些地方走神了，
有些地方当时理解但现在无法重新建立推理。

请重新解释真正需要理解的重点、老师值得复用的经验、
需要记住的操作，以及可以暂时忽略的内容。

再推荐哪些内容适合 Markdown、静图、Animated WebP 或交互 HTML。
先让我决定，不要直接全部保存。
```

## 五、遇到看不懂的内容

发送：

```text
这部分还是不理解。

请判断使用文字、静图、Animated WebP 或交互 HTML 中的哪一种最合适。
一次只解释一个关系，并按照 DESIGN.md 的风格制作。
```

AI 应选择负担最低、最适合当前概念的媒介，不会默认把所有内容都做成交互网页。

## 六、使用提醒

- 使用 `$adaptive-course-teacher`，不需要另外安装或调用 `$teach`。
- 新安装的 skill 不一定会在当前任务中立即加载。安装后新建任务最稳妥。
- 登录后的课程页面和评论区需要授权 Codex 操作浏览器。
- 课程视频、PDF 和付费素材需要由你自己合法提供。
- HTML 样本位于：

```text
codex-skill\adaptive-course-teacher\assets\examples\lessons
```

这些样本只提供教学结构和视觉起点。AI 应根据你的学习主题和反馈继续调整。
