// [INPUT]: 依赖 ./samo_overlay_ui.h，content::WebUIDataSource，webui::SetupWebUIDataSource，samo/grit 资源，samo/webui/samo_ui_handler.h
// [OUTPUT]: SamoOverlayUI 的实现：数据源 chrome://samo-overlay → 默认页 webui-overlay.html，同样的 CSP 放宽，挂 SamoUIHandler（palette.close 经 embedder 关气泡）
// [POS]: samo/webui 的弹层 WebUI 实现
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#include "samo/webui/samo_overlay_ui.h"

#include <memory>

#include "chrome/browser/profiles/profile.h"
#include "content/public/browser/web_ui.h"
#include "content/public/browser/web_ui_data_source.h"
#include "samo/grit/samo_resources.h"
#include "samo/grit/samo_resources_map.h"
#include "samo/webui/samo_ui_handler.h"
#include "services/network/public/mojom/content_security_policy.mojom.h"
#include "ui/webui/webui_util.h"

namespace samo {

SamoOverlayUI::SamoOverlayUI(content::WebUI* web_ui)
    : TopChromeWebUIController(web_ui, /*enable_chrome_send=*/true) {
  Profile* profile = Profile::FromWebUI(web_ui);
  content::WebUIDataSource* source =
      content::WebUIDataSource::CreateAndAdd(profile, kSamoOverlayHost);
  webui::SetupWebUIDataSource(source, kSamoResources, IDR_SAMO_WEBUI_OVERLAY_HTML);
  source->OverrideContentSecurityPolicy(
      network::mojom::CSPDirectiveName::StyleSrc,
      "style-src 'self' 'unsafe-inline';");
  source->OverrideContentSecurityPolicy(
      network::mojom::CSPDirectiveName::ImgSrc,
      "img-src 'self' data: https: http: chrome://favicon2;");
  web_ui->AddMessageHandler(std::make_unique<SamoUIHandler>());
}

SamoOverlayUI::~SamoOverlayUI() = default;

WEB_UI_CONTROLLER_TYPE_IMPL(SamoOverlayUI)

}  // namespace samo
