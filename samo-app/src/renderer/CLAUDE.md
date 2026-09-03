# renderer/
> L2 | 父级: ../../CLAUDE.md

三张页面共用一套样式与 Tailwind 主题：`index.html` 是浏览器壳（侧栏 + 内容面板，带 preload），`overlay.html` 是命令面板（透明，叠在网页之上，带 preload），`newtab.html` 是新标签页（无 preload 的普通网页，靠 location 导航）。渲染层从不持有真相：主进程推快照，组件只读镜像；所有动作经 store.send 变成 Command，需要返回值的经 store.query。

设计体系：配色是用户的 oklch 中性灰 shadcn 令牌（light/dark 由 html.dark 切换，跟随系统）；阴影、圆角、密度取自 Laper index.css——淡雅平阴影 + Apple squircle（corner-shape + Safari fallback）+ 压缩字号阶（xs10/sm12/base13/lg14）；结构取自 Laper MainLayout：整窗 `bg-sidebar`，右侧 `py-2 pr-2` 里是 `bg-panel + rounded-xl + border/50 + shadow-sm` 的面板（三级梯度 sidebar < panel < card），网页视图内缩 1px 叠在面板上露出边线，于是「浮」起来。图标全部来自 Laper 的 Pika 库（icons/）。

## 成员清单
index.html: 壳页模板（CSP 放行 Google Fonts；Montserrat/Inter 按主题切换）。
overlay.html: 命令面板页模板。
newtab.html: 新标签页模板。
src/main.tsx: 壳页引导——bindBridge() 订阅主进程，挂载 App。
src/App.tsx: 合成层——整窗 bg-sidebar，侧栏或折叠态贴边热区 + 右侧面板（无活动标签时显示 EmptyState）；写入 html.dark 与 --identity。
src/styles.css: 设计令牌与全局规则（见上）。
src/store/browser.ts: zustand 镜像——snapshot 与壳内一次性请求（rename/identityEditor）；send()/query()；bindBridge()；选择器与 memo 化的 useIdentityTabs/useFavorites/useIdentityFolders。
src/lib/utils.ts: cn()。
src/lib/dnd.ts: 拖拽语义——id 编解码、sectionOf、resolveDrop、sidebarCollision。
src/icons/: Pika 图标库与语义命名层（见其 CLAUDE.md）。
src/components/ui/: shadcn 形态原子（见其 CLAUDE.md）。
src/components/EmptyState.tsx: 身份无标签时的面板空态（New Tab 开命令面板）。
src/components/sidebar/: 侧栏各分段（见其 CLAUDE.md）。
src/overlay/main.tsx: 命令面板页引导（同步 html.dark）。
src/overlay/Palette.tsx: Laper CommandPalette 形态的命令面板——居中对话框 + bg-foreground/40 遮罩，分组结果（Go / Open tabs / History），↑↓ 循环、Enter、⌘Enter 新标签、Esc；由主进程 openPalette 事件驱动，关闭时发 palette.close。
src/newtab/main.tsx: 新标签页引导。
src/newtab/NewTab.tsx: 极简 NTP——品牌标 + 自动聚焦的地址框，回车用 shared/url 的 resolveInput 在本标签导航。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
