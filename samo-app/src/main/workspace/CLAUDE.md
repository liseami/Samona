# workspace/
> L2 | 父级: ../CLAUDE.md

「工作区」维度的主进程侧：一个工作区就是本机的一个目录。侧栏是目录列表，面板是这个目录的对话（Codex 式）；对话线程用 workspaceId 绑定目录，目录路径进入 agent 的系统提示。这是 agent 在本机目录里工作的入口——读写文件、跑命令的工具后续接在这里。

## 成员清单
service.ts: WorkspaceService——add()（dialog.showOpenDialog 选目录，已存在则选中）、remove(id)、select(id)（store.setActiveWorkspace + chat.openWorkspaceThread）、reveal(id)（访达显示）、currentPath()；列表与选中落盘 userData/workspaces.json。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
