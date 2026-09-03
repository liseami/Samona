# shell/
> L2 | 父级: ../CLAUDE.md

窗口几何与视图层叠，不懂标签页语义。原生红绿灯用 setWindowButtonVisibility(false) 隐藏（titleBarStyle: hidden 保住圆角、全屏动画、双击缩放），按钮由壳自绘。四层：底层「后台视图」（agent 标签，被壳遮住但仍绘制）→ 壳视图（React，覆盖全窗）→ 内容视图（当前标签，几何取自 Laper ProjectEditorShell：rail 40 → gap 8 → 侧栏卡 → gap 8 → 面板卡，上下右留 8，内缩 1px 露出壳画的边线、圆角 13；折叠时顶部让出 48px 控制条；非浏览器模块时 setContentVisible(false)）→ 最上层透明 overlay（命令面板，不显示时不参与命中）。

## 成员清单
window.ts: ShellWindow——BaseWindow（hidden 标题栏、交通灯内嵌）+ shellView + overlayView + contentView 槽位 + background 集合；contentBounds 按侧栏宽度/折叠态算内容矩形，resize 时统一重排；openPalette/closePalette 切 overlay 可见性并转移焦点；zoom 全屏/最大化；setBorderRadius 在支持的平台生效。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
