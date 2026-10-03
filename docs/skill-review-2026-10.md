# adaptive-course-teacher 一致性审查（2026-10）

审查对象：`codex-skill/adaptive-course-teacher/` 下的 `SKILL.md`、`references/` 全部 20 个参考文件，以及它们引用到的 `assets/`、`scripts/` 下的工具（以提交 `24cf3cc` 为准）。本次只读审查：没有改动 `SKILL.md` 或 `references/`，下面每条只给出建议。行号为该提交时的大致位置。

技能校验器（`quick_validate.py`）在审查时通过；以下问题都是内容层面的，校验器查不出来。

## 总览

| 编号 | 严重程度 | 类别 | 一句话 |
| --- | --- | --- | --- |
| H1 | 高 | 1 矛盾 | 振假名字体：一处说用界面无衬线体，另一处说用正文宋体 |
| H2 | 高 | 1 矛盾 | 有底色（浅色色块）的裁图到底去不去底 |
| H3 | 高 | 1 矛盾 | 允许保留不透明的情形，两个文件列的不一样 |
| H4 | 高 | 1 矛盾 | 图注最小宽度：300px / 220px / 180px 三个数 |
| H5 | 高 | 1 矛盾 | 图的显示大小：能否超过原图像素、最高 80vh 还是一屏 |
| H6 | 高 | 1 矛盾 | 什么时候可以改生成脚本 |
| H7 | 高 | 1 矛盾 | 版面复核时能不能重裁图、能不能补转写 |
| M1 | 中 | 1 矛盾 | 整书制作“按阶段横跨所有单元”与版面复核“一个单元做完再做下一个” |
| M2 | 中 | 1 矛盾 | `crops.json` 是唯一记录还是可重新生成的派生文件 |
| M3 | 中 | 1 矛盾 | 课件设计规范与阅读版排版（字号、字体、面板颜色）冲突且无优先级 |
| M4 | 中 | 1 矛盾 | 动效时长上限 420ms 与内置组件 480ms |
| M5 | 中 | 1 矛盾 | “reading map”在书、教材、引导、课件里说法不一 |
| M6 | 中 | 1 矛盾 / 3 悬空 | `check_books.py` 的必填字段与 `bookshelf.md` 不一致 |
| M7 | 中 | 1 矛盾 | 项目模板的 `.gitignore` 没有忽略 `local-reading/` |
| M8 | 中 | 1 矛盾 | 窄屏断点与验收宽度各写各的；“无头浏览器不能测手机宽度”已过时 |
| M9 | 中 | 2 重复 | `book-learning.md` 与 `layout-review.md` 互指对方为准，各写一遍全文 |
| M10 | 中 | 3 悬空 | `en_page` 字段没有定义，工具也不读 |
| M11 | 中 | 3 悬空 | 按标题引用的小节其实不是标题（References、Book tools 等） |
| M12 | 中 | 3 悬空 | `layout_review.py` 用页图时仍必须给 `--pdf-pages`；页码是 1 起算 |
| M13 | 中 | 4 弱模型 | 同一个词多种含义：group、unit、page、edition、set、cluster、layout |
| M14 | 中 | 4 弱模型 | 超长单段规则（一段 1500–2500 字符、十几个条件） |
| M15 | 中 | 公开仓库 | 参考文件中仍有具体书名、个人决定记录 |
| L1–L12 | 低 | 2/3/4/5 | 见“低”一节 |

---

## 高

### H1 振假名（furigana）字体互相矛盾

- **文件 / 小节**：`references/bilingual-reader.md` →「Behavior and Layout」第 4 条（约第 43 行）；`references/presets.md` →「Chinese Reading Typography」第 4 条（约第 69 行）。
- **问题**：`bilingual-reader.md` 规定振假名用界面无衬线体、字重 600（MiSans Demibold，再退到系统日文无衬线体），并明确“不要用正文衬线体”；`bilingual.css` 也是这么实现的。`presets.md` 却写日中双语版“日文正文和振假名都用京华老宋”。最近一次提交只改了前者，后者没跟上。
- **建议**：以 `bilingual-reader.md` 为准（与运行时 CSS 一致）。把 `presets.md` 那句改成“日文标题用朝華標題B、日文正文用京华老宋；振假名见 `bilingual-reader.md`（界面无衬线体）”。

### H2 有底色的图是否去底

- **文件 / 小节**：`references/media-workflow.md` →「Crop Record」字段说明（约第 59 行）与同文件「Source Crops and Transparent Cutouts」第 2 步（约第 33 行）；`references/book-learning.md` →「Reading Editions」（约第 49 行）。
- **问题**：字段说明写 `transparent` 为 false 的情形是“照片和**保留原样的有色底**”；第 2 步却说“有色底（米黄、黄、青色教学色块、色纸）也是纸”，要用 colour-to-alpha 去掉；`book-learning.md` 也说画在“白色或有色页面”上的图默认去底。弱模型读字段说明会把色块底全部保留。
- **建议**：以第 2 步为准。字段说明改为“`transparent`：照片、整幅绘画，以及第 2 步列出的例外为 false，并在条目上写明原因”，删掉“tinted backgrounds kept as they are”。

