// [INPUT]: 依赖 chrome/browser/ui/webui/top_chrome 的 TopChromeWebUIController/DefaultTopChromeWebUIConfig
// [OUTPUT]: SamoLauncherUI（chrome://samo-launcher：右下角 Samo AI 药丸页，由浮在网页之上的透明子 widget 承载）与 SamoLauncherUIConfig
// [POS]: samo/webui 的第三个 WebUI，对应 Electron 的 LauncherWindow；宿主是 shell/samo_launcher_host
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#ifndef SAMO_WEBUI_SAMO_LAUNCHER_UI_H_
#define SAMO_WEBUI_SAMO_LAUNCHER_UI_H_

#include <string_view>

#include "chrome/browser/ui/webui/top_chrome/top_chrome_web_ui_controller.h"
#include "chrome/browser/ui/webui/top_chrome/top_chrome_webui_config.h"
#include "content/public/common/url_constants.h"

namespace content {
class WebUI;
}

namespace samo {

inline constexpr char kSamoLauncherHost[] = "samo-launcher";

class SamoLauncherUI : public TopChromeWebUIController {
 public:
  explicit SamoLauncherUI(content::WebUI* web_ui);
  SamoLauncherUI(const SamoLauncherUI&) = delete;
  SamoLauncherUI& operator=(const SamoLauncherUI&) = delete;
  ~SamoLauncherUI() override;
  static constexpr std::string_view GetWebUIName() { return "SamoLauncher"; }
  WEB_UI_CONTROLLER_TYPE_DECL();
};

class SamoLauncherUIConfig : public DefaultTopChromeWebUIConfig<SamoLauncherUI> {
 public:
  SamoLauncherUIConfig()
      : DefaultTopChromeWebUIConfig(content::kChromeUIScheme, kSamoLauncherHost) {}
  bool IsPreloadable() override { return false; }
};

}  // namespace samo

#endif  // SAMO_WEBUI_SAMO_LAUNCHER_UI_H_
