# shell/
> L2 | 父级: ../CLAUDE.md

窗口几何与视图层叠，不懂标签页语义。原生红绿灯用 setWindowButtonVisibility(false) 隐藏（titleBarStyle: hidden 保住圆角、全屏动画、双击缩放），按钮由壳自绘。层叠：底层「后台视图」（所有已加载但未呈现的标签：agent 的、应用的、别的维度/身份的，被壳遮住但仍绘制、始终有真实视口——未挂窗口的视图是 0×0，页面会在 0×0 下布局、之后只重排一半）→ 壳视图（React，覆盖全窗）→ 当前呈现的网页视图 → 最上层 overlay 视图（平时只有面板头部条那么大，承载面板头部；⌘T 时铺满全窗承载命令面板）。AI 浮层与 agent 光标层是子窗口，不在这棵树里。

几何取自 Laper ProjectEditorShell：rail 40 → gap 8 → 侧栏卡 → gap 8 → 面板卡，上下右留 8；面板卡顶部是 HEADER_HEIGHT(40) 的模块头部（浏览器/应用：后退前进刷新 · 地址 · 工具），网页视图贴边渲染（内缩 1px 边线，无内边距），下缘随面板圆角 13。上缘直角的做法：Electron 的圆角四角统一、macOS 上父 View 的圆角也裁不到 WebContentsView（独立 NSView），于是让网页视图向上多伸一个半径藏到头部之下，而头部住在压在网页之上的 overlay 视图里（HeaderLayer）盖住那一截；壳视图里同一头部保留一份作几何占位与命中兜底，两份逐 class 相同。折叠时顶部让出 40 + 8 的控制条；非浏览器模块或标签矩阵打开时 setContentVisible(false)；停靠对话卡时内容区右侧让出 dockWidth + gap（setDock）。

命中测试教训：NativeWindow::NonClientHitTest 遍历所有网页视图的拖拽区，壳的 `.drag` 会把落在其他视图上的真实按下变成拖窗口——凡是要接受真实点击又压在网页之上的东西，一律做成子窗口（launcher、浮窗、未来的 agent 光标层）。

## 成员清单
window.ts: ShellWindow——BaseWindow（hidden 标题栏、交通灯内嵌）+ shellView + overlayView + contentView 槽位 + background 集合；panelCardBounds/headerStrip/contentBounds 按侧栏宽度/折叠态/面板头部算几何，resize 时统一重排并向 overlay 推 overlayLayout；openPalette/closePalette 让 overlay 在「头部条」与「全窗」之间切换并转移焦点（raise 抬到最上）；dockSlotScreenBounds/contentScreenBounds 给编舞与光标层；zoom 全屏/最大化。
animate.ts: animateBounds(win, to, {duration, ease, signal})——按 shared/motion 令牌曲线逐帧 setBounds 的窗口几何动画（macOS 自带 setBounds(animate) 曲线不可控）。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