### H3 允许保持不透明的例外清单不同

- **文件 / 小节**：`references/book-learning.md` →「Reading Editions」（约第 49 行）；`references/media-workflow.md` → 第 2 步（约第 33 行）。
- **问题**：`book-learning.md` 写“**只有**照片或整幅绘画可以保持不透明”；`media-workflow.md` 另外允许“近白、不均匀的扫描，去底会抹掉淡彩或手写、或留下色块时，保持不透明并记录原因”。两条都用了排他性措辞。
- **建议**：例外清单只保留在 `media-workflow.md` 第 2 步（见 D1），`book-learning.md` 改成一句引用：“画在纸上的图默认去底，例外与做法见 `media-workflow.md` 第 2 步”。

### H4 图注最小宽度有三个数

- **文件 / 小节**：`references/book-learning.md` →「Reading Editions」中“Read each page's layout…”一条（约第 48 行）：“图注不窄于约 **300px**”；`references/layout-review.md` →「Material」（约第 27 行）与「Procedure」第 5 步（约第 74 行）：`narrow-caption` 阈值和验收都是 **220px**；同文件第 4 步（约第 67 行）：网格单元格至少约 **180px**；`references/media-workflow.md` 第 5 步只说“可读宽度”，并指向 `book-learning.md`。
- **问题**：工具按 220 报告，验收按 220 判通过，但 `book-learning.md` 要求 300；弱模型无法判断 250px 的图注算不算合格。
- **建议**：选一个数写在一处（建议写在 `layout-review.md`，与工具阈值一致），分情况列清楚：独立图注 ≥ X px；网格单元格 ≥ 180px。如果真正的目标是 300，就把 `layout_shots.mjs` 的阈值一并改掉。`book-learning.md` 和 `media-workflow.md` 只引用。

### H5 图的显示大小上限不一致

- **文件 / 小节**：`references/media-workflow.md` 第 5 步（约第 36 行）；`references/layout-review.md` →「Do not」第 1 条（约第 100 行）；`references/book-learning.md` →「Reading Editions」第 3 条（约第 44 行）；`references/bilingual-reader.md` →「Behavior and Layout」图宽一条（约第 48 行）。
- **问题**：
  - `media-workflow.md`：“绝不宽于图本身的像素”，高度上限 `80vh`。
  - `layout-review.md`：“手绘批注的图组可以略大于扫描尺寸，好让手写能看清”，与“不超过原像素”正面冲突。
  - `book-learning.md` 和 `bilingual-reader.md`：“不高于窗口”（即 100vh），与 80vh 不同。
  - `bilingual-reader.md` 先写“横图在对照视图里占满两栏宽度、在单语视图里收窄到 760px”，读起来像固定宽度，句末才补一句“这些是上限”；与 `media-workflow.md`“按书中比例定大小”的主规则先后顺序相反。
- **建议**：以 `media-workflow.md` 第 5 步为唯一定义，写成有序判断：① 按书中比例算宽度；② 依次夹到 栏宽 / 双语视图上限（引用 `bilingual-reader.md` 的 760/620）/ 原像素（手绘图组可放宽到 ×N，写明 N）；③ 高度 ≤ 80vh。其余文件只引用，并把“不高于窗口”统一成 80vh。

### H6 什么时候可以改生成脚本

- **文件 / 小节**：`references/book-learning.md` →「Reading Editions」约第 48 行；`references/layout-review.md` →「Procedure」第 4、5 步、「When nothing fits」、「Several agents on one book」；`references/learner-facing-copy.md` →「Preserve Source Boundaries」。
- **问题**：
  - `book-learning.md` 无条件地要求“在生成器里做成命名布局”。
  - `layout-review.md`「When nothing fits」把它变成有条件：项目 `AGENTS.md` 禁止改生成器，或无法在三个宽度验证，就只记入待办。
  - 第 5 步又鼓励“改进所有单元的通用修复”，但要求重新打开其他单元或逐单元开关。
  - 「Several agents」规定主会话只从各分支取“源数据、图片和笔记”，子代理对生成器的改动会被直接丢弃，而文中没有说子代理能不能改生成器。
  - `learner-facing-copy.md` 说更大的重新设计需要学习者另行授权，与上面任何一条都没有对上。
