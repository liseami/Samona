# ipc/
> L2 | 父级: ../CLAUDE.md

渲染层 → 主进程的唯一命令与查询入口。Command/Query 是可判别联合（定义在 shared/ipc.ts），这里各是一个穷尽的 switch；新增能力 = 新增联合成员 + 一个 case，编译器保证不漏。反向只有两条通道：store 快照全量推送与一次性 ShellEvent。

## 成员清单
handlers.ts: registerIpc({engine,downloads,menus,window})——invoke 分发到 engine/downloads/menus/window（palette.open/close），query.suggest 合并「打开的标签 + 历史 + 直达/搜索」（tabsOnly 供 ⇧⌘A），getState 与 state 推送。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
