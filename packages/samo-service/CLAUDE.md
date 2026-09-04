# packages/samo-service/
> L2 | 父级: ../../CLAUDE.md

Samo 服务进程：Chromium fork 里，浏览器进程（samo-chromium/src/samo/service）以 `node dist/index.js --data-dir <dir>` 拉起它，stdin/stdout 上跑 JSON 行协议。它装配的是 samo-app 主进程里**本来就宿主无关**的业务模块——对话（chat/*：ChatStore、ChatService、Claude AgentProvider、密钥配置）、应用扫描（apps/scanner）、agent 脚本运行器——并用宿主无关的方式重写了应用/工作区两块的指挥逻辑（标签与目录选择器交给浏览器做，经 host 请求）。协议契约与 Electron 时代的 preload 桥相同：Command / Query / Snapshot。

## 成员清单
package.json / tsconfig.json: bun build 把入口连同 samo-app 的 chat/agent 源码打成 dist/index.js（--tsconfig-override 解决 @shared 别名）；依赖 samo-agent（browser 工具的 CLI）。
src/protocol.ts: Wire——入站 invoke/query/getState/getChat/layout/context/hostReply；出站 应答、state/chat/event 推送、host 请求（openApp/closeApp/pickFolder/reveal/setTheme）。
src/apps.ts: Apps——扫描与固定项合并（apps.json 同格式），open 请浏览器开带 appId 的标签，消失的应用请浏览器关标签。
src/workspaces.ts: Workspaces——workspaces.json 同格式，add 请浏览器弹目录选择器，select 切对话线程，reveal 请浏览器显示。
src/index.ts: 装配根：数据目录、对话（提供者按密钥切换）、应用、工作区，命令分发。

## 债
apps.ts / workspaces.ts 与 samo-app 的 AppsService / WorkspaceService 各有一份合并与落盘逻辑；下一步抽成共享核心让 Electron 版也依赖宿主接口（DIP），两份合一。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
