# Adaptive Learning Starter

一个可调教的 Codex 课程学习助手。它把视频课程和其他学习资料转化为：

- 观看前地图
- 课后重点重建
- 跟练笔记与长期参考
- 静态讲解图和 Animated WebP
- 聚焦单一关系的交互 HTML 课件
- 课程评论区中的常见问题与版本提醒

它不绑定 Blender、Heptabase 或某一门课程。AI 会先了解学习目标、已有基础、理解阻力、笔记习惯和可用工具，再逐步调整流程。

## 仓库内容

- `codex-skill/adaptive-course-teacher/`：可安装的独立 Codex skill
- `project-template/`：新学习项目的基础文件
- `adaptive-learning的安装与使用说明.md`：可直接发给学习者的完整说明
- Skill 内的 `assets/examples/`：阅读型、分步骤交互型和多状态对比型 HTML 样本

## 最省事的安装方式

1. 在 GitHub 选择 **Code > Download ZIP**。
2. 把下载的 ZIP 拖进 Codex。
3. 对 Codex 说：

```text
请读取压缩包中的 README.md 和 adaptive-learning的安装与使用说明.md，
帮我安装 adaptive-course-teacher skill，并创建一个新的学习项目。

如果目标位置已有同名 skill，不要覆盖，先告诉我差异。
安装完成后告诉我 skill 路径和学习项目路径。
```

4. 安装完成后，新建一个 Codex 任务并打开学习项目。
5. 第一次使用：

```text
请使用 $adaptive-course-teacher。

先读取 AGENTS.md、ONBOARDING.md、MISSION.md、NOTES.md 和 DESIGN.md。
不要立刻制作笔记或课件。先分批了解我的目标、基础、学习阻力、
笔记习惯和可用工具，然后更新 MISSION.md 与 NOTES.md。
```

## 手动安装

把：

```text
codex-skill\adaptive-course-teacher
```

复制到：

```text
%USERPROFILE%\.agents\skills\adaptive-course-teacher
```

然后重新打开 Codex。把 `project-template` 内容复制到自己的学习项目根目录。

## 隐私与课程授权

仓库不包含付费课程视频、PDF、登录信息、个人笔记或平台卡片 ID。学习者需要自行提供有权使用的课程来源，并明确授权 AI 访问登录后的页面或评论区。

