# main/
> L2 | 父级: ../../CLAUDE.md

主进程。装配顺序即依赖方向：store → window → engine → ipc/menu/gateway。模块之间通过构造注入相识，不 import 单例；engine 是 store 的唯一写者、window 的唯一调用者。

## 成员清单
index.ts: 引导。app.setName('Samo') 固定 userData 路径；nativeTheme → store.dark；history/downloads 装配到标签页 session；ChatStore/StubProvider/ChatService/ChatWindow 装配并把对话快照广播到壳、launcher、浮窗，形态驱动浮窗显隐、launcher 显隐与内容区让位；dev 时从 ELECTRON_RENDERER_URL 取壳与新标签页地址，prod 走 file://；单实例锁；恢复落盘状态或 seed；退出前 flush 落盘并关闭网关。
menu.ts: 应用菜单 = 全部快捷键的唯一真相（⌘T/⌘L/⇧⌘A/⌘W/⇧⌘T/⇧⌘W/⌃Tab/⌘S/⌘D/⇧⌘R/⌘[ ]/⌘R/⌘1-9/⌃1-9/⌥⌘←→/⇧⌘N/⇧⌘F/⇧⌘C），翻译为 engine 动作或推给壳的 ShellEvent（推前先 focusShell）；渲染层不监听全局键。
browser/: 状态与引擎（见其 CLAUDE.md）
shell/: 窗口与视图层叠几何（见其 CLAUDE.md）
ipc/: 渲染层命令与查询的唯一入口（见其 CLAUDE.md）
menus/: 原生右键菜单（见其 CLAUDE.md）
agent/: 给外部 AI agent 的 CDP 网关（见其 CLAUDE.md）
chat/: AI 对话的真相与浮窗（见其 CLAUDE.md）

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
