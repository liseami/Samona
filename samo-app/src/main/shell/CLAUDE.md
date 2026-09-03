# shell/
> L2 | 父级: ../CLAUDE.md

窗口几何与视图层叠，不懂标签页语义。三层：底层「后台视图」（agent 标签，被壳遮住但仍绘制）→ 壳视图（React，覆盖全窗、透明背景由 CSS 涂色）→ 顶层内容视图（当前标签，圆角 8、四周留 8 的卡片，取自 phi 的 edgesSpacing）。

## 成员清单
window.ts: ShellWindow——BaseWindow（hidden 标题栏、交通灯内嵌）+ shellView + contentView 槽位 + background 集合；contentBounds 按侧栏宽度/折叠态算内容矩形，resize 时统一重排；setBorderRadius 在支持的平台生效。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
