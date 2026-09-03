# samo-app/
> L2 | 父级: ../CLAUDE.md

Samo 浏览器本体：类 Arc 的桌面浏览器，侧边栏是用户自己的 App 的家；「身份」（Identity）取代 Space——一个身份就是一套独立登录态；任何 AI agent 都能通过 `samo-browser` 在自己的身份里驱动它。

Electron 44 (BaseWindow + WebContentsView) + electron-vite 5 + Vite 8 + React 19 + TypeScript + Tailwind CSS v4 + zustand + @dnd-kit + Radix + Pika icons · 主进程 ws 网关 · 复用 ego-browser-v2 作为 agent 运行时

## 产品架构
Samo = 身份 × 模块。壳（shell）负责窗口、icon navi、侧栏几何——页面底是 sidebar 色，rail 与底同色，侧栏与面板是两张同质卡片（Laper 剧本项目的 ProjectEditorShell）；每个模块交出侧栏 + 面板 + 头部动作（modules/registry）。浏览器是第一个模块，它的面板是主进程叠上来的网页视图；邮件 / 知识库 / 网盘是后续模块。身份（独立登录态）是跨模块的主键。

## 三进程分工
- **main**（Node）：唯一真相。持有身份/标签状态、每个标签的 WebContentsView、布局几何、agent 网关。
- **preload**（沙盒 CJS）：把主进程能力收窄成 `window.samo`（invoke/getState/onState/onEvent）。
- **renderer**（React）：只读镜像 + 命令出口。三层壳（icon navi + 模块侧栏 + 面板）是壳视图，红绿灯自绘；网页是主进程叠在面板上的独立视图（非浏览器模块时隐藏）；最上层还有透明的 overlay 视图承载 ⌘T 命令面板；壳之下有用户看不见的「后台视图」，供 agent 在用户看别处时继续工作。
- 开发态 `SAMO_DEBUG_SHELL=1 bun dev` 后，agent 可 `await ego.useShell()` 把壳当作 target，用 ego-browser 的 click/insertText/evaluate 驱动侧栏做端到端测试。

## 目录
src/main/ - 主进程（browser 引擎/状态/历史/下载、shell 窗口几何、ipc 命令与查询、menus 原生右键、agent 网关、menu 快捷键）
src/preload/ - contextBridge 桥
src/renderer/ - 壳页 index.html（shell/ + modules/）、命令面板 overlay.html、新标签页 newtab.html（共用 styles.css；icons/ 为 Laper 的 Pika 图标库）
src/shared/ - 三方共享的模型、IPC 契约、URL 语义（零运行时依赖）

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
用户数据在 `~/Library/Application Support/Samo/`：browser-state.json（身份/标签落盘 v3）、history.json、Partitions/<identity-*>（每个身份的登录态）、agent-gateway.json（网关指针，0600）。
开发态 `SAMO_DEBUG_SHELL=1 bun dev` 后 agent 可用 `ego.useShell()` / `ego.useShell('overlay')` 驱动壳与命令面板做端到端测试。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
