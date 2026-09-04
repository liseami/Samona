# patches/
> L2 | 父级: ../CLAUDE.md

Samo 对上游 Chromium 的补丁，`git format-patch` 格式，按文件名序号顺序应用（scripts/apply-patches.sh）。纪律（Brave）：能放独立文件就不改上游文件；每个补丁只做一件事、有可读的 Subject；rebase 时冲突集中在这里。目前为空——第一批将是：品牌（Samo 名字/图标/bundle id）、WebUI 注册（chrome://samo 壳）、顶栏替换（隐藏 Chrome 自带标签栏与工具栏）。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
