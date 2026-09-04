// [INPUT]: 依赖 ./samo_launcher_ui.h，content::WebUIDataSource，webui::SetupWebUIDataSource，samo/grit 资源，samo/webui/samo_ui_handler.h
// [OUTPUT]: SamoLauncherUI 的实现：数据源 chrome://samo-launcher → 默认页 webui-launcher.html，挂 SamoUIHandler（命令经宿主窗口的壳视图转发）
// [POS]: samo/webui 的药丸 WebUI 实现
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#include "samo/webui/samo_launcher_ui.h"

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

SamoLauncherUI::SamoLauncherUI(content::WebUI* web_ui)
    : TopChromeWebUIController(web_ui, /*enable_chrome_send=*/true) {
  content::WebUIDataSource* source = content::WebUIDataSource::CreateAndAdd(Profile::FromWebUI(web_ui), kSamoLauncherHost);
  webui::SetupWebUIDataSource(source, kSamoResources, IDR_SAMO_WEBUI_LAUNCHER_HTML);
  source->OverrideContentSecurityPolicy(network::mojom::CSPDirectiveName::StyleSrc, "style-src 'self' 'unsafe-inline';");
  web_ui->AddMessageHandler(std::make_unique<SamoUIHandler>());
}

SamoLauncherUI::~SamoLauncherUI() = default;

WEB_UI_CONTROLLER_TYPE_IMPL(SamoLauncherUI)

}  // namespace samo
