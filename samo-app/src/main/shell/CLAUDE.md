# shell/
> L2 | 父级: ../CLAUDE.md

窗口几何与视图层叠，不懂标签页语义。原生红绿灯用 setWindowButtonVisibility(false) 隐藏（titleBarStyle: hidden 保住圆角、全屏动画、双击缩放），按钮由壳自绘。层叠：底层「后台视图」（所有已加载但未呈现的标签：agent 的、应用的、别的维度/身份的，被壳遮住但仍绘制、始终有真实视口——未挂窗口的视图是 0×0，页面会在 0×0 下布局、之后只重排一半）→ 壳视图（React，覆盖全窗）→ 当前呈现的网页视图 → 网页底部两角的 16×16 圆角遮罩视图。命令面板、AI 药丸与面板、agent 光标层都是子窗口，不在这棵树里。

命中测试铁律（Chromium remote_cocoa 的 BridgedContentView.hitTest）：先查窗口的可拖拽区（所有 WebContentsView 的 `-webkit-app-region: drag` 之并，按注册顺序，壳最先），命中即返回 nil 交给窗口拖拽/双击缩放，之后才查子视图。因此壳里凡是有网页视图或浮层压着的区域必须 `no-drag`（App.tsx 面板体），否则网页收不到任何鼠标、双击变成缩放窗口——最初 launcher 点不动、后来「所有网页都点不动」都是它。视图层级本身由 Chromium 把 NSView 按 views 层级排序（SortSubviews），addChildView 重排即可。

几何取自 Laper ProjectEditorShell：rail 40 → gap 8 → 侧栏卡 → gap 8 → 面板卡，上下右留 8；面板卡顶部是 HEADER_HEIGHT(40) 的模块头部（浏览器/应用：后退前进刷新 · 地址 · 工具），网页视图是直角矩形、贴边渲染（内缩 1px 边线，无内边距、不切内容）。面板的圆角只在底部两角可见：Electron 的圆角四角统一、父 View 又裁不到 WebContentsView、向上藏进头部会切掉页面顶部（试过，用户看到顶部被切），所以只用两块 16×16 的角落遮罩视图盖在网页底部两角——遮罩里一个大 div 靠 box-shadow 扩散画出圆角之外的地板色与 1px 边线（squircle），圆角之内透明露出网页；颜色随 prefers-color-scheme 切换，与 styles.css 的 --sidebar/--border 同值。折叠时顶部让出 40 + 8 的控制条；非浏览器模块或标签矩阵打开时 setContentVisible(false)；停靠对话卡时内容区右侧让出 dockWidth + gap（setDock）。

命中测试教训：NativeWindow::NonClientHitTest 遍历所有网页视图的拖拽区，壳的 `.drag` 会把落在其他视图上的真实按下变成拖窗口——凡是要接受真实点击又压在网页之上的东西，一律做成子窗口（launcher、浮窗、未来的 agent 光标层）。

## 成员清单
window.ts: ShellWindow——BaseWindow（hidden 标题栏、交通灯内嵌）+ shellView + cornerMasks + contentView 槽位 + background 集合 + palette 子窗口；panelCardBounds/contentBounds 按侧栏宽度/折叠态/面板头部算几何，resize 时统一重排（含角落遮罩）；raiseContent 维护命中顺序；openPalette/closePalette 转给 PaletteWindow；dockSlotScreenBounds/contentScreenBounds 给停靠与光标层；zoom 全屏/最大化。
palette-window.ts: PaletteWindow——⌘T 命令面板的透明子窗口（子窗口不受主窗口可拖拽区影响）：打开时铺满主窗口内容区并聚焦，背景幕点击/Esc 即关，关闭即隐藏并把焦点还给主窗口。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
