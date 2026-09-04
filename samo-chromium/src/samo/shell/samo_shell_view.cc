// [INPUT]: 依赖 ./samo_shell_view.h，chrome/browser/ui/views/frame/browser_view.h，chrome/browser/ui/browser.h，chrome/browser/ui/browser_tabstrip.h（AddTabAt），chrome/browser/ui/tabs/tab_strip_model.h，components/sessions/content/session_tab_helper.h（标签 id），components/url_formatter/url_fixer.h（地址栏输入→URL），samo/webui/samo_ui_handler.h（EmptyState/PushState），chrome/grit/generated_resources.h
// [OUTPUT]: SamoShellView 的实现：装载 chrome://samo；标签快照 = TabStripModel 逐个 WebContents 映射到 shared/model.ts 的 Tab（id 用 SessionID，favicon 用 chrome://favicon2）；tab.create/activate/close/navigate/back/forward/reload/stop/pin 落到 TabStripModel/NavigationController
// [POS]: samo/shell 的核心实现——Electron 版 main/browser/engine.ts 的标签部分在 fork 里的对应物，但标签本身由 Chrome 拥有，我们只做投影与命令
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#include "samo/shell/samo_shell_view.h"

#include <string>
#include <utility>

#include "base/strings/escape.h"
#include "base/strings/string_number_conversions.h"
#include "base/strings/utf_string_conversions.h"
#include "base/time/time.h"
#include "chrome/browser/profiles/profile.h"
#include "chrome/browser/ui/browser.h"
#include "chrome/browser/ui/browser_tabstrip.h"
#include "chrome/browser/ui/tabs/tab_strip_model.h"
#include "chrome/browser/ui/tabs/tab_strip_user_gesture_details.h"
#include "chrome/browser/ui/views/frame/browser_view.h"
#include "chrome/grit/generated_resources.h"
#include "components/sessions/content/session_tab_helper.h"
#include "components/url_formatter/url_fixer.h"
#include "content/public/browser/navigation_controller.h"
#include "content/public/browser/web_contents.h"
#include "samo/webui/samo_ui_handler.h"
#include "third_party/blink/public/mojom/page/draggable_region.mojom.h"
#include "third_party/skia/include/core/SkRegion.h"
#include "ui/base/metadata/metadata_impl_macros.h"
#include "url/gurl.h"

