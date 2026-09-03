# modules/apps/
> L2 | 父级: ../../../CLAUDE.md

应用维度——像一个小 OS：面板默认是桌面 AppsDashboard（居中一列：应用图标行 → 用户主页 → 指标 → 一年活跃度热力图 → Tokens 面积图 → Agents 柱图，数据先 mock），点开应用后面板是它的网页（主进程叠上来的应用视图：不落盘、不进浏览器、应用不在跑就自动关闭——本地应用不积累标签）；侧栏顶部是固定区（一排最多 4 个圆角方形 logo），下面是应用列表。logo 优先用网页的 favicon，没有时回退到本地（终端）/ 云端（云）图标；右键原生菜单固定/取消固定、在浏览器打开、复制地址、重扫。本地应用来自主进程对 localhost 端口的扫描，云端应用（Samo 部署）预留。

## 成员清单
AppsSidebar.tsx: 固定区（grid-cols-4，正方形格，offline 半透明）+ Apps 列表（AppRow：logo 16 + 名称 + :port/cloud）+ 计数与重扫；右键 menu.app；空态提示启动 dev server。
AppLogo.tsx: 圆角方形 logo——favicon <img>，失败或缺失回退 AppLocal/AppCloud。
AppsPanel.tsx: 面板体——有打开的应用时渲染空（应用视图在上），否则渲染 AppsDashboard。
AppsDashboard.tsx: 桌面——AppsDock（图标行，点开即用，右键菜单）/ ProfileHeader（头像 + 名字 + 句柄 + Share/Edit）/ StatsRow / Heatmap（53×7 点阵，月份在上周几在左）/ AreaChart（Tokens，内联 SVG）/ BarChart（Agents）；配色只用前景色透明度阶。
mock.ts: MOCK_PROFILE / MOCK_STATS / mockHeatmap()（xorshift32 确定性）/ MOCK_TOKENS / MOCK_AGENTS——接入 Samo 账号与 agent 遥测前的假数据源。
AppsPanelHeader.tsx: 头部三槽——NavButtons | 当前应用（AppLogo + 名称 + 短地址，桌面时显示 Desktop）| 回桌面。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
