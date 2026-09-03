# shell/
> L2 | 父级: ../../CLAUDE.md

跨模块的壳：窗口控制、顶行、模块导航、侧栏几何、面板头部原语。壳不认识标签页——它只知道「当前模块」与「侧栏宽/折叠」，模块的侧栏、面板与面板头部由 modules/registry 提供。

三层结构（Laper ProjectEditorShell）：页面底 bg-sidebar，一行 gap-2 pt-2 pb-2 pl-0 pr-2：NavRail（40px，与底同色，悬停展开成卡切「维度」）| 侧栏卡（SoftPanel：bg-panel rounded-2xl border shadow-sm，Header 头部 + 模块侧栏）| 面板卡（同一质感：模块的 PanelHeader + 面板体）。三条头部同高 HEADER_HEIGHT（40，Laper 的 h-12 压低）：rail 的 logo 行、侧栏卡 Header（红绿灯在左、折叠钮在右）、面板卡 PanelHeader（导航 · 地址 · 工具）。红绿灯自绘（主进程 setWindowButtonVisibility(false) 隐藏原生按钮，保留原生标题栏行为）。折叠态侧栏卡消失，Header 成为面板卡之上的独立控制条。

## 成员清单
Header.tsx: 侧栏卡的头部（border-b，高 HEADER_HEIGHT）——WindowControls（左）+ 侧栏折叠/展开（右）；双击空白处缩放窗口；折叠态成为面板卡之上的控制条。
PanelHeader.tsx: 面板卡头部原语（Laper PanelHeader 三槽）：title 左 / center 绝对居中（clamp 180px–560px）/ actions 右；drag 可拖窗口，槽内 no-drag。
WindowControls.tsx: 自绘红绿灯——12px 圆点、8px 间距、组悬停显示符号、窗口失焦变灰；关闭/最小化/全屏，⌥点击绿灯 = 最大化。
NavRail.tsx: 模块导航（z-5，全应用最高层）——40px 列与页面底同色，顶部 logo 行（assets/logo.png，高 HEADER_HEIGHT）与侧栏卡头部对齐，底部 UserButton；悬停 150ms ease-snap 展开到 240px 并换成 panel 表面 + 边线 + 阴影，选中即收回；无 overflow-hidden、折叠态无边框（Laper 的两条教训）。
Resizer.tsx: 侧栏卡与面板卡之间 8px 空档上的拖拽热区（rAF 节流写回 layout.sidebar）。
EdgePeek.tsx: 折叠态 rail 与面板卡之间空档上的贴边条（悬停 peek），从控制条下方（top-12）开始。
DockResizer.tsx: 停靠对话卡左缘的拖宽热区。
UserButton.tsx: rail 底部的账户入口（Laper CollapsedUserButton + UserButton 合体）——已登录：20px 头像占图标位、展开态昵称 + 等级 + 下拉箭头，点击用 Popover 向右弹出 UserMenu；未登录：灰头像占位 / 展开态 Log in，点击登录（暂为本地 mock）。
UserMenu.tsx: Laper UserMenu 的 Samo 版——账户卡（头像 + 昵称 + 等级键帽 + Upgrade）/ Credits / Add credits / Invite friends / Samo docs / Contact us / Language（悬停子菜单）/ Appearance（悬停子菜单，真的切 nativeTheme）/ Settings / Log out；menu-pop 入场、submenu-slide 子菜单；账号体系接上前多数动作是占位。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
