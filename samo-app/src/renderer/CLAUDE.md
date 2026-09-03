# renderer/
> L2 | 父级: ../../CLAUDE.md

五张页面共用一套样式与 Tailwind 主题：`index.html` 是应用壳（三层：icon navi + 模块侧栏 + 面板 + 停靠的对话卡，带 preload），`overlay.html` 是命令面板（透明，叠在网页之上），`chat.html` 是 AI 浮层（透明子窗口，药丸与面板同宿），`agent.html` 是 agent 光标层（透明、点击穿透的子窗口，盖在网页上），`newtab.html` 是新标签页（无 preload 的普通网页）。渲染层从不持有真相：主进程推快照，组件只读镜像；所有动作经 store.send 变成 Command，需要返回值的经 store.query。

设计体系：配色是用户的 oklch 中性灰 shadcn 令牌（light/dark 由 html.dark 切换，跟随系统）；阴影、圆角、密度取自 Laper index.css——淡雅平阴影 + Apple squircle（corner-shape + Safari fallback）+ 压缩字号阶（xs10/sm12/base13/lg14）；结构取自 Laper ProjectEditorShell：页面底 `bg-sidebar`，一行 `gap-2 pt-2 pb-2 pl-0 pr-2` 里是 rail、侧栏卡、面板卡，两张卡同为 SoftPanel（`bg-panel rounded-2xl border shadow-sm`）；三级梯度 sidebar(底) < panel(卡) < card(浮起的行)；网页视图内缩 1px 叠在面板卡上露出边线。图标全部来自 Laper 的 Pika 库（icons/）。

## 成员清单
index.html: 壳页模板（CSP 放行 Google Fonts；Montserrat/Inter 按主题切换）。
overlay.html: 命令面板页模板。
newtab.html: 新标签页模板。
src/main.tsx: 壳页引导——bindBridge() 订阅主进程，挂载 App。
src/App.tsx: 合成层——一行三卡：NavRail | 侧栏卡（Header + 当前模块侧栏，Resizer 在右缘空档）| 面板卡（模块的 PanelHeader + 面板体）| 停靠时的对话卡（dock-in 入场，DockResizer）；折叠态侧栏卡消失，Header 成为面板卡之上的控制条；写入 html.dark 与 --identity。
src/styles.css: 设计令牌与全局规则（见上）；洗色（border/accent/muted/input）的深浅照搬 Laper 的相对关系；--agent 是 AI 的信号色（银灰冷调：光标/发光）；动画令牌 @theme 镜像 shared/motion（--duration-*/--ease-*）；关键帧：bubble-in/thinking/holo/drawer/shimmer、overview-in（标签矩阵）、dock-in（停靠卡入场）、agent-breathe（.agent-glow 边缘发光）、agent-edge/ring/ripple（光标层）、launcher-pulse；层级表：1 卡内热区、2 Popover、3 Tooltip、4 命令面板、5 NavRail 展开层（永远最高），卡片不设 z。
src/assets/logo.png: rail 顶部的应用标（build/icon.png 的 128px 版）。
src/vite-env.d.ts: vite/client 类型引用（静态资源 import）。
src/store/browser.ts: zustand 镜像——snapshot 与壳内一次性请求（rename/identityEditor）；send()/query()；bindBridge()；选择器与 memo 化的 useIdentityTabs/useFavorites/useIdentityFolders。
src/lib/utils.ts: cn()。
src/lib/dnd.ts: 拖拽语义——id 编解码、sectionOf、resolveDrop、sidebarCollision。
src/icons/: Pika 图标库与语义命名层（见其 CLAUDE.md）。
src/components/ui/: shadcn 形态原子（见其 CLAUDE.md）。
src/components/effects/: WebGL 效果层——PrismaticBurst（见其 CLAUDE.md）。
src/shell/: 跨模块的壳——Header、PanelHeader 原语、自绘红绿灯、NavRail、Resizer、EdgePeek、DockResizer（见其 CLAUDE.md）。
src/modules/: 模块注册表与各模块（见其 CLAUDE.md）。
src/overlay/main.tsx: 命令面板页引导（同步 html.dark，挂载 modules/browser/palette/Palette）。
src/chat/: 对话面板本体与镜像 store（见其 CLAUDE.md）。
src/agent/main.tsx: agent 光标层引导（透明底、同步 html.dark）。
src/agent/AgentLayer.tsx: agent 的「手」——临界阻尼弹簧跟随的光标 + 到点涟漪 + 动作标签胶囊 + 沿网页边缘呼吸并有一束光环绕的发光圈；agentPresence/agentCursor 事件驱动。
src/newtab/main.tsx: 新标签页引导。
src/newtab/NewTab.tsx: 极简 NTP——品牌标 + 自动聚焦的地址框，回车用 shared/url 的 resolveInput 在本标签导航。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
