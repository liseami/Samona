# modules/
> L2 | 父级: ../../CLAUDE.md

Samo = 身份 × 模块。壳提供窗口、导航与侧栏几何；每个模块交出三样东西：侧栏、面板、可选的头部动作。浏览器只是第一个模块：它的「面板」是主进程叠上来的网页视图，其余模块的面板由自己渲染。切换模块时主进程把网页视图藏起来（不销毁）。身份是跨模块的概念：浏览器里它是登录态分区，邮件里将是邮箱，知识库里将是资料所有者。

## 成员清单
registry.tsx: ModuleDef 与 MODULE_REGISTRY——browser 接入真实实现，mail/knowledge/drive 接 placeholder；新模块 = 新目录 + 这里一行。
browser/: 浏览器模块——BrowserPanel（空态）、BrowserHeaderActions（后退/前进/刷新）、sidebar/（Arc 级侧栏，见其 CLAUDE.md）、palette/Palette.tsx（⌘T 命令面板，由 overlay 页挂载）。
placeholder/Placeholder.tsx: 未上线模块共用的侧栏骨架与面板空态（Laper Placeholder 形态）。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
