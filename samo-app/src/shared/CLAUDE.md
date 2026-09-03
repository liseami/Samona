# shared/
> L2 | 父级: ../../CLAUDE.md

主进程、preload、渲染进程三方共享的契约层。这里没有运行时依赖、没有 Electron、没有 React——只有类型、常量与纯函数，所以任何一方都能 import 而不把另一方的世界拖进来。真相只有一份：主进程按这些类型写，其余两方按这些类型读。

## 成员清单
model.ts: 领域模型。Identity 同时是 Arc 式工作区与 ego 的 task identity（数字 id、三值 ownership），Folder 是 Identity 内可折叠着色的分组，Tab 是 WebContentsView 的语义投影（id 即 CDP targetId；identityId=null 即跨 Identity 的收藏；pinned/folderId 定分区；customTitle/muted/audible/lastActiveAt），Download 是下载项，Suggestion 是地址栏建议。含 phi 六色 + agent 靛蓝的调色板、NEW_TAB_URL、侧栏宽度边界、tabTitle()。
ipc.ts: 进程间契约。CHANNELS 五条通道（invoke/query/getState/state/event），Command 可判别联合是渲染层的唯一命令出口（标签/文件夹/Identity/原生菜单/下载/布局），Query 是有返回值的查询（suggest），TabTarget 是统一的移动落点，ShellEvent 是主进程推给壳的一次性事件（聚焦地址栏/重命名/编辑 Identity），SamoBridge 是 preload 暴露面的类型。
url.ts: 地址语义。resolveInput 把地址栏输入判定为 URL / 本机地址 / 搜索，displayUrl 产出给人看的短形式；主进程导航与渲染层展示共用，杜绝两套判定。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
