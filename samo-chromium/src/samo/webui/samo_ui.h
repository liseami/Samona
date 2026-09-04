// [INPUT]: 依赖 chrome/browser/ui/webui/top_chrome 的 TopChromeWebUIController/DefaultTopChromeWebUIConfig，content/public/common/url_constants 的 kChromeUIScheme，ui/gfx/geometry/rect.h
// [OUTPUT]: SamoUI（持 ShellDelegate 与 SamoUIHandler 指针；chrome://samo 的控制器：top-chrome 形态以便被 Views 的 WebUIContentsWrapper 装载；enable_chrome_send=true 保留 cr.js 消息通道）、SamoUI::ShellDelegate（壳量出的网页洞矩形回调，SamoShellView 实现）、SamoUIConfig（注册入口）
// [POS]: samo/webui 的门面；壳（samo-app 的 React）作为静态资源由 :resources 提供，这里只负责把它挂到 chrome://samo 并把壳的几何汇报转给宿主视图
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#ifndef SAMO_WEBUI_SAMO_UI_H_
#define SAMO_WEBUI_SAMO_UI_H_

#include <string_view>

#include "base/memory/raw_ptr.h"
#include "base/values.h"
#include "chrome/browser/ui/webui/top_chrome/top_chrome_web_ui_controller.h"
#include "chrome/browser/ui/webui/top_chrome/top_chrome_webui_config.h"
#include "content/public/common/url_constants.h"
#include "ui/gfx/geometry/rect.h"

namespace content {
class WebUI;
}

namespace samo {

class SamoUIHandler;

inline constexpr char kSamoHost[] = "samo";

class SamoUI : public TopChromeWebUIController {
 public:
  // 壳的几何汇报去向：SamoShellView 实现，BrowserView 据此摆放网页容器
  class ShellDelegate {
   public:
    virtual ~ShellDelegate() = default;
    virtual void OnContentBounds(const gfx::Rect& bounds) = 0;
    // 宿主视图给出真实快照（标签来自 Chrome 的 TabStripModel）；无宿主（chrome://samo 开在标签里）时用占位
    virtual base::DictValue BuildState() = 0;
    // 处理壳发来的 Command（tab.* 等）；返回 false 表示未处理
    virtual bool HandleCommand(const base::DictValue& command) = 0;
  };

  explicit SamoUI(content::WebUI* web_ui);
  SamoUI(const SamoUI&) = delete;
  SamoUI& operator=(const SamoUI&) = delete;
  ~SamoUI() override;

  static constexpr std::string_view GetWebUIName() { return "Samo"; }

  void set_shell_delegate(ShellDelegate* delegate) { shell_delegate_ = delegate; }
  ShellDelegate* shell_delegate() { return shell_delegate_; }
  // 消息处理器（WebUI 拥有；与本控制器同生共死），宿主视图经它推快照
  void set_handler(SamoUIHandler* handler) { handler_ = handler; }
  SamoUIHandler* handler() { return handler_; }

  WEB_UI_CONTROLLER_TYPE_DECL();

 private:
  raw_ptr<ShellDelegate> shell_delegate_ = nullptr;
  raw_ptr<SamoUIHandler> handler_ = nullptr;
};

class SamoUIConfig : public DefaultTopChromeWebUIConfig<SamoUI> {
 public:
  SamoUIConfig()
      : DefaultTopChromeWebUIConfig(content::kChromeUIScheme, kSamoHost) {}
  bool IsPreloadable() override { return false; }  // 不让 top-chrome 预加载器凭空造壳实例
};

}  // namespace samo

#endif  // SAMO_WEBUI_SAMO_UI_H_
