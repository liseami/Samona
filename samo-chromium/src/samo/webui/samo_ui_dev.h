// [INPUT]: 依赖 content::WebUIDataSource（SetRequestFilter）、base 的 FilePath/ThreadPool
// [OUTPUT]: MaybeServeShellFromDisk(source)：命令行带 --samo-webui-dir=<dir> 时，chrome://samo 的所有资源改从该目录读（samo-app `vite build --watch` 的产物），改壳不用重编 Chromium——开发态的一级热更新
// [POS]: samo/webui 的开发态旁路；生产构建不带该开关时零影响。草稿，首次构建通过后接入 samo_ui.cc
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#ifndef SAMO_WEBUI_SAMO_UI_DEV_H_
#define SAMO_WEBUI_SAMO_UI_DEV_H_

namespace content {
class WebUIDataSource;
}

namespace samo {

inline constexpr char kSamoWebUIDirSwitch[] = "samo-webui-dir";

// 返回 true 表示已挂上磁盘数据源过滤器
bool MaybeServeShellFromDisk(content::WebUIDataSource* source);

}  // namespace samo

#endif  // SAMO_WEBUI_SAMO_UI_DEV_H_
