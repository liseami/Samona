# Samona - Samo：人类唯一需要的 AI 应用（类 Arc 的 AI 浏览器 + 落地页）

Bun 1.3 workspaces 单仓 · samo-app: Electron 44 + electron-vite 5 + React 19 + Tailwind v4 · samo-web: Vite + React 18 + Tailwind v4 · samo-agent: Node CLI 复用 ego-browser-v2

<directory>
samo-app/ - Samo 浏览器本体，Electron 桌面应用 (src/main 主进程, src/preload 桥, src/renderer React 壳与新标签页, src/shared 三方契约)
samo-web/ - 落地页，20 国语言轮换的极简标语，Cloudflare Pages 托管 (src/components, src/i18n)
packages/samo-agent/ - `samo-browser` CLI：任何 AI agent 经它驱动 Samo；ego-browser-v2 提供全部 helper，本包只做网关客户端与 `globalThis.ego` 宿主
reference/ - 只读参考仓（git 忽略）：ego-lite（agent 浏览器 harness）、phibrowser-mac（macOS 原生壳与 UI 设计）、kumo（Cloudflare Kumo：按钮受光配方与文档站陈列形态的源头）
</directory>

<config>
package.json - workspaces 与根脚本（dev → samo-app，dev:web → samo-web，build/typecheck 全仓）；trustedDependencies 放行 electron 的二进制下载（bun 隔离安装默认拦截生命周期脚本）
.gitignore - node_modules/out/dist/release、reference/、packages/samo-agent/workspace/（构建生成）
bun.lock - 单一锁文件
</config>

<product>
架构主张：Samo = 身份 × 模块。壳提供窗口、icon navi（浏览器 / 邮件 / 知识库 / 网盘）与侧栏几何；每个模块交出自己的侧栏与面板。浏览器是第一个模块，也是其余模块的运行时基座（网页视图、登录态、agent 网关）。
Samo 解决的问题：编程小白用 vibe coding 造的工作台散落在 localhost；Samo 让这些 App 以标准化壳封装、由 Samo 服务器部署（预览版/正式版），常驻在浏览器侧栏一键打开、持续迭代，部署/数据库/登录全由 Samo 负责。
第一阶段（当前）：可运行、可迭代、可热更新的轻量版——Arc 式壳 + 真实标签页 + 身份（独立登录态）+ 命令面板 + agent 网关。侧栏「收藏/固定标签」即未来的 App 位。
</product>

<agent>
Samo 启动后在 ~/Library/Application Support/Samo/agent-gateway.json 写下网关地址与 token；`samo-browser <<'JS' … JS` 读它、连上、把 heredoc 交给 ego-browser 运行时。agent 在自己的身份（继承用户登录态，sidebar 底部带角标）里工作，用户随时 Take control / Hand back。
</agent>

法则: 极简·稳定·导航·版本精确
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