- **建议**：在 `layout-review.md` 写一张唯一的判断表（`book-learning.md` 只引用）：

  | 情形 | 能否改生成器 |
  | --- | --- |
  | 项目 `AGENTS.md` 或学习者禁止 | 否，记入待办 |
  | 子代理并行 | 否；需要新布局时写进待办交主会话 |
  | 主会话且能在三个宽度验证 | 可以，做成命名布局并记录字段 |
  | 影响其他单元 | 可以，但要逐单元开关或逐个复核 |

### H7 版面复核中能不能重裁图、能不能补转写

- **文件 / 小节**：`references/layout-review.md` → 开头第 2 段、「Procedure」第 4 步、「Do not」最后一条、「Several agents on one book」。
- **问题**：
  - 第 4 步要求：手绘批注图组要新建裁框、删除旧碎图、重裁并跑裁图审计，所以重裁在范围内。
  - 「Do not」最后一条却说本轮不改转写或翻译，发现的问题（包括“**没有任何裁图包含的笔画**”）只列给学习者。漏掉笔画是裁图问题，按第 4 步应当重裁。
  - 第 4 步“印刷标签未转写的排版图示先算转写缺口，转写后再改成 around 布局”，但「Do not」禁止本轮转写，于是这类图在本流程里永远到不了 around。
  - 「Several agents」把裁图记录算作“派生文件”由主会话重新生成，子代理在 `crops.json` 里做的重裁可能被覆盖（另见 M2）。
- **建议**：在开头加一张“本轮可改 / 不可改”清单：可改＝布局字段、图注绑定、块类型、标题级别、裁框（含重裁）；不可改＝文字措辞、转写、翻译。把“没有任何裁图包含的笔画”移到可改的裁图问题里；把“标签未转写的图示”写成“记入待办，转写完成后在下一轮改成 around”。

---

## 中

### M1 整书制作的顺序与版面复核的顺序相反

- **文件 / 小节**：`references/book-learning.md` →「Whole-Book Production」第 1 条；`references/layout-review.md` →「Procedure」开头。
- **问题**：前者要求“按阶段横跨所有单元，而不是一个单元一个单元做”，阶段里包含“build, layout check”；后者要求“一个单元完整做完再开始下一个”。弱模型做整书时不知道版面检查该横向还是纵向。
- **建议**：在 `book-learning.md` 写明：版面检查阶段内部按 `layout-review.md` 逐单元完成，其余阶段横跨所有单元。

### M2 `crops.json` 的地位

- **文件 / 小节**：`references/media-workflow.md` →「Crop Record」（“the one place the boxes live”、第 0 步的 overrides 文件）；`references/layout-review.md` →「Several agents on one book」（“regenerates everything derived (crop record, pages)”）。
- **问题**：一处说它是唯一记录，另一处说它是可重新生成的派生文件。只有在第 0 步自动生成时它才是派生的，`layout-review.md` 没有说明这个前提。
- **建议**：`layout-review.md` 改为：“裁图记录若由脚本生成（`media-workflow.md` 第 0 步），合并 overrides 文件后重新生成；若是手写的，按条目合并，不得整体覆盖”。

### M3 课件设计规范与阅读版排版没有优先级

- **文件 / 小节**：`references/courseware-design.md` →「Visual Tokens」、同文件「Controls」；`references/presets.md` →「Chinese Reading Typography」；`references/bilingual-reader.md`；`SKILL.md` §4。
- **问题**：
  - `SKILL.md` 要求“构建任何 HTML 前读 `courseware-design.md`”。该文件规定正文 Inter 16px、衬线体只用于面板内标题、主标题 34px 无衬线；阅读版预设却用 20–22px 衬线正文和衬线标题。没有任何一处说明哪个优先。
  - 同一文件里，「Visual Tokens」写“面板：白色”（`--surface: #ffffff`），「Controls」写“表面：纸色”。
- **建议**：在 `courseware-design.md` 开头写明适用范围：课件与交互实验适用本文件；书的阅读版以 `presets.md` 和 `bilingual-reader.md` 的排版为准，只沿用颜色、控件和动效。面板颜色统一为一个值，并说明「Controls」覆盖「Visual Tokens」。

### M4 动效时长

- **文件 / 小节**：`references/courseware-design.md` →「Motion」（“过渡保持在 420ms 以内”）；`references/reader-chrome.md` →「What Readers Get」翻页过渡一段；`assets/reader-chrome/reader-chrome.css`（新页上移用 480ms）。
- **问题**：内置组件本身超过了设计规范的上限，弱模型会以为二者必须改其一。
- **建议**：要么在 `courseware-design.md` 注明“页面切换的回弹可到 ~500ms”，要么把组件改到 420ms 以内；二选一后统一。

### M5 “reading map”的含义不统一

