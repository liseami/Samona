// [INPUT]: 依赖 ui/views/widget/widget.h，ui/views/controls/webview/webview.h，chrome/browser/ui/webui/top_chrome 的 WebUIContentsWrapper(T)，samo/webui/samo_launcher_ui.h
// [OUTPUT]: SamoLauncherHost：右下角 Samo AI 药丸——一个 TYPE_CONTROL、半透明、不抢焦点的子 widget（Chrome 查找条同款），装着 chrome://samo-launcher；Layout(anchor) 把它钉在浏览器视图右下角，SetShown 随对话形态显隐
// [POS]: samo/shell 的药丸宿主，对应 Electron 的 LauncherWindow（透明子窗口）；由 SamoShellView 持有
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#ifndef SAMO_SHELL_SAMO_LAUNCHER_HOST_H_
#define SAMO_SHELL_SAMO_LAUNCHER_HOST_H_

#include <memory>

#include "base/memory/raw_ptr.h"
#include "base/memory/weak_ptr.h"
#include "chrome/browser/ui/webui/top_chrome/webui_contents_wrapper.h"
#include "samo/webui/samo_launcher_ui.h"
#include "ui/gfx/geometry/rect.h"
#include "ui/views/controls/webview/webview.h"
#include "ui/views/widget/widget.h"

class Profile;

namespace samo {

class SamoLauncherHost : public WebUIContentsWrapper::Host {
 public:
  // 药丸页尺寸 = Laper 药丸 130×44 + 四周 12px 阴影呼吸区（shared/chat.ts CHAT_DEFAULTS）
  static constexpr int kWidth = 154;
  static constexpr int kHeight = 68;
  static constexpr int kMargin = 12;  // 24 - 12（呼吸区）

  SamoLauncherHost(Profile* profile, views::Widget* parent);
  SamoLauncherHost(const SamoLauncherHost&) = delete;
  SamoLauncherHost& operator=(const SamoLauncherHost&) = delete;
  ~SamoLauncherHost();

  // anchor：浏览器视图在屏幕上的矩形
  void Layout(const gfx::Rect& anchor_in_screen);
  void SetShown(bool shown);

  // WebUIContentsWrapper::Host
  void ShowUI() override;
  void CloseUI() override;

 private:
  std::unique_ptr<views::Widget> widget_;
  raw_ptr<views::WebView> web_view_ = nullptr;
  std::unique_ptr<WebUIContentsWrapperT<SamoLauncherUI>> contents_wrapper_;
  bool shown_ = true;
  bool ready_ = false;
  base::WeakPtrFactory<SamoLauncherHost> weak_factory_{this};
};

}  // namespace samo

#endif  // SAMO_SHELL_SAMO_LAUNCHER_HOST_H_
