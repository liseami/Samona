# shell/
> L2 | 父级: ../../CLAUDE.md

跨模块的壳：窗口控制、顶行、模块导航、侧栏几何、面板头部原语。壳不认识标签页——它只知道「当前模块」与「侧栏宽/折叠」，模块的侧栏、面板与面板头部由 modules/registry 提供。

三层结构（Laper ProjectEditorShell）：页面底 bg-sidebar，一行 gap-2 pt-2 pb-2 pl-0 pr-2：NavRail（40px，与底同色，悬停展开成卡切「维度」）| 侧栏卡（SoftPanel：bg-panel rounded-2xl border shadow-sm，Header 头部 + 模块侧栏）| 面板卡（同一质感：模块的 PanelHeader + 面板体）。两条头部同高 HEADER_HEIGHT（40，Laper 的 h-12 压低）：侧栏卡 Header（红绿灯在左、折叠钮在右）、面板卡 PanelHeader（导航 · 地址 · 工具）；rail 没有 logo 行，模块列表从顶部排下。红绿灯自绘（主进程 setWindowButtonVisibility(false) 隐藏原生按钮，保留原生标题栏行为）。折叠态侧栏卡消失，Header 成为面板卡之上的独立控制条。

## 成员清单
Header.tsx: 侧栏卡的头部（border-b，高 HEADER_HEIGHT）——WindowControls（左）+ 侧栏折叠/展开（右）；双击空白处缩放窗口；折叠态成为面板卡之上的控制条。
PanelHeader.tsx: 面板卡头部原语（Laper PanelHeader 三槽）：title 左 / center 绝对居中（clamp 180px–560px）/ actions 右；drag 可拖窗口，槽内 no-drag。
WindowControls.tsx: 自绘红绿灯——12px 圆点、8px 间距、组悬停显示符号、窗口失焦变灰；关闭/最小化/全屏，⌥点击绿灯 = 最大化。
NavRail.tsx: 模块导航（z-5，全应用最高层）——40px 列与页面底同色，无 logo 行、模块列表从顶部 pt-2 自然排下，底部 UserButton；悬停 150ms ease-snap 展开到 240px 并换成 panel 表面 + 边线 + 阴影，选中即收回；无 overflow-hidden、折叠态无边框（Laper 的两条教训）。
Resizer.tsx: 侧栏卡与面板卡之间 8px 空档上的拖拽热区（rAF 节流写回 layout.sidebar）。
EdgePeek.tsx: 折叠态 rail 与面板卡之间空档上的贴边条（悬停 peek），从控制条下方（top-12）开始。
DockResizer.tsx: 停靠对话卡左缘的拖宽热区。
UserButton.tsx: rail 底部的账户入口——折叠态 20px 头像占图标位（Laper CollapsedUserButton），展开态项目页极简用户卡（Laper ProjectUserButton：bg-background 圆角卡 + 36px 头像 + 昵称 + 等级 · 积分 + 下拉箭头）；未登录折叠态灰头像、展开态 Sign in。点击按当下按钮位置算锚点、发 userMenu.open 把菜单开进 overlay 子窗口，主进程收起时发 overlayClosed 复位，打开期间通知 rail 保持展开；登录暂为本地 mock。
ContentHole.tsx: 面板体里「网页该出现的位置」——铺满的空元素，ResizeObserver 量出矩形发 layout.contentBounds；Electron 宿主忽略（自己算），Chromium fork 宿主据此摆放 contents 容器。
UserMenuOverlay.tsx: 住在 overlay 子窗口（overlay.html）里的用户菜单宿主——收到 openUserMenu 在锚点弹出 UserMenu，全窗透明幕/Esc/菜单动作即关（palette.close）。为什么在子窗口：网页是原生视图、永远盖住壳的 DOM，壳里 Portal 的菜单/子菜单一进网页区域（子菜单右飞、或侧栏折叠时）就点不到，z-index 无解。
UserMenu.tsx: Laper UserMenu 的 Samo 版——账户卡（头像 + 昵称 + 等级键帽 + Upgrade）/ Credits / Add credits / Invite friends / Samo docs / Contact us / Language（悬停子菜单）/ Appearance（悬停子菜单，真的切 nativeTheme）/ Settings / Log out；menu-pop 入场、submenu-slide 子菜单（间隙用 padding 桥，指针穿过时不收起）；在 UserMenuOverlay 里渲染；账号体系接上前多数动作是占位。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