- **文件 / 小节**：`SKILL.md` §3 第 3 步；`references/book-learning.md` →「First Session」；`references/textbook-learning.md` →「Candidate Sequence」第 1 步；`references/onboarding.md` →「Finish With One Unit」；`references/courseware-design.md` →「Learning Structure」第 1 条；技能目录下 `README.md` 首段。
- **问题**：书籍明确“不写阅读地图文件，只在对话里说一行”；教材第 1 步要“给一个简短的 reading map”；`onboarding.md` 说“交付第一单元的 map”；`courseware-design.md` 的阅读课结构里包含 “reading map”；`README.md` 说“每个单元从一张简短的地图开始”。同一个词有时是文件，有时是一句话，有时指视频的 viewing map。
- **建议**：在 `SKILL.md` §3 第 3 步给出定义：viewing map＝视频/软件，课前一段说明；书＝对话里一行页码与停止点，不写文件；教材＝对话里的简短说明。其余文件改用这三个说法之一。

### M6 书架检查脚本与文档的必填字段不一致

- **文件 / 小节**：`references/bookshelf.md` →「books.json」；`assets/bookshelf/tools/check_books.py`（`REQUIRED`）。
- **问题**：文档说 `edition`、`category` 是可选的，目录可以用 `directoryUrl`，**或者**用 `reader` + `chapters`；脚本却把 `edition`、`category`、`reader`、`chapters` 都设为必填。只用 `directoryUrl` 的书会被报错，而文档的「Verify」又要求先跑这个脚本。
- **建议**：以文档为准修改脚本：`directoryUrl` 与 `reader`+`chapters` 二选一；`category` 只在达到 `searchFrom` 时必填；`edition` 可选。也可以反过来改文档，但两边必须一致。

### M7 项目模板没有忽略 `local-reading/`

- **文件 / 小节**：`assets/project-template/.gitignore`；`references/book-learning.md` →「Reading Editions」末条；`references/media-workflow.md` →「Crop Record」。
- **问题**：参考文件把原文、译文、裁图和 `crops.json` 都放在 `local-reading/`，并要求放在“被忽略的本地目录”；模板 `.gitignore` 只忽略 `/sources/private/`、`/assets/local/`、`/work/`。照模板新建的书籍项目，第一次提交就可能把受版权保护的阅读版提交进去。
- **建议**：模板 `.gitignore` 加入 `/local-reading/`，或在 `book-learning.md` 明确要求首次构建前加上。附带一处：`crops.json` 示例中 `pages` 写成 `../work/...`（相对本文件），`source` 却写成 `sources/private/book.pdf`（看起来相对项目根），应统一为相对本文件的 `../sources/private/book.pdf`，或说明 `source` 相对项目根。

### M8 窄屏断点和验收宽度各写各的

- **文件 / 小节**：`references/reader-chrome.md`（740px，验收 375px）；`assets/bilingual-reader/assets/bilingual.css`（720px）与 `references/bilingual-reader.md`（验收 375px）；`references/image-preview.md`（390/320px）；`references/layout-review.md`（1440/820/390）；`references/book-learning.md`（1440/1920）；`references/bookshelf.md`（375px）；`references/courseware-design.md` →「Quality Check」。
- **问题**：
  - “narrow screens”在 reader-chrome 指 ≤740px，在 bilingual 指 ≤720px；720–740px 之间工具栏已经收进面板，但正文仍是双栏。
  - 每份文档的验收宽度都不同。
  - `courseware-design.md` 说“无头浏览器会钳制窄宽度，手机宽度要在可见浏览器里用设备模拟测”，而 `layout_shots.mjs` 已经用 DevTools 设备模拟在无头模式下拍 390px，这条说法已经过时。
- **建议**：在 `courseware-design.md`「Quality Check」定义一套标准验收宽度（例如 1440 / 820 / 390，另加 320 的极限检查），各组件文档引用它；统一一个窄屏断点或说明两者的关系；把“无头不行”改为“用 `layout_review.py` 或 DevTools 设备模拟”。

### M9 `book-learning.md` 与 `layout-review.md` 互相指对方为准

- **文件 / 小节**：`references/book-learning.md` 约第 48 行（约 2100 字符的整段）；`references/layout-review.md` 开头（“The rule this enforces is in `book-learning.md`”）与「Two kinds of page design」「Markers in place of leader lines」；`references/media-workflow.md` 第 1 步。
- **问题**：排版组合与手绘批注图组的区分、字母标记代替引线、图注宽度、三宽度检查，三份文件各写一遍，而且措辞已经开始分叉（见 H4）。两份文件互相声称对方是规则来源。
- **建议**：规则正文只留在 `layout-review.md`；`book-learning.md` 缩成两句：“裁图前先读懂页面的组合关系，见 `layout-review.md`『Two kinds of page design』；一本书第一次交付前按该文件复核”；`media-workflow.md` 第 1 步只保留“一个图的边界＝整个手绘批注图组”并引用。

