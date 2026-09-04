// [INPUT]: 依赖 content/public/browser 的 WebUIController/WebUIConfig，chrome/common/webui_url_constants 的 kChromeUIScheme
// [OUTPUT]: SamoUI（chrome://samo 的 WebUIController：装数据源、挂消息处理器）与 SamoUIConfig（注册入口，供 chrome_web_ui_configs.cc 一行 AddWebUIConfig）
// [POS]: samo/webui 的门面；壳（samo-app 的 React）作为静态资源由 :resources 提供，这里只负责把它挂到 chrome://samo
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#ifndef SAMO_WEBUI_SAMO_UI_H_
#define SAMO_WEBUI_SAMO_UI_H_

#include "content/public/browser/web_ui_controller.h"
#include "content/public/browser/webui_config.h"
#include "content/public/common/url_constants.h"

namespace content {
class WebUI;
}

namespace samo {

inline constexpr char kSamoHost[] = "samo";

class SamoUI : public content::WebUIController {
 public:
  explicit SamoUI(content::WebUI* web_ui);
  SamoUI(const SamoUI&) = delete;
  SamoUI& operator=(const SamoUI&) = delete;
  ~SamoUI() override;
};

class SamoUIConfig : public content::DefaultWebUIConfig<SamoUI> {
 public:
  SamoUIConfig()
      : DefaultWebUIConfig(content::kChromeUIScheme, kSamoHost) {}
};

}  // namespace samo

#endif  // SAMO_WEBUI_SAMO_UI_H_
