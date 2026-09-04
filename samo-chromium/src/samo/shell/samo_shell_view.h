// [INPUT]: 依赖 ui/views/controls/webview 的 views::WebView，chrome/browser/ui/webui/top_chrome 的 WebUIContentsWrapper(T)/Host，samo/webui/samo_ui.h 的 SamoUI/ShellDelegate，chrome/browser/ui/views/frame/browser_view.h
// [OUTPUT]: SamoShellView——把 chrome://samo 壳装进 Views 的全窗子视图（壳在下、网页容器在上）；把壳量出的「网页洞」矩形交给 BrowserView；观察 Chrome 的 TabStripModel 生成 BrowserSnapshot 的 tabs 并推给壳；把壳的 tab.* 命令落到 TabStripModel；palette.open / userMenu.open 开 WebUI 气泡承载弹层页（chrome://samo-overlay）；持有并观察 SamoService（对话 / 应用 / 工作区来自 Node 服务进程，其余命令转发给它，host 请求在这里落地：开/关应用标签、目录选择器、访达显示）
// [POS]: samo/shell 的核心；Chrome 的 SidePanelWebUIView 是同一机制（WebView + WebUIContentsWrapper::Host），区别只是我们铺满整窗。编进 //chrome/browser/ui（补丁 0006）
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#ifndef SAMO_SHELL_SAMO_SHELL_VIEW_H_
#define SAMO_SHELL_SAMO_SHELL_VIEW_H_

#include <map>
#include <memory>
#include <string>

#include "base/memory/raw_ptr.h"
#include "base/memory/weak_ptr.h"
#include "base/values.h"
#include "chrome/browser/ui/tabs/tab_strip_model_observer.h"
#include "samo/service/samo_service.h"
#include "ui/native_theme/native_theme.h"
#include "ui/native_theme/native_theme_observer.h"
#include "ui/shell_dialogs/select_file_dialog.h"
#include "ui/views/bubble/bubble_border.h"
#include "chrome/browser/ui/webui/top_chrome/webui_contents_wrapper.h"
#include "samo/webui/samo_ui.h"
#include "ui/base/metadata/metadata_header_macros.h"
#include "ui/views/controls/webview/webview.h"
#include "ui/views/widget/widget_observer.h"

class BrowserView;
class Profile;
class WebUIBubbleManager;

namespace samo {
class SamoLauncherHost;
}

namespace samo {

class SamoShellView : public views::WebView,
                      public WebUIContentsWrapper::Host,
                      public SamoUI::ShellDelegate,
                      public TabStripModelObserver,
                      public views::WidgetObserver,
                      public SamoService::Observer,
                      public ui::SelectFileDialog::Listener,
                      public ui::NativeThemeObserver {
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

  // ⌘L / 地址栏聚焦：Chrome 的 SetFocusToLocationBar 改道到这里（补丁 0013）
  void OpenPalette(const std::string& mode);

  // SamoUI::ShellDelegate
  void OnContentBounds(const gfx::Rect& bounds) override;
  base::DictValue BuildState() override;
  base::DictValue BuildChat() override;
  bool HandleCommand(const base::DictValue& command) override;

  // SamoService::Observer：服务进程的快照/事件/host 请求
  void OnServiceState(const base::DictValue& state) override;
  void OnServiceChat(const base::DictValue& chat) override;
  void OnServiceEvent(const base::DictValue& event) override;
  void OnHostRequest(int id, const base::DictValue& request) override;

  // ui::NativeThemeObserver：系统深浅色变化 → 快照 dark 变化
  void OnNativeThemeUpdated(ui::NativeTheme* observed_theme) override;

  // ui::SelectFileDialog::Listener：workspace.add 的目录选择
  void FileSelected(const ui::SelectedFileInfo& file, int index) override;
  void FileSelectionCanceled() override;

  // TabStripModelObserver：Chrome 的标签模型一变，就把新快照推给壳
  void OnTabStripModelChanged(TabStripModel* tab_strip_model,
                              const TabStripModelChange& change,
                              const TabStripSelectionChange& selection) override;
  void OnTabChangedAt(tabs::TabInterface* tab, int index, TabChangeType change_type) override;

  // views::WidgetObserver：弹层气泡关闭时告诉壳（overlayClosed）
  void OnWidgetDestroying(views::Widget* widget) override;

  // views::View：壳铺满整窗，它的 bounds 变化即窗口变化 → 药丸跟着走
  void OnBoundsChanged(const gfx::Rect& previous_bounds) override;
  void AddedToWidget() override;

 private:
  // 弹层（命令面板 / 用户菜单）：一次一个 WebUI 气泡，意图经 URL 查询串带给弹层页
  void OpenOverlay(const std::string& query, const gfx::Rect& anchor_in_view, views::BubbleBorder::Arrow arrow);
  std::unique_ptr<WebUIBubbleManager> overlay_;
  std::unique_ptr<SamoLauncherHost> launcher_;  // 右下角 Samo AI 药丸（对话关闭态可见）
  void LayoutLauncher();
  void PushEvent(base::DictValue event);
  void SendContext();
  std::unique_ptr<SamoService> service_;
  base::DictValue service_state_;  // apps / activeAppId / workspaces / activeWorkspaceId
  base::DictValue chat_;           // 最近一次 chat 快照
  base::DictValue layout_;         // module / sidebarWidth / sidebarCollapsed / overview（壳的布局命令落在这里）
  std::map<std::string, std::string> app_tabs_;
  std::string last_user_active_tab_;  // 用户身份最近的活动标签（agent 空间的标签活跃时不覆盖）  // appId → tab id（应用维度打开的标签，不进浏览器侧栏）
  scoped_refptr<ui::SelectFileDialog> select_folder_dialog_;
  int pending_pick_id_ = -1;

  void PushState();
  int IndexOfTabId(const std::string& tab_id) const;

  raw_ptr<BrowserView> browser_view_;
  std::unique_ptr<WebUIContentsWrapperT<SamoUI>> contents_wrapper_;
  base::WeakPtrFactory<SamoShellView> weak_factory_{this};
};

}  // namespace samo

#endif  // SAMO_SHELL_SAMO_SHELL_VIEW_H_
