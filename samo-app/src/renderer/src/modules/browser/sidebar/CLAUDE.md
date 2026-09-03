# modules/browser/sidebar/
> L2 | 父级: ../../CLAUDE.md

浏览器模块的 Arc 级侧栏。自上而下（头部、宽度与拖拽调宽属于壳）：地址展示条（点击开命令面板）→ agent 控制条 → 收藏网格（跨身份）→ 固定网格（本身份）→ 文件夹与散装标签（分隔线上悬停 Clear）→ 底部身份栏（身份 pip + 新建 | 下载 + DevTools）；右缘拖拽调宽。

「身份」（Identity）取代 Arc 的 Space：一个身份 = 一套独立的登录态（session 分区）+ 它名下的标签；图标只用 Pika（禁止 emoji）。唯一的 DndContext 在 BrowserSidebar：每个分区只是登记 sortable/droppable，落点如何变成 `tab.move`/`identity.reorder` 全在 lib/dnd.ts 的 resolveDrop。所有右键菜单都是主进程的原生 Menu（menu.* 命令），需要内联 UI 的动作（重命名/编辑身份）由主进程用 ShellEvent 交回来。输入与建议全在 overlay 的命令面板里，侧栏不再有第二套建议 UI。密度与选中态取自 Laper：行高 32、活动项 = 浮起白卡（bg-card + border + shadow-sm）、悬停 sidebar-accent/66。

## 成员清单
BrowserSidebar.tsx: 容器 + DndContext（PointerSensor 8px、键盘传感器、sidebarCollision）+ onDragEnd 仲裁 + DraggingContext（拖拽中显示空态落点）+ 双指横滑 + peek 收回。
useSpaceSwipe.ts: 双指横滑切身份（轴锁定、阈值 50、每手势一次）。
Omnibox.tsx: 地址展示条——显示当前标签短地址与 ⌘L/⌘T 键帽，点击打开命令面板。
AgentBanner.tsx: agent 持有的身份显示动作标签与 Take control / Hand back。
IconGrid.tsx: 收藏/固定共用的图标网格（rectSortingStrategy，整块是落点，拖拽中显示虚线空态）。
FavoritesGrid.tsx / PinnedGrid.tsx: 给 IconGrid 不同容器 id 与标签集合。
TabList.tsx: 文件夹 → 分隔线（Clear）→ 散装标签 → New Tab 行（开命令面板）；空白处右键 menu.tabList。
FolderRow.tsx: 文件夹头（折叠箭头 + 着色图标 + 名称/内联重命名 + 计数，本身是落点）+ 成员排序上下文；空文件夹只留一个不可见的落点高度。
TabItem.tsx: 32px 标签行——favicon/标题/声音开关/加载/悬停关闭；双击重命名；中键关闭；右键 menu.tab；可拖拽。
InlineEdit.tsx: 就地重命名输入框（Enter 提交 / Esc 取消 / 失焦提交）。
Favicon.tsx: 站点图标，失败回退地球，新标签页回退品牌「S」。
DragGhost.tsx: DragOverlay 里跟随指针的浮起卡片（标签行 / 身份 pip）。
IdentityBar.tsx: 底部身份栏——身份 pip（Pika 图标、可拖排序、活动项白卡 + 强调色着色、agent 角标、也是「拖标签到此身份」的落点）+ 新建；右侧下载浮层与 DevTools。
IdentityEditor.tsx: 锚在身份栏上的 Popover——名称、Pika 图标网格、七色色板即时生效，删除（至少保留一个）。
DownloadsPopover.tsx: 下载列表浮层（进度、打开、在访达中显示、取消、清空）。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