### M10 `en_page` 字段悬空

- **文件 / 小节**：`references/book-learning.md` →「Reading Editions」双版本一条（约第 50 行）。
- **问题**：要求在裁图条目上记录 `en_page` / `edition`。`media-workflow.md`「Crop Record」只定义了 `edition`（配合 `pages` 映射），`crop_audit.py` 和 `layout_review.py` 也只读 `edition`；整个仓库只有这一处出现 `en_page`。字段名还把某一种语言写死了，不符合学科中立。
- **建议**：删掉 `en_page`，改为“用 `edition` 和该版本的 `page`（见 Crop Record）”；如果确实需要同时记录另一版的页码，就在「Crop Record」里定义一个中性字段（如 `other_pages: {edition: page}`）。

### M11 按小节名引用，但对方没有这个标题

- **文件 / 小节**：
  - `references/media-workflow.md` 第 5 步：“see the composed-page rule in `book-learning.md`”，`book-learning.md` 里没有这个名字的小节或条目。
  - `references/book-learning.md`、`references/presets.md` 引用 `reader-chrome.md` 的 “References”；`references/courseware-design.md`、`references/bilingual-reader.md` 引用 “Book tools”；`references/bookshelf.md` 引用 “New chapters” 和 “Tab icon”。这四处在 `reader-chrome.md` 里都只是段首词，不是标题，而且全部埋在「What Readers Get」一节里。
- **问题**：弱模型按标题搜索会找不到，或者读完整节也认不出是哪一段。
- **建议**：把 `reader-chrome.md` 的这四段提升为 `###` 小节（References、Book tools、New chapters、Tab icon）；`media-workflow.md` 改为引用 `layout-review.md`「Two kinds of page design」（见 M9）。

### M12 `layout_review.py` 的参数说明不全

- **文件 / 小节**：`references/layout-review.md` →「Material」；`assets/layout-review/layout_review.py`。
- **问题**：
  - 文档说源是页图时“用 `--images`”，但脚本仍要求 `--pdf-pages` 才会生成书页对照图，缺了只打印一行提示后继续。参数名里的 “pdf” 会让模型以为用页图时不需要它。
  - `--widths`、`--browser` 没有写进文档。
  - `--pdf-pages`、`ocr_draft.py` 的页码区间、`crops.json` 的 `page` 和 `{page}` 模板都是 **1 起算**，但文档一律叫 “page index”。PyMuPDF 等库的 index 是 0 起算，容易差一页。
  - `ocr_draft.py` 的区间只支持 `a-b`，`layout_review.py` 支持 `a-b,c`，语法不一致。
- **建议**：命令示例里补一条 `--images "...{page:04}.png" --pdf-pages 34-39`，并注明“使用页图时也需要 `--pdf-pages`，它表示页码”；列出 `--widths`、`--browser`；在 `media-workflow.md`「Crop Record」写明“`page` 是源文件的 1 起算页码”，各处统一叫“页码”；让两个工具接受同一种区间语法。

### M13 同一个词在不同文件里含义不同

对能力较弱的模型影响最大。建议在 `SKILL.md` 或 `media-workflow.md` 加一个简短术语表，并在冲突处改名。

| 词 | 不同含义（出处） | 建议 |
| --- | --- | --- |
| group | 裁图记录字段：同页/同章、仅用于审计重叠（`media-workflow.md`）；版面复核里“属于一起的一组图”（`layout-review.md`）；图片预览翻页分组 `data-preview-group`（`image-preview.md`） | 版面复核改称“picture group”或“composition”；字段说明注明“与版面复核的 group 无关” |
| unit | 学习单元（全部文件）；坐标比例 `"unit": 1000`（`media-workflow.md`、`crop_audit.py`）；`layout-review.md` 命令里的 `<unit>` 又是学习单元 | 坐标字段在文档里称“coordinate scale (`unit`)”，不要单说 unit |
| page | 源文件页码（1 起算）、印刷页码 `printed`、OCR 输出里的字符串标签 `"p0011"`、网页 | 统一“页码 / 印刷页码 / 网页”三个说法；OCR 输出字段改名或注明是标签 |
| edition | 阅读版（网页成品）；书的版次（初版/再版）；书架 `edition` 字段（示例值是“原文重排阅读版”，即阅读版的类型） | 版次用 “source edition”，书架字段改名或注明含义 |
| set | 版面复核判定 `set`；同一节里又用作动词（“the book itself sets them as a plate”）；以及到处出现的 “set the …” | 判定改名为 `main-with-refs` 之类，避免与动词同形 |
| cluster | 判定 `cluster`（手绘批注图组）；`media-workflow.md` 第 1 步 “annotated cluster”（一致）；`learning-engine.md` 术语表里 “once clusters appear”（术语分组） | 术语表处换成 “groups of related terms” |
| layout | 页面版式；生成器里的“命名布局”；`layout_ok` / `data-layout-ok`；“a bilingual reader has more than one layout”（其实指视图） | 双语处改为 “more than one view”；命名布局统一称 “named layout” |
| view / preview / record / review | 双语视图 vs 网页；图片预览 vs `preview.py` vs `?preview-new` vs 引用卡片；学习记录 vs 裁图记录；版面复核 vs 间隔复习 vs 译文审校 | 首次出现时写全称（“crop record”“layout review”“spaced review”） |

