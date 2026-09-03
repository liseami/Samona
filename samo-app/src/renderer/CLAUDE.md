# renderer/
> L2 | 父级: ../../CLAUDE.md

两张页面共用一套样式与 Tailwind 主题：`index.html` 是浏览器壳（侧栏 + 悬浮内容卡片，带 preload），`newtab.html` 是新标签页（无 preload 的普通网页，靠 location 导航）。渲染层从不持有真相：主进程推快照，组件只读镜像；所有动作经 store.send 变成 Command，需要返回值的经 store.query。

设计体系：配色是用户的 oklch 中性灰 shadcn 令牌（light/dark 由 html.dark 切换，跟随系统）；阴影、圆角、密度取自 Laper index.css——淡雅平阴影 + Apple squircle（corner-shape + Safari fallback）+ 压缩字号阶（xs10/sm12/base13/lg14）；侧栏与内容区同底色，网页视图叠在壳绘制的 `bg-card + panel-shadow` 卡片之上，于是「浮」起来。图标全部来自 Laper 的 Pika 库（icons/）。

## 成员清单
index.html: 壳页模板（CSP 放行 Google Fonts；Montserrat/Inter 按主题切换）。
newtab.html: 新标签页模板。
src/main.tsx: 壳页引导——bindBridge() 订阅主进程，挂载 App。
src/App.tsx: 合成层——侧栏或折叠态贴边热区 + 内容卡片（无活动标签时显示 EmptySpace）；写入 html.dark 与 --space。
src/styles.css: 设计令牌与全局规则（见上）。
src/store/browser.ts: zustand 镜像——snapshot 与壳内一次性请求（omnibox/rename/spaceEditor）；send()/query()；bindBridge()；选择器与 memo 化的 useSpaceTabs/useFavorites/useSpaceFolders。
src/lib/utils.ts: cn()。
src/lib/dnd.ts: 拖拽语义——id 编解码、sectionOf、resolveDrop、sidebarCollision。
src/icons/: Pika 图标库与语义命名层（见其 CLAUDE.md）。
src/components/ui/: shadcn 形态原子（见其 CLAUDE.md）。
src/components/EmptySpace.tsx: Space 无标签时的内容卡片空态。
src/components/sidebar/: 侧栏各分段（见其 CLAUDE.md）。
src/newtab/main.tsx: 新标签页引导。
src/newtab/NewTab.tsx: 极简 NTP——品牌标 + 自动聚焦的地址框，回车用 shared/url 的 resolveInput 在本标签导航。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
