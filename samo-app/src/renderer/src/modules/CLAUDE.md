# modules/
> L2 | 父级: ../../CLAUDE.md

Samo = 身份 × 模块。壳提供窗口、导航与侧栏几何；每个模块交出三样东西：侧栏、面板、可选的头部动作。浏览器只是第一个模块：它的「面板」是主进程叠上来的网页视图，其余模块的面板由自己渲染。切换模块时主进程把网页视图藏起来（不销毁）。身份是跨模块的概念：浏览器里它是登录态分区，邮件里将是邮箱，知识库里将是资料所有者。

## 成员清单
registry.tsx: ModuleDef 与 MODULE_REGISTRY——browser 接入真实实现，mail/knowledge/drive 接 placeholder，design 接陈列页；新模块 = 新目录 + 这里一行。
browser/: 浏览器模块——BrowserPanel（空态）、BrowserHeaderActions（后退/前进/刷新）、sidebar/（Arc 级侧栏，见其 CLAUDE.md）、palette/Palette.tsx（⌘T 命令面板，由 overlay 页挂载）。
placeholder/Placeholder.tsx: 未上线模块共用的侧栏骨架与面板空态（Laper Placeholder 形态）。
design/: 仅开发环境可见的设计系统陈列（MODULES 里 dev: true）——store.ts 章节表与导航状态；DesignSidebar.tsx 章节导航（SidebarButton）；DesignPanel.tsx Kumo 文档站形态的页面（text-4xl 页头 + max-w-6xl 内容列，IntersectionObserver 回写当前章节）；Showcase.tsx 各章节：Button / SidebarButton / Input / Tooltip & Popover / Keycap / Surfaces & Shadows / Colors / Typography / Icons，陈列原语 Section(h2)/Group(h3)/Example(h4 + 预览面 + 代码块)/PropsTable 逐 class 取自 Kumo 的 Heading/ComponentExample/PropsTable。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
