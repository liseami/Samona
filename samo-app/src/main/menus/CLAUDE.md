# menus/
> L2 | 父级: ../CLAUDE.md

原生右键菜单。选择 Electron Menu 而非 Radix 浮层，因为它天然浮在 WebContentsView 之上且与系统观感一致；代价是需要内联 UI 的动作（重命名、编辑 Space）得用 ShellEvent 交回渲染层，交回前先把 OS 焦点挪回壳。

## 成员清单
context-menu.ts: ContextMenus——tab（重命名/固定/收藏/复制/移到 Space/加入文件夹/静音/复制 URL/关闭系列）、space（编辑/新建/清空/删除，删除经 dialog 确认）、folder（重命名/颜色/折叠/新标签/关闭全部/删除）、tabList（新标签/新文件夹/重开/清空）。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
