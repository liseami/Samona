# samo-chromium/src/samo/
> L2 | 父级: ../../CLAUDE.md

Samo 在 Chromium 源码树里的独立目录（检出后位于 `src/samo/`，由 scripts/link-samo.sh 以符号链接接入）。Brave 纪律：功能全放这里，上游只打最小补丁。第一批内容是 `chrome://samo` WebUI：把 samo-app 的 React 壳（`bun run build:webui` 产物 ../../webui/dist）作为静态资源挂上，并以 WebUI 消息通道复刻 preload 的 `window.samo` 契约（见 samo-app/src/renderer/src/webui/bridge.ts）。

## 成员清单
BUILD.gn: :build_grd（读 webui/dist/manifest.txt 生成 grd）→ :resources（grit → samo_resources.pak + IDR_SAMO_*）→ :webui（源码集）。
webui/samo_ui.h/.cc: SamoUI（TopChromeWebUIController，enable_chrome_send=true；数据源、默认页 webui.html、CSP 放宽内联样式、挂处理器；持 ShellDelegate 与 handler 指针）、SamoUI::ShellDelegate（OnContentBounds / BuildState / HandleCommand，SamoShellView 实现）与 SamoUIConfig（DefaultTopChromeWebUIConfig，注册入口）。
shell/samo_shell_view.h/.cc: SamoShellView（views::WebView + WebUIContentsWrapper::Host + SamoUI::ShellDelegate + TabStripModelObserver）——把 chrome://samo 装进 BrowserView 的全窗子视图（索引 0，网页容器在其上）；壳量出的网页洞矩形 → BrowserView::SetSamoContentBounds；Chrome 的 TabStripModel → BrowserSnapshot.tabs（id 用 SessionID，favicon 走 chrome://favicon2）并在变化时 PushState；tab.create/activate/close/navigate/back/forward/reload/stop/pin 落到 TabStripModel。编进 //chrome/browser/ui（补丁 0006/0007）。
webui/samo_overlay_ui.h/.cc: SamoOverlayUI / SamoOverlayUIConfig（ShouldAutoResizeHost=true）——chrome://samo-overlay，默认页 webui-overlay.html（命令面板 + 用户菜单），由 SamoShellView 的 WebUIBubbleManager 承载；意图经 ?open=palette|userMenu 带入。
webui/samo_ui_dev.h/.cc: 开发态旁路——命令行 --samo-webui-dir=<dir> 时壳资源从磁盘读（vite build --watch 的产物），改壳不重编 Chromium；已接入 samo_ui.cc（SetupWebUIDataSource 之后）。
webui/samo_ui_handler.h/.cc: SamoUIHandler——samo.invoke / query / getState / getChat 四个请求 + samo.state / event / chat 三个推送；有宿主时快照与命令都走 ShellDelegate，无宿主（chrome://samo 开在标签里）用 EmptyState 占位（与 shared/model.ts 逐字段同形）。

## 上游触点（将成为 patches/ 的前三个补丁）
1. `chrome/browser/ui/webui/chrome_web_ui_configs.cc`：`map.AddWebUIConfig(std::make_unique<samo::SamoUIConfig>());`
2. `chrome/browser/ui/BUILD.gn`：`deps += [ "//samo:webui" ]`
3. `chrome/chrome_paks.gni`：把 `$root_gen_dir/samo/samo_resources.pak` 合进 resources.pak
4. `tools/gritsettings/resource_ids.spec`：登记 `<(SHARED_INTERMEDIATE_DIR)/samo/resources.grd` 的 ID 段（includes 从 10240 起，50 个）

## 里程碑 3 设计：壳铺满整窗（对照 Chromium 152 源码，2026-09-04）
目标：用户看到的整扇窗都是 Samo 壳，Chrome 顶栏零残留；网页由 Views 原生摆进壳指定的矩形并裁圆角；弹层用 Views 气泡。对应今天 Electron 的 shellView + contentBounds + 子窗口。
- **壳的宿主**：新 Views 类 `SamoShellView : views::WebView, WebUIContentsWrapper::Host`，用 `WebUIContentsWrapperT<SamoUI>` 装载 chrome://samo——这正是 Chrome 自己把侧边面板（`SidePanelWebUIView`）和顶部气泡装进 Views 的机制，只是我们把它放成 BrowserView 的全窗子视图。
- **隐藏顶栏**：`BrowserView::InitViews`（frame/browser_view.cc ~926）创建 `top_container_`（标签条 + 工具栏）；补丁在其后 `SetVisible(false)` 并把 `SamoShellView` 加为覆盖整个客户区的子视图，`BrowserViewLayout`（frame/layout/browser_view_layout.cc）里让 top container 高度为 0。
- **网页摆放**：`contents_container_`（Chromium 152 是 `MultiContentsView`，为分屏而生）保持为兄弟视图；壳用 ResizeObserver 量出面板卡里"网页洞"的矩形，经 `samo.invoke {type:'layout.contentBounds'}` 送到 SamoUIHandler → BrowserView 把 contents container 的 bounds 设成它，并用 `ContentsContainerView::SetRoundedCorners(radii)`（Chrome 分屏已在用）裁出面板圆角——取代今天两块遮罩视图的 hack。
- **弹层**：对话浮窗 / ⌘T / 用户菜单 → `WebUIBubbleDialogView`（chrome/browser/ui/views/bubble）装另一个 WebUI 页（chrome://samo/overlay），锚在壳视图上；agent 光标层 → 同类气泡或壳内绝对定位（它压在网页之上时用气泡）。
- **mac 窗框**：`frame/browser_frame_view_mac.mm` + `browser_native_widget_mac.mm`——Chrome 在 mac 本就自绘标题栏区、原生红绿灯浮在其上，我们保留原生红绿灯并让壳在侧栏头部为它留位（今天是自绘的，二选一）。
- **补丁面积估计**：browser_view.cc/.h 各一处（创建 + 成员）、browser_view_layout.cc 一处（top container 高 0、shell 全窗）、BUILD.gn 依赖一处；其余全在 src/samo。

## 状态
- 里程碑 2（18:41）：chrome://samo 在 fork 里渲染出完整壳。
- **里程碑 3 核心（2026-09-04 18:57）**：壳作为 BrowserView 的全窗子视图承载（CDP 里是 browser_ui 类型的 chrome://samo target），Chrome 顶栏隐藏；网页容器按壳汇报的矩形摆放；侧栏标签来自 Chrome 的 TabStripModel，tab.* 命令回路打通（scripts/verify-shell.mjs 通过）。
- 19:04：壳头部可拖窗（DraggableRegions → BrowserView 命中测试 HTCAPTION）、网页容器裁圆角（13）、壳在 Chromium 宿主下为原生红绿灯留位（bridge.host）、开发态磁盘数据源已接。
- 19:27：弹层（⌘T 命令面板、用户菜单）由 WebUI 气泡承载（chrome://samo-overlay，意图与账号 mock 随 URL），palette.close 经 embedder 关气泡，气泡销毁向壳推 overlayClosed；品牌（Samo.app / app.samo.browser / 图标）、新标签页（我们的 NewTab）已落地。
- 未完：对话浮窗/停靠卡（对话/⌘T/用户菜单）改 WebUI 气泡、新标签页换成我们的 newtab、apps/workspace/chat/assets 接 Samo 服务进程、品牌（名字/图标/bundle id）、开发态磁盘数据源。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
