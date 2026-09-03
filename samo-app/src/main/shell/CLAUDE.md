# shell/
> L2 | 父级: ../CLAUDE.md

窗口几何与视图层叠，不懂标签页语义。四层：底层「后台视图」（agent 标签，被壳遮住但仍绘制）→ 壳视图（React，覆盖全窗）→ 内容视图（当前标签，几何取自 Laper MainLayout：紧贴侧栏、上下右留 8、内缩 1px 露出壳画的面板边线、圆角 11）→ 最上层透明 overlay（命令面板，不显示时不参与命中）。

## 成员清单
window.ts: ShellWindow——BaseWindow（hidden 标题栏、交通灯内嵌）+ shellView + overlayView + contentView 槽位 + background 集合；contentBounds 按侧栏宽度/折叠态算内容矩形，resize 时统一重排；openPalette/closePalette 切 overlay 可见性并转移焦点；setBorderRadius 在支持的平台生效。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
