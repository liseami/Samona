# modules/apps/
> L2 | 父级: ../../../CLAUDE.md

应用维度——像一个小 OS 的桌面：侧栏顶部是固定区（一排最多 4 个圆角方形 logo），下面是应用列表（与标签行同一语言），面板是选中应用的网页（主进程叠上来的视图，与浏览器模块同一套引擎）。logo 优先用网页的 favicon，没有时回退到本地（终端）/ 云端（云）图标；右键原生菜单固定/取消固定、在浏览器打开、复制地址、重扫。本地应用来自主进程对 localhost 端口的扫描，云端应用（Samo 部署）预留。

## 成员清单
AppsSidebar.tsx: 固定区（grid-cols-4，正方形格，offline 半透明）+ Apps 列表（AppRow：logo 16 + 名称 + :port/cloud）+ 计数与重扫；右键 menu.app；空态提示启动 dev server。
AppLogo.tsx: 圆角方形 logo——favicon <img>，失败或缺失回退 AppLocal/AppCloud。
AppsPanel.tsx: 面板体——有打开的应用时渲染空（网页视图在上），否则「Pick an app / No apps yet」。
AppsPanelHeader.tsx: 头部三槽——NavButtons | 当前应用（AppLogo + 名称 + 短地址）| 在浏览器维度打开。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
