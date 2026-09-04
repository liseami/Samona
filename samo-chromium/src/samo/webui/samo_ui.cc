// [INPUT]: 依赖 content::WebUIDataSource、webui::SetupWebUIDataSource（ui/webui/webui_util.h）、samo/grit/samo_resources*（:resources 生成）、./samo_ui_handler
// [OUTPUT]: SamoUI 的实现：数据源 chrome://samo → 默认资源 webui.html，放宽 CSP 允许 Tailwind 的内联样式，挂 SamoUIHandler
// [POS]: samo/webui 的门面实现；草拟于源码落地前，编译时按当时的 Chromium API 校正（这里的每个符号都在 2025–2026 主线稳定存在）
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#include "samo/webui/samo_ui.h"

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

SamoUI::SamoUI(content::WebUI* web_ui) : content::WebUIController(web_ui) {
  Profile* profile = Profile::FromWebUI(web_ui);
  content::WebUIDataSource* source =
      content::WebUIDataSource::CreateAndAdd(profile, kSamoHost);
  // 静态资源全部来自 samo-app 的 build:webui 产物；默认页 = webui.html
  webui::SetupWebUIDataSource(source, kSamoResources, IDR_SAMO_WEBUI_HTML);
  // Tailwind v4 注入内联 <style>；壳里没有内联脚本，script-src 保持默认（self + chrome://resources）
  source->OverrideContentSecurityPolicy(
      network::mojom::CSPDirectiveName::StyleSrc,
      "style-src 'self' 'unsafe-inline';");
  source->OverrideContentSecurityPolicy(
      network::mojom::CSPDirectiveName::ImgSrc,
      "img-src 'self' data: https: http: chrome://favicon2;");
  web_ui->AddMessageHandler(std::make_unique<SamoUIHandler>());
}

SamoUI::~SamoUI() = default;

}  // namespace samo
