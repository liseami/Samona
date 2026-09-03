# shared/
> L2 | 父级: ../../CLAUDE.md

主进程、preload、渲染进程三方共享的契约层。这里没有运行时依赖、没有 Electron、没有 React——只有类型、常量与纯函数，所以任何一方都能 import 而不把另一方的世界拖进来。真相只有一份：主进程按这些类型写，其余两方按这些类型读。

## 成员清单
model.ts: 领域模型。Identity 只是内部工作区（恰有一个用户主工作区 + agent 的任务空间；不再按工作区分割登录态，PRIMARY_PARTITION 唯一），Folder 是 Identity 内可折叠着色的分组，Tab 是 WebContentsView 的语义投影（id 即 CDP targetId；identityId=null 即跨 Identity 的收藏；pinned/folderId 定分区；appId 标记应用维度的标签，不进浏览器侧栏；customTitle/muted/audible/lastActiveAt），Download 是下载项，Suggestion 是地址栏建议。Layout 含 module/侧栏宽与折叠/overview（Safari 式标签矩阵），AppEntry 是应用维度的一项（visibility local/private/public 像 git 仓库，APP_VISIBILITIES 给标签与说明；favicon 作 logo；pinned/offline），Workspace 是工作区维度的一项（本机目录：name/path），BrowserSnapshot 带 workspaces/activeWorkspaceId、hoverUrl（悬停链接）与 find（页内查找结果），BrowserSnapshot 带 apps/activeAppId，HEADER_HEIGHT 是三条头部的共同高度。含 phi 六色 + agent 靛蓝的调色板、NEW_TAB_URL、侧栏宽度边界、tabTitle()。
ipc.ts: 进程间契约。CHANNELS 七条通道（invoke/query/getState/state/event/getChat/chat），Command 可判别联合是渲染层的唯一命令出口（标签/文件夹/任务空间 activate·takeControl·handBack/应用/工作区 add·select·remove/页内查找 find.*/打印/原生菜单/下载/布局），Query 是有返回值的查询（suggest / thumbnails），TabTarget 是统一的移动落点，ShellEvent 是主进程推给各页的一次性事件（开命令面板 openPalette 与用户菜单 openUserMenu 发给 overlay 页、overlayClosed 发给壳/重命名/focusFind 查找条/agentPresence 与 agentCursor 光标层/toast），SamoBridge 是 preload 暴露面的类型。
chat.ts: 对话模型——ChatThread 可带 workspaceId（绑定目录的对话），ChatMessage（kind text | tool，tool 为 ChatToolCall：label/脚本/输出/ok/identityId）、ChatDelta（回答者的事件流：text / tool.start / tool.end）、ChatSnapshot（含 needsKey/model）、ChatMode 与 CHAT_DEFAULTS（Laper 几何：9:16、2/3 高、130×44 药丸与 12px 呼吸区、面板最小尺寸、停靠宽度边界）；字段只增不改。
motion.ts: 全应用动画令牌的唯一真相源——DUR 时长阶梯、EASE 贝塞尔族（禁回弹：y ≤ 1）、EASE_CSS、bezier() 求值器与 lerpRect（主进程窗口编舞用）；渲染层 styles.css 的 @theme 镜像同名令牌。
url.ts: 地址语义。resolveInput 把地址栏输入判定为 URL / 本机地址 / 搜索，displayUrl 产出给人看的短形式；主进程导航与渲染层展示共用，杜绝两套判定。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
