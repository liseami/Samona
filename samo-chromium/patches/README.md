# patches/
> L2 | 父级: ../CLAUDE.md

Samo 对上游 Chromium 的补丁，`git format-patch` 格式，按文件名序号顺序应用（scripts/apply-patches.sh）。纪律（Brave）：能放独立文件就不改上游文件；每个补丁只做一件事、有可读的 Subject；rebase 时冲突集中在这里。格式是统一 diff（a/ b/ 前缀），由真实上游文件生成。0001 注册 chrome://samo（chrome_web_ui_configs.cc 两行）；0002 //chrome/browser/ui 依赖 //samo:webui；0003 resources.pak 合入 samo_resources.pak（chrome_paks.gni）。后续：品牌、顶栏替换。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
