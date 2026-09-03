# modules/apps/
> L2 | 父级: ../../../CLAUDE.md

应用维度——像一个小 OS 的桌面：侧栏是用户应用的卡片矩阵（一排两张），面板是选中应用的网页（主进程叠上来的视图，与浏览器模块同一套引擎）。本地应用来自主进程对 localhost 端口的扫描，云端应用（Samo 部署）预留；两者用不同图标区分（终端 / 云）。

## 成员清单
AppsSidebar.tsx: Local / Cloud 两组 + 计数 + 重扫；AppCard 走 SidebarButton 选中语言（图标格 + 名称 + localhost:port）；空态提示启动 dev server。
AppsPanel.tsx: 面板体——有打开的应用时渲染空（网页视图在上），否则「Pick an app / No apps yet」。
AppsPanelHeader.tsx: 头部三槽——NavButtons | 当前应用（图标 + 名称 + 短地址）| 在浏览器维度打开。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
