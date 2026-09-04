# samo-chromium/src/samo/
> L2 | 父级: ../../CLAUDE.md

Samo 在 Chromium 源码树里的独立目录（检出后位于 `src/samo/`，由 scripts/link-samo.sh 以符号链接接入）。Brave 纪律：功能全放这里，上游只打最小补丁。第一批内容是 `chrome://samo` WebUI：把 samo-app 的 React 壳（`bun run build:webui` 产物 ../../webui/dist）作为静态资源挂上，并以 WebUI 消息通道复刻 preload 的 `window.samo` 契约（见 samo-app/src/renderer/src/webui/bridge.ts）。

## 成员清单
BUILD.gn: :build_grd（读 webui/dist/manifest.txt 生成 grd）→ :resources（grit → samo_resources.pak + IDR_SAMO_*）→ :webui（源码集）。
webui/samo_ui.h/.cc: SamoUI（WebUIController：数据源、默认页 webui.html、CSP 放宽内联样式、挂处理器）与 SamoUIConfig（注册入口）。
webui/samo_ui_handler.h/.cc: SamoUIHandler——samo.invoke / query / getState / getChat 四个请求 + samo.state / event / chat 三个推送；快照与 shared/model.ts 同形，先是最小可挂起版本。

## 上游触点（将成为 patches/ 的前三个补丁）
1. `chrome/browser/ui/webui/chrome_web_ui_configs.cc`：`map.AddWebUIConfig(std::make_unique<samo::SamoUIConfig>());`
2. `chrome/browser/ui/BUILD.gn`：`deps += [ "//samo:webui" ]`
3. `chrome/browser/resources/BUILD.gn`（或 chrome_paks.gni 的 resources pak 列表）：把 `$root_gen_dir/samo/samo_resources.pak` 合进 resources.pak

## 状态
草拟于源码落地前：符号均取自 2025–2026 主线稳定 API（WebUIDataSource::CreateAndAdd、webui::SetupWebUIDataSource、DefaultWebUIConfig、RegisterMessageCallback / ResolveJavascriptCallback / FireWebUIListener），首次编译时按实际检出校正。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
