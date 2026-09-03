# shell/
> L2 | 父级: ../../CLAUDE.md

跨模块的壳：窗口控制、顶行、模块导航、侧栏几何。壳不认识标签页——它只知道「当前模块」与「侧栏宽/折叠」，模块的侧栏与面板由 modules/registry 提供。

三层结构（Laper ProjectEditorShell）：页面底 bg-sidebar，一行 gap-2 pt-2 pb-2 pl-0 pr-2：NavRail（40px，与底同色，悬停展开成卡切「维度」）| 侧栏卡（SoftPanel：bg-panel rounded-2xl border shadow-sm，Header h-12 头部 + 模块侧栏）| 面板卡（同一质感）。红绿灯自绘（主进程 setWindowButtonVisibility(false) 隐藏原生按钮，保留原生标题栏行为），住在侧栏卡头部，与折叠、翻页刷新同一条 48px 基线，rail 的 logo 行同高。折叠态侧栏卡消失，Header 成为面板卡之上的独立控制条。

## 成员清单
Header.tsx: 侧栏卡的 h-12 头部（border-b）——WindowControls + 侧栏折叠/展开 + 当前模块的头部动作；双击空白处缩放窗口；折叠态成为面板卡之上的控制条。
WindowControls.tsx: 自绘红绿灯——12px 圆点、8px 间距、组悬停显示符号、窗口失焦变灰；关闭/最小化/全屏，⌥点击绿灯 = 最大化。
NavRail.tsx: 模块导航（z-5，全应用最高层）——40px 列与页面底同色，顶部 h-12 logo 行（assets/logo.png）与侧栏卡头部对齐；悬停 150ms ease-snap 展开到 240px 并换成 panel 表面 + 边线 + 阴影，选中即收回；无 overflow-hidden、折叠态无边框（Laper 的两条教训）。
Resizer.tsx: 侧栏卡与面板卡之间 8px 空档上的拖拽热区（rAF 节流写回 layout.sidebar）。
EdgePeek.tsx: 折叠态 rail 与面板卡之间空档上的贴边条（悬停 peek）。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
