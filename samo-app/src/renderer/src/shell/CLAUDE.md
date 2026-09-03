# shell/
> L2 | 父级: ../../CLAUDE.md

跨模块的壳：窗口控制、顶行、模块导航、侧栏几何。壳不认识标签页——它只知道「当前模块」与「侧栏宽/折叠」，模块的侧栏与面板由 modules/registry 提供。

三层结构（Laper 剧本项目的侧栏体系）：icon navi（NavRail，40px，悬停展开切「维度」）→ 模块侧栏 → 面板。红绿灯自绘（主进程 setWindowButtonVisibility(false) 隐藏原生按钮，保留原生标题栏行为），与侧栏图标、翻页刷新在同一条 40px 基线上。

## 成员清单
Header.tsx: 40px 拖拽行——WindowControls + 侧栏折叠/展开 + 当前模块的头部动作；双击空白处缩放窗口；折叠态绝对定位横贯整窗。
WindowControls.tsx: 自绘红绿灯——12px 圆点、8px 间距、组悬停显示符号、窗口失焦变灰；关闭/最小化/全屏，⌥点击绿灯 = 最大化。
NavRail.tsx: 模块导航——40px 列，悬停 150ms ease-snap 展开到 240px 并换成 panel 表面 + 边线 + 阴影，选中即收回；无 overflow-hidden、折叠态无边框（Laper 的两条教训）；底部品牌标。
Resizer.tsx: 左列右缘拖拽调宽（rAF 节流写回 layout.sidebar）。
EdgePeek.tsx: 折叠态 rail 右侧的 8px 贴边条（悬停 peek）。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