namespace samo {

namespace {

std::string TabIdOf(content::WebContents* wc) {
  return base::NumberToString(sessions::SessionTabHelper::IdForTab(wc).id());
}

base::DictValue TabToDict(TabStripModel* tsm, int index) {
  content::WebContents* wc = tsm->GetWebContentsAt(index);
  const std::string url = wc->GetVisibleURL().spec();
  base::DictValue t;
  t.Set("id", TabIdOf(wc));
  t.Set("identityId", 1);
  t.Set("partition", "persist:samo");
  t.Set("folderId", base::Value());
  t.Set("url", url);
  t.Set("title", base::UTF16ToUTF8(wc->GetTitle()));
  t.Set("customTitle", base::Value());
  t.Set("favicon", "chrome://favicon2/?size=16&scaleFactor=2x&pageUrl=" +
                       base::EscapeQueryParamValue(url, /*use_plus=*/false));
  t.Set("pinned", tsm->IsTabPinned(index));
  t.Set("loading", wc->IsLoading());
  t.Set("canGoBack", wc->GetController().CanGoBack());
  t.Set("canGoForward", wc->GetController().CanGoForward());
  t.Set("discarded", wc->WasDiscarded());
  t.Set("audible", wc->IsCurrentlyAudible());
  t.Set("muted", wc->IsAudioMuted());
  // TimeTicks → 墙钟毫秒（壳按 MRU 排序只需相对顺序）
  const base::Time last_active = base::Time::Now() - (base::TimeTicks::Now() - wc->GetLastActiveTimeTicks());
  t.Set("lastActiveAt", last_active.InMillisecondsFSinceUnixEpoch());
  t.Set("createdAt", 0);
  return t;
}

}  // namespace

SamoShellView::SamoShellView(Profile* profile, BrowserView* browser_view)
    : browser_view_(browser_view) {
  contents_wrapper_ = std::make_unique<WebUIContentsWrapperT<SamoUI>>(
      GURL("chrome://samo/"), profile, IDS_TASK_MANAGER_OMNIBOX,
      /*esc_closes_ui=*/false, /*supports_draggable_regions=*/true);
  contents_wrapper_->SetHost(weak_factory_.GetWeakPtr());
  if (auto* ui = contents_wrapper_->GetWebUIController())
    ui->set_shell_delegate(this);
  SetWebContents(contents_wrapper_->web_contents());
  SetVisible(true);
  browser_view_->browser()->tab_strip_model()->AddObserver(this);
}

SamoShellView::~SamoShellView() {
  if (browser_view_ && browser_view_->browser())
    browser_view_->browser()->tab_strip_model()->RemoveObserver(this);
  if (contents_wrapper_) {
    if (auto* ui = contents_wrapper_->GetWebUIController())
      ui->set_shell_delegate(nullptr);
  }
  SetWebContents(nullptr);
}

void SamoShellView::ShowUI() {
  SetVisible(true);
}

void SamoShellView::CloseUI() {
  // 壳永远在；Esc 已关闭，这里无事可做
}

// 壳里 -webkit-app-region: drag 的区域 → SkRegion（同 AppBrowserController::UpdateDraggableRegion）→ BrowserView 的命中测试
void SamoShellView::DraggableRegionsChanged(
    const std::vector<blink::mojom::DraggableRegionPtr>& regions,
    content::WebContents* contents) {
  SkRegion sk_region;
  for (const auto& region : regions) {
    sk_region.op(
        SkIRect::MakeXYWH(region->bounds.x(), region->bounds.y(),
                          region->bounds.width(), region->bounds.height()),
        region->draggable ? SkRegion::kUnion_Op : SkRegion::kDifference_Op);
  }
  if (browser_view_)
    browser_view_->SetSamoDraggableRegion(std::move(sk_region));
}

void SamoShellView::OnContentBounds(const gfx::Rect& bounds) {
  if (browser_view_)
    browser_view_->SetSamoContentBounds(bounds);
}

// ---- 快照：Chrome 的标签模型 → BrowserSnapshot.tabs ----
base::DictValue SamoShellView::BuildState() {
  base::DictValue state = SamoUIHandler::EmptyState();
  TabStripModel* tsm = browser_view_->browser()->tab_strip_model();
  base::ListValue tabs;
  for (int i = 0; i < tsm->count(); ++i)
    tabs.Append(base::Value(TabToDict(tsm, i)));
  state.Set("tabs", base::Value(std::move(tabs)));
  base::DictValue active;
  content::WebContents* active_wc = tsm->GetActiveWebContents();
  active.Set("1", active_wc ? base::Value(TabIdOf(active_wc)) : base::Value());
  state.Set("activeTabIdByIdentity", base::Value(std::move(active)));
  return state;
}

void SamoShellView::PushState() {
  if (!contents_wrapper_)
    return;
  if (auto* ui = contents_wrapper_->GetWebUIController(); ui && ui->handler())
    ui->handler()->PushState(BuildState());
}

void SamoShellView::OnTabStripModelChanged(TabStripModel*, const TabStripModelChange&, const TabStripSelectionChange&) {
  PushState();
}

void SamoShellView::OnTabChangedAt(tabs::TabInterface*, int, TabChangeType) {
  PushState();
}

int SamoShellView::IndexOfTabId(const std::string& tab_id) const {
  TabStripModel* tsm = browser_view_->browser()->tab_strip_model();
  for (int i = 0; i < tsm->count(); ++i) {
    if (TabIdOf(tsm->GetWebContentsAt(i)) == tab_id)
      return i;
  }
  return -1;
}

// ---- 命令：壳的 tab.* → TabStripModel / NavigationController ----
bool SamoShellView::HandleCommand(const base::DictValue& command) {
  const std::string* type = command.FindString("type");
  if (!type)
    return false;
  Browser* browser = browser_view_->browser();
  TabStripModel* tsm = browser->tab_strip_model();
  const std::string* tab_id = command.FindString("tabId");
  const int index = tab_id ? IndexOfTabId(*tab_id) : tsm->active_index();
  content::WebContents* wc = index >= 0 ? tsm->GetWebContentsAt(index) : nullptr;

  if (*type == "tab.create") {
    const std::string* url = command.FindString("url");
    chrome::AddTabAt(browser, url ? url_formatter::FixupURL(*url) : GURL("chrome://newtab/"), -1,
                     command.FindBool("activate").value_or(true), std::nullopt,
                     command.FindBool("pinned").value_or(false));
    return true;
  }
  if (!wc)
    return false;
  if (*type == "tab.activate") {
    tsm->ActivateTabAt(index, TabStripUserGestureDetails(TabStripUserGestureDetails::GestureType::kNone));
  } else if (*type == "tab.close") {
    tsm->CloseWebContentsAt(index, TabCloseTypes::CLOSE_USER_GESTURE);
  } else if (*type == "tab.navigate") {
    if (const std::string* input = command.FindString("input")) {
      wc->GetController().LoadURL(url_formatter::FixupURL(*input), content::Referrer(),
                                  ui::PAGE_TRANSITION_TYPED, std::string());
    }
  } else if (*type == "tab.back") {
    if (wc->GetController().CanGoBack()) wc->GetController().GoBack();
  } else if (*type == "tab.forward") {
    if (wc->GetController().CanGoForward()) wc->GetController().GoForward();
  } else if (*type == "tab.reload") {
    wc->GetController().Reload(content::ReloadType::NORMAL, /*check_for_repost=*/true);
  } else if (*type == "tab.stop") {
    wc->Stop();
  } else if (*type == "tab.pin") {
    tsm->SetTabPinned(index, command.FindBool("pinned").value_or(false));
  } else {
    return false;
  }
  return true;
}

BEGIN_METADATA(SamoShellView)
END_METADATA

}  // namespace samo
