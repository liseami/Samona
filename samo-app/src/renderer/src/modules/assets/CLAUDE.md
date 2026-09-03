# modules/assets/
> L2 | 父级: ../../../CLAUDE.md

资产维度——用户在 Samo 里得到的东西都在这里陈列：下载的文件、未来 Samo AI 生成的图片/文件/页面。侧栏是来源 tab（Downloads / Generated），面板按 tab 陈列。浏览器侧栏不再有下载浮层与底栏。

## 成员清单
store.ts: useAssetsTab（当前 tab）与 ASSET_TABS（标签与说明）。
AssetsSidebar.tsx: 两个 tab 行（图标 + 名称 + 说明 + 计数，下载进行中脉冲点）。
AssetsPanel.tsx: Downloads = 卡片列表（文件名点击打开、进度条、状态与大小、来源地址、访达显示、取消）；Generated = 空态。
AssetsPanelHeader.tsx: 中 tab 名；右 Clear。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
