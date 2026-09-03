# samo-app/
> L2 | 父级: ../CLAUDE.md

Samo 浏览器本体：类 Arc 的桌面浏览器，侧边栏是用户自己的 App 的家；没有 Space 也没有「身份」——一套登录态，agent 在自己的任务空间（侧栏里的 agent 分组）里驱动它，任何 AI agent 都能通过 `samo-browser` 接入。

Electron 44 (BaseWindow + WebContentsView) + electron-vite 5 + Vite 8 + React 19 + TypeScript + Tailwind CSS v4 + zustand + @dnd-kit + Radix + Pika icons · 主进程 ws 网关 · 复用 ego-browser-v2 作为 agent 运行时

## 产品架构
Samo = 模块 × agent。壳（shell）负责窗口、icon navi、侧栏几何——页面底是 sidebar 色，rail 与底同色，侧栏与面板是两张同质卡片（Laper 剧本项目的 ProjectEditorShell）；每个模块交出侧栏 + 面板 + 头部动作（modules/registry）。浏览器是第一个模块，它的面板是主进程叠上来的网页视图；「应用」维度紧随其后——扫描 localhost 上跑着的应用、一排两张卡陈列在侧栏、点开即在当前身份里成为一个标签（云端部署预留）；邮件 / 知识库 / 网盘是后续模块。登录态只有一套；agent 的任务空间是侧栏里的分组。

## AI 对话
真相在主进程 chat/（线程、消息与工具胶囊、流式、形态）。三形态：closed（右下角 Laper 药丸，透明小子窗口）、floating（不透明子窗口：可拖出应用、原生缩放与阴影，锚在右下角）、docked（面板卡右侧的第四张卡）；无开合动画。⌘T 命令面板也是透明子窗口。银灰范式：药丸与极光只用中性灰。回答者是 ChatProvider 插槽：配了 Anthropic 密钥（对话面板的接入卡或 ANTHROPIC_API_KEY）就是 AgentProvider——Claude 用唯一的 `browser` 工具写 ego-browser 脚本，经 samo-browser 子进程与网关真正驱动浏览器，agent 在自己的身份里工作、侧栏可围观；没配就是引导语。⌘I 开关。

## 三进程分工
- **main**（Node）：唯一真相。持有标签/工作区状态、每个标签的 WebContentsView、布局几何、agent 网关。
- **preload**（沙盒 CJS）：把主进程能力收窄成 `window.samo`（invoke/getState/onState/onEvent）。
- **renderer**（React）：只读镜像 + 命令出口。三层壳（icon navi + 模块侧栏 + 面板卡：头部 导航·地址·工具 + 面板体）是壳视图，红绿灯自绘；网页是主进程叠在面板头部之下的独立视图（直角贴边不切内容，底部两角由两块小遮罩视图画出面板圆角；非 browser/apps 模块或标签矩阵时隐藏；所有已加载视图不呈现时挂在壳之下的后台层，视口永远真实）；agent 驱动可见身份时，一张点击穿透的透明子窗口在网页上画光标、动作标签与边缘发光；最上层还有透明的 overlay 视图承载 ⌘T 命令面板；壳之下有用户看不见的「后台视图」，供 agent 在用户看别处时继续工作。
- 开发态 `SAMO_DEBUG_SHELL=1 bun dev` 后，agent 可 `await ego.useShell()` 把壳当作 target，用 ego-browser 的 click/insertText/evaluate 驱动侧栏做端到端测试。

## 目录
src/main/ - 主进程（browser 引擎/状态/历史/下载、shell 窗口几何、ipc 命令与查询、menus 原生右键、agent 网关与光标层、chat 对话与浮层、apps 应用维度扫描、menu 快捷键）
src/preload/ - contextBridge 桥
src/renderer/ - 壳页 index.html（shell/ + modules/ + chat/ 停靠卡）、命令面板 overlay.html、AI 浮层 chat.html（透明子窗口：药丸 + 面板）、agent 光标层 agent.html（点击穿透子窗口）、新标签页 newtab.html（共用 styles.css；icons/ 为 Laper 的 Pika 图标库；components/effects 为 WebGL 效果）
src/shared/ - 三方共享的模型、IPC 契约、对话模型、动画令牌、URL 语义（零运行时依赖）

## 配置
electron.vite.config.ts - 三段构建；preload 强制 CJS + 显式外置 electron（沙盒渲染器只认 CJS）
tsconfig.node.json / tsconfig.web.json - 主进程侧 与 渲染侧 两套 TS 项目，@shared 别名双方共享
electron-builder.yml - 打包配置（mac dmg，输出 release/）
package.json - dev 为 `electron-vite dev --watch`：渲染层 HMR，主进程/preload 改动自动重建重启

## 运行
```
bun run dev        # 从仓库根：bun dev
bun run typecheck
bun run build      # 产物 out/
```
用户数据在 `~/Library/Application Support/Samo/`：browser-state.json（标签/工作区落盘 v3，旧的多身份在加载时合并为一个）、history.json、chat.json（对话线程与消息）、config.json（模型密钥，0600）、apps.json（固定的应用）、Partitions/samo（唯一登录态）、agent-gateway.json（网关指针，0600）。应用内 Samo AI 起 `packages/samo-agent/dist/cli.js` 跑脚本，改了 samo-agent 要 `bun run agent:build`。
开发态 `SAMO_DEBUG_SHELL=1 bun dev` 后 agent 可用 `ego.useShell()` / `ego.useShell('overlay')` 驱动壳与命令面板做端到端测试。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
