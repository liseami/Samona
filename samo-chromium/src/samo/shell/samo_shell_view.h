// [INPUT]: 依赖 ui/views/controls/webview 的 views::WebView，chrome/browser/ui/webui/top_chrome 的 WebUIContentsWrapper(T)/Host，samo/webui/samo_ui.h（SamoUI 需为 TopChromeWebUIController，见 CLAUDE.md 的转换说明）
// [OUTPUT]: SamoShellView——把 chrome://samo 壳装进 Views 的全窗子视图（BrowserView 的兄弟层：壳在下、网页容器在上），并把壳量出的「网页洞」矩形交给 BrowserView 摆放 contents_container_
// [POS]: samo/shell 的核心；Chrome 的 SidePanelWebUIView 是同一机制（WebView + WebUIContentsWrapper::Host），区别只是我们铺满整窗。草拟于首次构建期间，接入 //chrome/browser/ui 后按编译结果校正
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#ifndef SAMO_SHELL_SAMO_SHELL_VIEW_H_
#define SAMO_SHELL_SAMO_SHELL_VIEW_H_

#include <memory>

#include "base/memory/weak_ptr.h"
#include "chrome/browser/ui/webui/top_chrome/webui_contents_wrapper.h"
#include "ui/base/metadata/metadata_header_macros.h"
#include "ui/views/controls/webview/webview.h"

class Profile;

namespace samo {

class SamoUI;

class SamoShellView : public views::WebView, public WebUIContentsWrapper::Host {
  METADATA_HEADER(SamoShellView, views::WebView)

 public:
  explicit SamoShellView(Profile* profile);
  SamoShellView(const SamoShellView&) = delete;
  SamoShellView& operator=(const SamoShellView&) = delete;
  ~SamoShellView() override;

  // WebUIContentsWrapper::Host
  void ShowUI() override;
  void CloseUI() override;
  void DraggableRegionsChanged(
      const std::vector<blink::mojom::DraggableRegionPtr>& regions,
      content::WebContents* contents) override;

 private:
  std::unique_ptr<WebUIContentsWrapperT<SamoUI>> contents_wrapper_;
  base::WeakPtrFactory<SamoShellView> weak_factory_{this};
};

}  // namespace samo

#endif  // SAMO_SHELL_SAMO_SHELL_VIEW_H_
