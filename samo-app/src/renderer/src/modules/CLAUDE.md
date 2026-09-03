# modules/
> L2 | 父级: ../../CLAUDE.md

Samo = 身份 × 模块。壳提供窗口、导航与侧栏几何；每个模块交出三样东西：侧栏、面板、可选的面板头部（PanelHeader 三槽）。浏览器只是第一个模块：它的「面板」是主进程叠上来的网页视图；应用维度（apps）也用它——一张应用卡就是一个带 appId 的标签，只在应用维度呈现、不进浏览器侧栏；其余模块的面板由自己渲染，切换过去时主进程把网页视图藏起来（不销毁）。身份是跨模块的概念：浏览器里它是登录态分区，邮件里将是邮箱，知识库里将是资料所有者。

## 成员清单
registry.tsx: ModuleDef 与 MODULE_REGISTRY——browser、apps、workspace、assets 接入真实实现，mail/knowledge/memory 接 placeholder，design 接陈列页；新模块 = 新目录 + 这里一行。
browser/: 浏览器模块——NavButtons.tsx（后退/前进/刷新，应用维度头部共用）、BrowserPanelHeader.tsx（面板头部：左 NavButtons，中 UrlField，右 复制地址 + 标签矩阵开关）、UrlField.tsx（居中地址栏：只看不改，点击开 ⌘T 同款命令面板 editUrl/newTab；悬停链接时淡色显示目标地址）、FindBar.tsx（⌘F 页内查找条：输入即查、Enter/Shift+Enter 上下一处、n / total、Esc 退出）、TabOverview.tsx（Safari 式标签矩阵：openOverview 先向主进程要缩略图再 layout.overview，交错入场、点选切换、悬停关闭、Esc/点空白退出）、BrowserPanel.tsx（面板体：矩阵态 / 网页让位的空渲染 / 身份空态）、sidebar/（Arc 级侧栏，见其 CLAUDE.md）、palette/Palette.tsx（⌘T 命令面板，由 overlay 页挂载）。
apps/: 应用维度——用户自己的应用像 OS 桌面一样陈列（见其 CLAUDE.md）。
workspace/: 工作区维度——本机目录 = 工作区，面板是目录的对话（见其 CLAUDE.md）。
assets/: 资产维度——下载的、AI 生成的，按 tab 陈列（见其 CLAUDE.md）。
placeholder/Placeholder.tsx: 未上线模块共用的侧栏骨架与面板空态（Laper Placeholder 形态）。
design/: 仅开发环境可见的设计系统陈列（MODULES 里 dev: true）——store.ts 章节表与导航状态；DesignSidebar.tsx 章节导航（SidebarButton）；DesignPanel.tsx Kumo 文档站形态的页面（text-4xl 页头 + max-w-6xl 内容列，IntersectionObserver 回写当前章节）；Showcase.tsx 各章节：Button / SidebarButton / Input / Tooltip & Popover / Keycap / Surfaces & Shadows / Colors / Typography / Icons，陈列原语 Section(h2)/Group(h3)/Example(h4 + 预览面 + 代码块)/PropsTable 逐 class 取自 Kumo 的 Heading/ComponentExample/PropsTable。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
