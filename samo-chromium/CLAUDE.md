# samo-chromium/
> L2 | 父级: ../CLAUDE.md

Samo 的下一代基座：**完整 Chromium fork（含 //chrome/browser 层）+ 壳做成 WebUI**（Vivaldi 路线）。为什么不是 Electron / CEF / phi 式引擎 framework：扩展系统（完整 chrome.* + Web Store）、翻译、下载记录、密码与自动填充、同步都住在 chrome 层，content 层的引擎给不了；为什么不是 Swift 原生壳压在 chrome 层上（Arc 的 ADK）：那是几十人几年的活。Vivaldi 证明浏览器 UI 可以是 React 跑在 WebUI 里——所以 samo-app 的 React 壳几乎原样搬进来，UI 完全相同；agent 网关改接 Chromium 自带的 CDP（`--remote-debugging-port`），samo-browser 零改动。

## 迁移地图（Electron → Chromium fork）
| samo-app（Electron） | 去处 |
|---|---|
| main/shell（BaseWindow + 三层壳几何） | chrome 层的 BrowserView 顶栏/标签栏隐藏（补丁），壳 = `chrome://samo` WebUI 常驻侧栏（side panel）+ 自绘顶栏 |
| main/browser（标签/视图/历史/下载/权限/右键/查找/打印/弹窗/错误页） | **全部由 chrome 层自带**，删代码 |
| 扩展 / 翻译 / 密码 / 同步 | chrome 层自带 |
| renderer/（React 壳：rail / 侧栏 / 面板头 / apps / appstore / workspace / assets / 用户菜单 / 命令面板 / 对话） | 原样搬进 WebUI（chrome://samo，React + Tailwind 走 webui 的资源打包），`window.samo` 桥换成 WebUI 的 mojo 绑定 |
| main/agent（网关 + ego-browser 运行时 + 光标层） | CDP 直连 Chromium；光标层改为扩展 content script 或 WebUI 覆盖层 |
| main/chat（AI 对话、模型调用）、main/apps（localhost 扫描）、workspace、assets、main/agent 网关 | **Samo 服务进程**（Node，由浏览器进程拉起、本地 socket 通信）：这些模块的业务逻辑原样保留——它们本来就不依赖 Electron 的窗口/视图，只依赖 Node；SamoUIHandler 把 Command/Query 转发给它、把它的快照与浏览器进程自己的标签快照合并后推给壳。第二阶段再视需要把热路径下沉为 C++ |
| packages/samo-agent（CLI） | 不变 |

## 阶段一的关键决策：Samo 服务进程
Electron 版 main/ 里只有 browser/engine（标签与视图）和 shell/window（窗口几何）真正依赖 Electron；chat / apps / workspace / assets / agent 网关只依赖 Node。所以迁移不是重写它们，而是把它们从 Electron 主进程搬进一个由 Chromium 拉起的 Node 子进程（samo-service），协议还是今天的 Command / Query / Snapshot。标签、历史、下载、权限、查找、打印、弹窗——这些在 fork 里由 chrome 层原生提供，Electron 版对应代码直接删除。agent 网关改用 Chromium 的 `--remote-debugging-port` 做 CDP 后端（Electron 版用的是 webContents.debugger），ego-browser 运行时与 samo-browser CLI 零改动。

## Electron 耦合审计（2026-09-04，samo-app/src/main 的服务候选模块，共约 2155 行）
- 已是宿主无关、可原样进 samo-service：chat/{agent-provider,choreographer,config,prompt,provider,service,store}.ts、apps/{scanner,service}.ts、agent/{runner,task-spaces}.ts。
- 需替换的耦合点：chat/{launcher-window,window}.ts（Electron 子窗口宿主 → WebUI 侧栏/浮层，删除）；workspace/service.ts（dialog 选目录、shell 揭示 → 经 SamoUIHandler 调 chrome 的文件对话框与 platform_util）；agent/{cdp-bridge,session,snapshot}.ts（WebContents.debugger → 连 Chromium `--remote-debugging-port` 的 CDP WebSocket 后端）；agent/gateway.ts（app.getPath 的用户数据目录 → 服务进程启动参数）；agent/presence.ts（光标层子窗口 → 扩展 content script 或 WebUI 覆盖层）；ipc/handlers.ts（ipcMain → SamoUIHandler 的 samo.invoke 分发）。

## 目录
env.sh - 路径约定（depot_tools、~/chromium/src、out/Samo）与钉住的上游版本 CHROMIUM_VERSION，source 之
args.gn - 开发构建 GN 参数（component build、无符号、专有编解码、Widevine）
scripts/bootstrap.sh - 一键：fetch → link-samo → apply-patches → build（SAMO_SKIP_FETCH=1 跳过拉取）；日志 ~/chromium/{fetch,build}.log
scripts/fetch.sh - 拿源码：模式 git（GitHub 镜像浅克隆到 CHROMIUM_VERSION → 远端切回 googlesource → gclient sync 拉 DEPS → runhooks）或 tarball（官方 5.9GB 源码包，可续传，再跑 toolchain.sh）；googlesource 直接浅克隆经用户的 Clash 隧道必断，故不用
scripts/toolchain.sh - 源码包路线补工具链：clang / rust / gn（cipd）/ node / LASTCHANGE
scripts/build.sh - gn gen + autoninja chrome（首次 4–8 小时，增量分钟级；要求 ≥120GB 空闲）
scripts/apply-patches.sh - 把 patches/ 打到树上（git 树 git apply --3way，源码包树 patch -p1；幂等）
scripts/run.sh - 启动构建产物，开 CDP 9222
scripts/link-samo.sh - 把仓库内 src/samo 符号链接进 ~/chromium/src/samo（源码受版本控制，树只是挂载点）
src/samo/ - Samo 在 Chromium 树里的独立目录：chrome://samo WebUI（控制器 + 消息处理器 + BUILD.gn），见其 CLAUDE.md
src/samo/webui/dist/ - samo-app `bun run build:webui` 的产物（git 忽略）：壳与新标签页的静态资源 + manifest.txt（GN 读它生成 grd）
patches/ - Samo 补丁（见其 README）

## 状态
2026-09-04 起步：脚手架就位，源码拉取中；React 壳已能以 WebUI 形态构建（samo-app `build:webui`，桥换成 cr.js 消息通道）；src/samo 的 WebUI 控制器与处理器已草拟。下一步依次是 首次构建 → link-samo + 三处上游补丁 → chrome://samo 跑起壳 → 各 Command 接到浏览器进程的 Samo 服务 → 顶栏替换 → agent 网关切 CDP。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
