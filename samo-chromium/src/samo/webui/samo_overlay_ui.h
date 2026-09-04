// [INPUT]: 依赖 chrome/browser/ui/webui/top_chrome 的 TopChromeWebUIController/DefaultTopChromeWebUIConfig，content/public/common/url_constants
// [OUTPUT]: SamoOverlayUI（chrome://samo-overlay：命令面板 + 用户菜单的弹层页，由 WebUI 气泡承载，宿主随内容自动调整大小）与 SamoOverlayUIConfig
// [POS]: samo/webui 的第二个 WebUI：与 SamoUI 共用资源包，只是默认页换成 webui-overlay.html；对应 Electron 时代的透明子窗口 PaletteWindow
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#ifndef SAMO_WEBUI_SAMO_OVERLAY_UI_H_
#define SAMO_WEBUI_SAMO_OVERLAY_UI_H_

#include <string_view>

#include "chrome/browser/ui/webui/top_chrome/top_chrome_web_ui_controller.h"
#include "chrome/browser/ui/webui/top_chrome/top_chrome_webui_config.h"
#include "content/public/common/url_constants.h"

namespace content {
class WebUI;
}

namespace samo {

inline constexpr char kSamoOverlayHost[] = "samo-overlay";

class SamoOverlayUI : public TopChromeWebUIController {
 public:
  explicit SamoOverlayUI(content::WebUI* web_ui);
  SamoOverlayUI(const SamoOverlayUI&) = delete;
  SamoOverlayUI& operator=(const SamoOverlayUI&) = delete;
  ~SamoOverlayUI() override;

  static constexpr std::string_view GetWebUIName() { return "SamoOverlay"; }

  WEB_UI_CONTROLLER_TYPE_DECL();
};

class SamoOverlayUIConfig : public DefaultTopChromeWebUIConfig<SamoOverlayUI> {
 public:
  SamoOverlayUIConfig()
      : DefaultTopChromeWebUIConfig(content::kChromeUIScheme, kSamoOverlayHost) {}
  bool IsPreloadable() override { return false; }
  bool ShouldAutoResizeHost() override { return true; }  // 气泡随面板/菜单的内容尺寸
};

}  // namespace samo

#endif  // SAMO_WEBUI_SAMO_OVERLAY_UI_H_