### M14 超长单段规则

- **文件 / 小节**：`references/media-workflow.md` 第 2 步（约 2470 字符，含阈值测量、色底、colour-to-alpha、暖色绘画、渐隐、近白扫描、性能提示等 8 个以上分支）；`references/book-learning.md` 约第 48 行（约 2100 字符，排版与手写两类、标记、图注、检查、事例）和第 46 行（OCR，含基准数字、第二引擎、合并规则）；`references/reader-chrome.md` 约第 19 行（章节刻度栏，约 1850 字符）；`references/bookshelf.md` 约第 32 行（发布登记，约 1580 字符）。
- **问题**：一段话里塞了太多条件，步骤顺序也不明确，弱模型容易只执行前几句。
- **建议**：改成“先判断、后操作”的决策表或编号子步骤。例如第 2 步可拆成：① 判断类型（照片 / 整幅绘画 / 线稿在白纸 / 线稿在色底 / 暖色绘画渐隐 / 近白不均扫描）→ ② 每类一行做法 → ③ 共同检查。基准数字和性能经验移到脚注或维护说明。

### M15 公开仓库中仍有具体书名和个人决定记录

（本报告不复述具体内容，只给位置。）

- **文件 / 小节**：
  - `references/reader-chrome.md` →「Config」示例中的 `book` 与章节标题，和 `legacy` 两个适配器名（`assets/reader-chrome/apply_reader_chrome.py` 中同名函数）。
  - `references/bookshelf.md` →「books.json」标题规则示例里的原书名和作者。
  - `references/presets.md` →「Chinese Reading Typography」中“学习者现有书籍”“某日确认”的个人决定，以及取自具体书籍的引号示例。
  - `references/bilingual-reader.md` 中带日期的“首次在某书确认”说明。
- **问题**：仓库 `AGENTS.md` 要求保持学科中立、不放个人学习记录；这些内容也会让弱模型把示例当成默认值。
- **建议**：示例改成中性占位（如 `示例书`、`chapter-01`）；`legacy` 适配器改成通用名，或移出公开组件；个人决定只保留结论（“拉丁文原文用拉丁衬线体”），日期和来历移到提交历史。

---

## 低

### L1 重复的规则及建议的唯一出处（类别 2）

| 规则 | 出现位置 | 建议以此为准 | 其余改为引用 |
| --- | --- | --- | --- |
| 画在纸上的图默认去底 | `media-workflow.md` 第 2 步、`book-learning.md`「Reading Editions」、`interactive-courseware.md`「Source Images」 | `media-workflow.md` 第 2 步 | 另两处各留一句引用 |
| 手绘批注图组的边界 | `layout-review.md`、`book-learning.md`、`media-workflow.md` 第 1 步 | `layout-review.md`「Two kinds of page design」 | 见 M9 |
| 单栏居中 | `book-learning.md`「Reading Editions」第 3 条、`bilingual-reader.md`「Behavior and Layout」第 1 条 | 通用规则放 `book-learning.md`，双语细节放 `bilingual-reader.md` | 双语那条去掉通用部分 |
| “纸先于应用”的控件禁用清单（药丸、滑块、毛玻璃……） | `courseware-design.md`「Controls」、`reader-chrome.md` 开头与 Book tools、`image-preview.md`「Fit the Project」、`presets.md` | `courseware-design.md`「Controls」 | 其余一句引用 |
| 阻尼弹簧动效 | `courseware-design.md`「Motion」、`reader-chrome.md` 开头、`image-preview.md`「Included Behavior」 | `courseware-design.md`「Motion」 | 组件文档只写自己的参数 |
| 回忆时隐藏答案 | `interactive-courseware.md`「Recall Across the Whole Page」、`learning-engine.md`「Checks and Quizzes」「Practice Inside Reading」、`teaching-workflow.md`「Practice and Assessment」 | `learning-engine.md`「Checks and Quizzes」 | 其余引用 |
| 能力维度清单（识别、解释、指导下完成……） | `learning-engine.md`、`interactive-courseware.md`、`onboarding.md`、`teaching-workflow.md`，清单各不相同 | `learning-engine.md`「Checks and Quizzes」 | 统一同一份清单 |
| 学习状态分开记录（检查过来源 / 产出材料 / 读过 / 能解释 / 能独立完成） | `SKILL.md` §3 末、`book-learning.md` Reading Loop 第 6 步、`software-learning.md`、`learning-engine.md`、`NOTES.md` 模板 | `SKILL.md` §3 | 其余引用 |
| PDF 页码与印刷页码分开、记录已验证对应 | `book-learning.md`（同一文件第 11 行和第 45 行各一次）、`textbook-learning.md`、`media-workflow.md` | `book-learning.md`「Source Locations」 | 删掉同文件内的重复 |
| 注音 / 注释绑定到词（ruby） | `courseware-design.md`、`interactive-courseware.md`、`book-learning.md` | `interactive-courseware.md`「Reading, Narration, and Annotations」 | 其余引用 |
| 成对页面按视觉基线对齐 | `courseware-design.md`「Layout」、`interactive-courseware.md`、`media-workflow.md` 第 5 步 | `media-workflow.md` 第 5 步 | 其余引用 |
| 在真实浏览器里读 computed font-family | `presets.md`、`bilingual-reader.md`「Verify」 | `presets.md` | — |
| 新章节 `新` 标记 | `reader-chrome.md`、`bookshelf.md`、`presets.md` 两处 | `reader-chrome.md`（提升为小节后） | — |
| viewing map 的内容 | `SKILL.md` §3、`teaching-workflow.md`、`software-learning.md` | `teaching-workflow.md`「Before Viewing」 | `SKILL.md` 留一句 |

