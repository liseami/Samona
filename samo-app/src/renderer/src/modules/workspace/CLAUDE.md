# modules/workspace/
> L2 | 父级: ../../../CLAUDE.md

工作区维度——一个工作区就是本机的一个目录（Codex / Claude Code 的心智）：侧栏是目录列表，面板是这个目录的对话。对话真相在主进程 ChatStore，线程用 workspaceId 绑定目录，目录路径进入 agent 的系统提示；agent 在目录里读写与执行的工具是下一步。

## 成员清单
WorkspaceSidebar.tsx: Workspaces 计数 + Add folder（原生目录选择器）；WorkspaceRow（Folder/FolderOpen + 目录名 + ~ 路径），右键 menu.workspace；空态引导。
WorkspacePanel.tsx: 选中工作区 → 整面 bg-card 的 ChatPanel variant=workspace（消息列与输入卡 760px 固定宽度居中）；否则「Pick a workspace」空态。
WorkspacePanelHeader.tsx: 三槽——空 | 当前工作区（名 + 路径）| 新对话（重新选中即切回该工作区的线程）。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
