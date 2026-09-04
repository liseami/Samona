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
| main/chat（AI 对话、模型调用） | WebUI 侧栏 + 浏览器进程内的 Samo 服务（C++，或先用外部 Node 进程过渡） |
| main/apps（localhost 扫描）、workspace、assets | 浏览器进程内的 Samo 服务（C++）经 mojo 供 WebUI 调用 |
| packages/samo-agent（CLI） | 不变 |

## 目录
env.sh - 路径约定（depot_tools、~/chromium/src、out/Samo），source 之
args.gn - 开发构建 GN 参数（component build、无符号、专有编解码、Widevine）
scripts/fetch.sh - 拉 depot_tools + 浅检出 Chromium + runhooks（首次数十分钟到数小时，取决于网络）
scripts/build.sh - gn gen + autoninja chrome（首次 4–8 小时，增量分钟级；要求 ≥120GB 空闲）
scripts/apply-patches.sh - 把 patches/ 打到检出上（git am --3way，幂等）
scripts/run.sh - 启动构建产物，开 CDP 9222
scripts/link-samo.sh - 把仓库内 src/samo 符号链接进 ~/chromium/src/samo（源码受版本控制，树只是挂载点）
src/samo/ - Samo 在 Chromium 树里的独立目录：chrome://samo WebUI（控制器 + 消息处理器 + BUILD.gn），见其 CLAUDE.md
webui/dist/ - samo-app `bun run build:webui` 的产物（git 忽略）：壳与新标签页的静态资源 + manifest.txt（GN 读它生成 grd）
patches/ - Samo 补丁（见其 README）

## 状态
2026-09-04 起步：脚手架就位，源码拉取中；React 壳已能以 WebUI 形态构建（samo-app `build:webui`，桥换成 cr.js 消息通道）；src/samo 的 WebUI 控制器与处理器已草拟。下一步依次是 首次构建 → link-samo + 三处上游补丁 → chrome://samo 跑起壳 → 各 Command 接到浏览器进程的 Samo 服务 → 顶栏替换 → agent 网关切 CDP。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