### L2 `crop_audit.py` 未写进文档的参数与适配器字段（类别 3）

- **文件 / 小节**：`references/media-workflow.md` 第 6 步。
- **问题**：
  - `--only ID …`（只审指定条目及其同组邻居）没有写进文档。
  - 文中说旧项目可以“从短适配器调用 `audit(figures, unit, sheets)`”，但没有说明适配器的字段名与记录不同：适配器用 `image`、`accepted`，记录用 `output`、`audit_ok`，而且 `page` 要传页图路径，不是页码。
- **建议**：补一句参数和字段对照，或直接指向脚本头部的说明。

### L3 OCR 第二引擎没有随仓库提供（类别 3）

- **文件 / 小节**：`references/book-learning.md` 约第 46 行。
- **问题**：文中写的 “Windows OCR (`OCR.exe`/PowerShell …)” 不在仓库里，也没有说明只能在 Windows 上用；弱模型可能去 `assets/` 里找它。
- **建议**：注明“仓库不附带，仅限 Windows；其他平台用 … 或跳过”。

### L4 `reader-chrome.md` Config 缺少 `id` 字段（类别 3）

- **文件 / 小节**：`references/reader-chrome.md` →「Config」。
- **问题**：“New chapters”一段依赖配置里的 `id`，但 Config 的示例和字段说明里都没有它。`vars`、`width` 在别处说明了，但也不在字段列表里。
- **建议**：把 `id`、`width`、`vars`、`directory.width` 加进 Config 字段列表。

### L5 书架文档的小处出入（类别 3）

- **文件 / 小节**：`references/bookshelf.md`。
- **问题**：
  - 封面写作 `<id>.webp`，示例却是 `covers/sample-book.svg`。
  - `library.ts` 支持的 `cover.background`、`cover.position`、`spine.side` 没有写进文档。
  - `searchFrom` 默认值 12 没写。
  - `tools/make_hanzi_fold.py` 需要两份 OpenCC 词表路径作参数，文档没有给用法。
- **建议**：逐项补齐，或注明“其余字段见 `src/library.ts`”。

### L6 双语竖图 620px 不在组件 CSS 里（类别 3 / 4）

- **文件 / 小节**：`references/bilingual-reader.md` 图宽一条。
- **问题**：760px 由 `bilingual.css` 实现；620px 的竖图上限和对照视图里居中都要在书自己的样式表里写，文档没有说明。
- **建议**：注明“以下由书的样式表实现”，或把它们并入 `bilingual.css`。

### L7 `teaching-workflow.md` 自述的覆盖范围不准（类别 3）

- **文件 / 小节**：`references/teaching-workflow.md` 开头。
- **问题**：自称覆盖学习循环的第 3–8 步，但「Close the Lesson」实际也覆盖了第 9 步（记录）。
- **建议**：改成“第 3–9 步”。

### L8 规则里夹带事件来历和日期（类别 4）

- **文件 / 小节**：`book-learning.md`（“First needed in …, 2026-10-03”“First used for …”）、`media-workflow.md`（“Agents have skipped this step…”“half an hour for one chapter's recut”）、`bilingual-reader.md`（“First adjusted …”“first met on …”）、`bookshelf.md`（“touched five files in eleven places”）、`presets.md`。
- **问题**：`project-setup.md` 要求项目文件“改规则就原地改写，不要追加带日期的条目”，技能本身却没有这样做。这些来历占篇幅，弱模型还可能把具体书类当成触发条件。
- **建议**：规则只写结论和判断条件，来历移到提交说明或单独的 CHANGELOG。

