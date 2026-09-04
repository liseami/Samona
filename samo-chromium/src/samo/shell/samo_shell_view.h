// [INPUT]: 依赖 ui/views/controls/webview 的 views::WebView，chrome/browser/ui/webui/top_chrome 的 WebUIContentsWrapper(T)/Host，samo/webui/samo_ui.h 的 SamoUI/ShellDelegate，chrome/browser/ui/views/frame/browser_view.h
// [OUTPUT]: SamoShellView——把 chrome://samo 壳装进 Views 的全窗子视图（壳在下、网页容器在上）；把壳量出的「网页洞」矩形交给 BrowserView；观察 Chrome 的 TabStripModel 生成 BrowserSnapshot 的 tabs 并推给壳；把壳的 tab.* 命令落到 TabStripModel
// [POS]: samo/shell 的核心；Chrome 的 SidePanelWebUIView 是同一机制（WebView + WebUIContentsWrapper::Host），区别只是我们铺满整窗。编进 //chrome/browser/ui（补丁 0006）
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#ifndef SAMO_SHELL_SAMO_SHELL_VIEW_H_
#define SAMO_SHELL_SAMO_SHELL_VIEW_H_

#include <memory>

#include "base/memory/raw_ptr.h"
#include "base/memory/weak_ptr.h"
#include "base/values.h"
#include "chrome/browser/ui/tabs/tab_strip_model_observer.h"
#include "chrome/browser/ui/webui/top_chrome/webui_contents_wrapper.h"
#include "samo/webui/samo_ui.h"
#include "ui/base/metadata/metadata_header_macros.h"
#include "ui/views/controls/webview/webview.h"

class BrowserView;
class Profile;

namespace samo {

class SamoShellView : public views::WebView,
                      public WebUIContentsWrapper::Host,
                      public SamoUI::ShellDelegate,
                      public TabStripModelObserver {
  METADATA_HEADER(SamoShellView, views::WebView)

 public:
  SamoShellView(Profile* profile, BrowserView* browser_view);
  SamoShellView(const SamoShellView&) = delete;
  SamoShellView& operator=(const SamoShellView&) = delete;
  ~SamoShellView() override;

  // WebUIContentsWrapper::Host
  void ShowUI() override;
  void CloseUI() override;
  void DraggableRegionsChanged(
      const std::vector<blink::mojom::DraggableRegionPtr>& regions,
      content::WebContents* contents) override;

  // SamoUI::ShellDelegate
  void OnContentBounds(const gfx::Rect& bounds) override;
  base::DictValue BuildState() override;
  bool HandleCommand(const base::DictValue& command) override;

  // TabStripModelObserver：Chrome 的标签模型一变，就把新快照推给壳
  void OnTabStripModelChanged(TabStripModel* tab_strip_model,
                              const TabStripModelChange& change,
                              const TabStripSelectionChange& selection) override;
  void OnTabChangedAt(tabs::TabInterface* tab, int index, TabChangeType change_type) override;

 private:
  void PushState();
  int IndexOfTabId(const std::string& tab_id) const;

  raw_ptr<BrowserView> browser_view_;
  std::unique_ptr<WebUIContentsWrapperT<SamoUI>> contents_wrapper_;
  base::WeakPtrFactory<SamoShellView> weak_factory_{this};
};

}  // namespace samo

#endif  // SAMO_SHELL_SAMO_SHELL_VIEW_H_
