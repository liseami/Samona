# components/sidebar/
> L2 | 父级: ../../../CLAUDE.md

Arc 级的侧栏管理层。自上而下：头部（拖拽区 + 交通灯留白 + 折叠 + 后退/前进/刷新）→ Space 条（可拖排序、pip 也是标签落点、双击/右键编辑）→ 地址/命令框（建议列表）→ agent 控制条 → 收藏网格（跨 Space）→ 固定网格（本 Space）→ 文件夹与散装标签（分隔线上悬停 Clear）→ 底栏（下载/新建 Space/DevTools）；右缘拖拽调宽。

唯一的 DndContext 在 Sidebar：每个分区只是登记 sortable/droppable，落点如何变成 `tab.move`/`space.reorder` 全在 lib/dnd.ts 的 resolveDrop。所有右键菜单都是主进程的原生 Menu（menu.* 命令），需要内联 UI 的动作（重命名/编辑 Space）由主进程用 ShellEvent 交回来。密度与选中态取自 Laper：行高 32、活动项 = 浮起白卡（bg-card + border + shadow-sm）、悬停 sidebar-accent/66。

## 成员清单
Sidebar.tsx: 容器 + DndContext（PointerSensor 8px、键盘传感器、sidebarCollision）+ onDragEnd 仲裁 + DraggingContext（拖拽中显示空态落点）+ 双指横滑 + peek 收回。
useSpaceSwipe.ts: 双指横滑切 Space（轴锁定、阈值 50、每手势一次）。
SidebarHeader.tsx: 40px 拖拽行，后退/前进/刷新（加载中变停止）。
SpacesStrip.tsx: Space pip 横排（useSortable），活动项白卡 + 底部强调色短线，agent 角标（绿=工作中/橙=用户接管/灰=空闲），尾部 + 新建并打开编辑器。
SpaceEditor.tsx: 锚在 Space 条上的 Popover——名称、emoji 网格、七色色板即时生效，删除（至少保留一个）。
Omnibox.tsx: 地址/命令框——100ms 防抖 query suggest，↑↓/Enter/⌘Enter/Esc；三模式 newTab/editUrl/searchTabs；用 ref 兜底 rAF 聚焦时的闭包过期。
AgentBanner.tsx: agent 持有的 Space 显示动作标签与 Take control / Hand back。
IconGrid.tsx: 收藏/固定共用的图标网格（rectSortingStrategy，整块是落点，拖拽中显示虚线空态）。
FavoritesGrid.tsx / PinnedGrid.tsx: 给 IconGrid 不同容器 id 与标签集合。
TabList.tsx: 文件夹 → 分隔线（Clear）→ 散装标签 → New Tab 行；空白处右键 menu.tabList。
FolderRow.tsx: 文件夹头（折叠箭头 + 着色图标 + 名称/内联重命名 + 计数，本身是落点）+ 成员排序上下文。
TabItem.tsx: 32px 标签行——favicon/标题/声音开关/加载/悬停关闭；双击重命名；中键关闭；右键 menu.tab；可拖拽。
InlineEdit.tsx: 就地重命名输入框（Enter 提交 / Esc 取消 / 失焦提交）。
Favicon.tsx: 站点图标，失败回退地球，新标签页回退品牌「S」。
DragGhost.tsx: DragOverlay 里跟随指针的浮起卡片。
SidebarFooter.tsx: 底栏——下载浮层、新建 Space、DevTools。
DownloadsPopover.tsx: 下载列表浮层（进度、打开、在访达中显示、取消、清空）。
Resizer.tsx: 右缘拖拽调宽（rAF 节流写回 layout.sidebar）。
EdgePeek.tsx: 折叠态的贴边热区（悬停 peek）与顶部展开按钮。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
