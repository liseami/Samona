# renderer/
> L2 | 父级: ../../CLAUDE.md

三张页面共用一套样式与 Tailwind 主题：`index.html` 是应用壳（三层：icon navi + 模块侧栏 + 面板，带 preload），`overlay.html` 是命令面板（透明，叠在网页之上，带 preload），`newtab.html` 是新标签页（无 preload 的普通网页，靠 location 导航）。渲染层从不持有真相：主进程推快照，组件只读镜像；所有动作经 store.send 变成 Command，需要返回值的经 store.query。

设计体系：配色是用户的 oklch 中性灰 shadcn 令牌（light/dark 由 html.dark 切换，跟随系统）；阴影、圆角、密度取自 Laper index.css——淡雅平阴影 + Apple squircle（corner-shape + Safari fallback）+ 压缩字号阶（xs10/sm12/base13/lg14）；结构取自 Laper ProjectEditorShell：页面底 `bg-sidebar`，一行 `gap-2 pt-2 pb-2 pl-0 pr-2` 里是 rail、侧栏卡、面板卡，两张卡同为 SoftPanel（`bg-panel rounded-2xl border shadow-sm`）；三级梯度 sidebar(底) < panel(卡) < card(浮起的行)；网页视图内缩 1px 叠在面板卡上露出边线。图标全部来自 Laper 的 Pika 库（icons/）。

## 成员清单
index.html: 壳页模板（CSP 放行 Google Fonts；Montserrat/Inter 按主题切换）。
overlay.html: 命令面板页模板。
newtab.html: 新标签页模板。
src/main.tsx: 壳页引导——bindBridge() 订阅主进程，挂载 App。
src/App.tsx: 合成层——一行三卡：NavRail | 侧栏卡（Header + 当前模块侧栏，Resizer 在右缘空档）| 面板卡（模块渲染）；折叠态侧栏卡消失，Header 成为面板卡之上的控制条；写入 html.dark 与 --identity。
src/styles.css: 设计令牌与全局规则（见上）；洗色（border/accent/muted/input）的深浅照搬 Laper 的相对关系；层级表：1 卡内热区、2 Popover、3 Tooltip、4 命令面板、5 NavRail 展开层（永远最高），卡片不设 z。
src/assets/logo.png: rail 顶部的应用标（build/icon.png 的 128px 版）。
src/vite-env.d.ts: vite/client 类型引用（静态资源 import）。
src/store/browser.ts: zustand 镜像——snapshot 与壳内一次性请求（rename/identityEditor）；send()/query()；bindBridge()；选择器与 memo 化的 useIdentityTabs/useFavorites/useIdentityFolders。
src/lib/utils.ts: cn()。
src/lib/dnd.ts: 拖拽语义——id 编解码、sectionOf、resolveDrop、sidebarCollision。
src/icons/: Pika 图标库与语义命名层（见其 CLAUDE.md）。
src/components/ui/: shadcn 形态原子（见其 CLAUDE.md）。
src/shell/: 跨模块的壳——Header、自绘红绿灯、NavRail、Resizer、EdgePeek（见其 CLAUDE.md）。
src/modules/: 模块注册表与各模块（见其 CLAUDE.md）。
src/overlay/main.tsx: 命令面板页引导（同步 html.dark，挂载 modules/browser/palette/Palette）。
src/newtab/main.tsx: 新标签页引导。
src/newtab/NewTab.tsx: 极简 NTP——品牌标 + 自动聚焦的地址框，回车用 shared/url 的 resolveInput 在本标签导航。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
