# shell/
> L2 | 父级: ../CLAUDE.md

窗口几何与视图层叠，不懂标签页语义。原生红绿灯用 setWindowButtonVisibility(false) 隐藏（titleBarStyle: hidden 保住圆角、全屏动画、双击缩放），按钮由壳自绘。层叠：底层「后台视图」（agent 标签，被壳遮住但仍绘制）→ 壳视图（React，覆盖全窗）→ 当前标签的网页视图 → 最上层透明 overlay（命令面板，不显示时不参与命中）。AI 浮层与 agent 光标层是子窗口，不在这棵树里。

几何取自 Laper ProjectEditorShell：rail 40 → gap 8 → 侧栏卡 → gap 8 → 面板卡，上下右留 8；面板卡顶部是 HEADER_HEIGHT(40) 的模块头部（浏览器/应用：后退前进刷新 · 地址 · 工具），网页视图从头部下方开始、四周内缩 PAGE_INSET(6) 成一张圆角 10 的卡。为什么不是「上直下圆」：Electron 的圆角四角统一，头部在壳里、网页之上，而 macOS 上父 View 的圆角裁不到 WebContentsView（它是独立 NSView）——所以让网页卡四角同圆并留出间距，圆得理直气壮。折叠时顶部让出 40 + 8 的控制条；非浏览器模块或标签矩阵打开时 setContentVisible(false)；停靠对话卡时内容区右侧让出 dockWidth + gap（setDock）。

命中测试教训：NativeWindow::NonClientHitTest 遍历所有网页视图的拖拽区，壳的 `.drag` 会把落在其他视图上的真实按下变成拖窗口——凡是要接受真实点击又压在网页之上的东西，一律做成子窗口（launcher、浮窗、未来的 agent 光标层）。

## 成员清单
window.ts: ShellWindow——BaseWindow（hidden 标题栏、交通灯内嵌）+ shellView + overlayView + contentView 槽位 + background 集合；contentBounds 按侧栏宽度/折叠态/面板头部算内容矩形，resize 时统一重排；dockSlotScreenBounds 给编舞；openPalette/closePalette 切 overlay 可见性并转移焦点（raise 抬到最上）；zoom 全屏/最大化。
animate.ts: animateBounds(win, to, {duration, ease, signal})——按 shared/motion 令牌曲线逐帧 setBounds 的窗口几何动画（macOS 自带 setBounds(animate) 曲线不可控）。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
