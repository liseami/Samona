# modules/browser/sidebar/
> L2 | 父级: ../../CLAUDE.md

浏览器模块的 Arc 级侧栏。自上而下（头部、宽度与拖拽调宽属于壳；地址与导航在面板头部）：顶部留白 pt-2 → agent 控制条 → 收藏网格 → 固定网格 → 文件夹与散装标签（分隔线上悬停 Clear）→ agent 分组（每个任务空间一组：Bot + 任务名 + 脉冲点 + Take control / Hand back + 它的标签）；右缘拖拽调宽。下载在资产维度，DevTools 走 ⌥⌘I。

没有「身份」也没有 Space：所有标签共用一套登录态；agent 的任务空间（内部仍是 Identity 记录）只是用户标签之下的分组。唯一的 DndContext 在 BrowserSidebar：每个分区只是登记 sortable/droppable，落点如何变成 `tab.move` 全在 lib/dnd.ts 的 resolveDrop。所有右键菜单都是主进程的原生 Menu（menu.* 命令），需要内联 UI 的动作（重命名/编辑身份）由主进程用 ShellEvent 交回来。输入与建议全在 overlay 的命令面板里，侧栏不再有第二套建议 UI。密度与选中态取自 Laper：行高 32、活动项 = 浮起白卡（bg-card + border + shadow-sm）、悬停 sidebar-accent/66。

## 成员清单
BrowserSidebar.tsx: 容器 + DndContext（PointerSensor 8px、键盘传感器、sidebarCollision）+ onDragEnd 仲裁 + DraggingContext（拖拽中显示空态落点）+ peek 收回。
AgentGroups.tsx: agent 任务空间的分组——组头（Bot / 任务名 / 工作中脉冲点 / Take control 或 Hand back）+ 当前动作标签 + 该空间的标签行（点开即围观）。
AgentBanner.tsx: 围观 agent 任务空间时顶部的控制条（动作标签 + Take control / Hand back）。
IconGrid.tsx: 收藏/固定共用的图标网格（rectSortingStrategy，整块是落点，拖拽中显示虚线空态）。
FavoritesGrid.tsx / PinnedGrid.tsx: 给 IconGrid 不同容器 id 与标签集合。
TabList.tsx: 文件夹 → 分隔线（Clear）→ 散装标签 → New Tab 行（开命令面板）；空白处右键 menu.tabList。
FolderRow.tsx: 文件夹头（折叠箭头 + 着色图标 + 名称/内联重命名 + 计数，本身是落点）+ 成员排序上下文；空文件夹只留一个不可见的落点高度。
TabItem.tsx: 32px 标签行——favicon/标题/声音开关/加载/悬停关闭；双击重命名；中键关闭；右键 menu.tab；可拖拽。
InlineEdit.tsx: 就地重命名输入框（Enter 提交 / Esc 取消 / 失焦提交）。
Favicon.tsx: 站点图标，失败回退地球，新标签页回退品牌「S」。
DragGhost.tsx: DragOverlay 里跟随指针的浮起卡片（标签行）。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
