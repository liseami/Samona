# modules/appstore/
> L2 | 父级: ../CLAUDE.md

应用商店维度：别人用 Samo 发布的应用在这里陈列，「Add」把它收进自己的应用（Samo 的产品主张：作品像 git 仓库一样 Local / Private / Public，商店就是 Public 的集市）。与 apps 维度同一视觉语言——居中 720 列、中性灰、SidebarButton 选中语言——但它不是网页：主进程在这个模块下藏起网页视图，面板全由 React 渲染。当前全部是 mock：数据在 mock.ts，「添加」只落本地状态；接真实商店时换 mock.ts 的来源、把 add 换成 apps.install 命令，其余不动。

## 成员清单
mock.ts: StoreApp/StoreCategory 类型、STORE_CATEGORIES、STORE_APPS（14 个假应用）、storeTone()（logo 的四档中性色阶，按 id 稳定）。
store.ts: useAppStore（filter：all/featured/added/分类；query；added 落 localStorage samo.appstore.added；add/remove）与 visibleApps() 选择器。
StoreLogo.tsx: StoreLogo（首字母圆角方 logo）与 AddButton（未添加 secondary + Plus，已添加 outline + 勾，点击互切）。
StoreSidebar.tsx: 侧栏——Discover（All / Featured / Added 计数）+ Categories 分组。
StorePanel.tsx: 面板——页头（标题 + 一句话 + 搜索）→ Featured 三张卡（仅 all 且无搜索时）→ 按分类分组的列表卡，行右侧永远是 Add；空态给去处。
StorePanelHeader.tsx: 头部——左标题、中当前筛选，无导航按钮。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