### L9 版面复核第 5 步的验收条件嵌套太多（类别 4）

- **文件 / 小节**：`references/layout-review.md` →「Procedure」第 5 步。
- **问题**：七个子条件里有 “outranks”“unless … then …”“if at all” 这类优先级和例外，阅读顺序、左右侧和双语视图三件事互相牵制。
- **建议**：拆成“所有宽度”“宽屏”“手机”三组检查表，优先级写成一句：“手机上图文相邻 > 书中左右”。

### L10 SKILL.md 索引（类别 5）

- 20 个参考文件全部能从 `SKILL.md` 找到；`assets/` 下 11 个目录或文件也都在 §6 列出。**没有发现遗漏的参考文件。**
- 小缺口：
  - `scripts/install-image-preview.cjs` 和书架的三个 `tools/` 脚本不在 §6，只能经由对应参考文件找到。
  - §6 说 `crop-audit`、`ocr`、`layout-review` “各在用到它的参考文件里介绍”，但没有说是哪一个（分别是 `media-workflow.md`、`book-learning.md`、`layout-review.md`），弱模型要逐个翻。
  - §2 的分流表没有覆盖“只裁图 / 只做 OCR、但不是书”的任务。
- **建议**：§6 每个工具后加“→ 见 `xxx.md`”；`scripts/` 补一行。

### L11 评测没有覆盖近期新增的流程（类别 5）

- **文件**：`evals/evals.json`。
- **问题**：8 个用例都没有涉及阅读版、裁图去底、版面复核或双语阅读器，而这些恰好是最近改动最多、矛盾最多的部分。
- **建议**：补 2–3 个用例，例如“画在色纸上的线稿要不要透明”“版面复核时发现漏笔画怎么处理”。

### L12 手写 JavaScript 与仓库 TypeScript 规则（仓库约定）

- **文件**：`assets/layout-review/layout_shots.mjs`；`assets/examples/assets/*-app.js`、`*-scene.js`。
- **问题**：仓库 `AGENTS.md` 要求新写或大改的非第三方代码用 TypeScript，JavaScript 只能是生成产物；这几个文件没有对应的 TS 源文件。另外，layout 工具要求 Node 22+，安装器测试要求 Node 24+，两个版本要求不一致。
- **建议**：为 `layout_shots.mjs` 补 TS 源文件和构建步骤，或在 `AGENTS.md` 里写明例外；把 Node 版本要求统一写在一处。

---

## 按类别核对结果

1. **互相矛盾的规则**：H1–H7、M1–M8。用户列出的五个例子都确认存在矛盾：图的显示大小（H5）、裁图是否透明（H2、H3）、图注宽度（H4）、何时改生成脚本（H6）、版面复核能否重裁图（H7）。
2. **重复**：M9、L1。
3. **过期或悬空的引用**：M10–M12、L2–L7。逐项核对后**未发现问题**的有：
   - `SKILL.md` 提到的全部参考文件和 `assets/` 路径；
   - `layout_review.py` 的 `--page --survey --out --pdf --images --pdf-pages --crops --view`，以及输出文件 `book-NN.png`、`pages/pNNNN.png`、`w<width>-NN.png`、`report.json`（含 `anchors`），和 finding 名称 `small-alone`、`wordless-run`、`narrow-caption`、`overflow`、`row-split`、`cut-frame`，以及 `data-layout-ok`；
   - `crop_audit.py` 的 `--sheets` 与 `clipped`、`overlap`、`near-empty`、`outside`、`scale`、`paper`，以及 `parts`、`edition`、`audit_ok`；
   - `ocr_draft.py` 的调用方式与 1000 宽坐标；
   - `install-image-preview.cjs` 的 `--project --asset-dir --force` 和“四个文件”；
   - `image-preview.css` 的 `--preview-*` 变量、`.al-viewer-image`、`UIOption`；
   - `apply_reader_chrome.py` 的 `load`、`decorate`、`decorate_directory`、`with_assets`、`BOOK_ICON`、`vars`、`width`、`directory.width`；
   - `bilingual` 的 `data-bilingual-view`、`data-bilingual-ruby`、`data-bilingual-key`、`--bilingual-*-font`、0.52em、20/22px、760px；
   - 三个 `package.json` 的 `check`/`build` 脚本；`tests/install-image-preview.test.ts`。
4. **对弱模型不友好**：M13、M14、L8、L9，以及 H5–H7 中的条件嵌套。
5. **SKILL.md 索引覆盖**：参考文件**未发现遗漏**；工具索引有小缺口，见 L10、L11。
