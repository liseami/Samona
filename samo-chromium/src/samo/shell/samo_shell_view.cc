// [INPUT]: 依赖 ./samo_shell_view.h，chrome/browser/ui/views/frame/browser_view.h，chrome/browser/ui/browser.h，chrome/browser/ui/browser_tabstrip.h（AddTabAt），chrome/browser/ui/tabs/tab_strip_model.h，components/sessions/content/session_tab_helper.h（标签 id），components/url_formatter/url_fixer.h（地址栏输入→URL），samo/webui/samo_ui_handler.h（EmptyState/PushState），chrome/grit/generated_resources.h
// [OUTPUT]: SamoShellView 的实现：装载 chrome://samo；标签快照 = TabStripModel 逐个 WebContents 映射到 shared/model.ts 的 Tab（id 用 SessionID，favicon 用 chrome://favicon2）；tab.create/activate/close/navigate/back/forward/reload/stop/pin 落到 TabStripModel/NavigationController；palette.open / userMenu.open 开 WebUI 气泡（意图经 ?open=… 带给弹层页），气泡销毁时向壳推 overlayClosed
// [POS]: samo/shell 的核心实现——Electron 版 main/browser/engine.ts 的标签部分在 fork 里的对应物，但标签本身由 Chrome 拥有，我们只做投影与命令
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#include "samo/shell/samo_shell_view.h"

#include <string>
#include <utility>

#include "base/command_line.h"
#include "base/files/file_path.h"
#include "base/files/file_util.h"
#include "base/json/json_writer.h"
#include "base/strings/escape.h"
#include "base/strings/string_number_conversions.h"
#include "base/functional/callback_helpers.h"
#include "base/strings/utf_string_conversions.h"
#include "base/time/time.h"
#include "chrome/browser/profiles/profile.h"
#include "chrome/browser/ui/browser.h"
#include "chrome/browser/ui/browser_tabstrip.h"
#include "chrome/browser/ui/tabs/tab_strip_model.h"
#include "chrome/browser/ui/tabs/tab_strip_user_gesture_details.h"
#include "chrome/browser/ui/views/bubble/webui_bubble_manager.h"
#include "chrome/browser/ui/views/frame/browser_view.h"
#include "chrome/browser/platform_util.h"
#include "ui/shell_dialogs/select_file_policy.h"
#include "ui/shell_dialogs/selected_file_info.h"
#include "ui/views/widget/widget.h"
#include "samo/webui/samo_overlay_ui.h"
#include "ui/views/widget/widget.h"
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

  layout_.Set("module", "browser");
  layout_.Set("sidebarWidth", 264);
  layout_.Set("sidebarCollapsed", false);
  layout_.Set("overview", false);

  // Samo 服务进程：--samo-service=<dist/index.js> [--samo-node=<node>]；数据目录 = profile/samo
  const base::CommandLine* cl = base::CommandLine::ForCurrentProcess();
  if (cl->HasSwitch("samo-service")) {
    base::FilePath node = cl->HasSwitch("samo-node") ? cl->GetSwitchValuePath("samo-node") : base::FilePath("/opt/homebrew/bin/node");
    if (!base::PathExists(node)) node = base::FilePath("/usr/local/bin/node");
    service_ = std::make_unique<SamoService>(node, cl->GetSwitchValuePath("samo-service"), profile->GetPath().Append("samo"));
    service_->AddObserver(this);
    if (!service_->Start())
      service_.reset();
  }
}

SamoShellView::~SamoShellView() {
  if (service_)
    service_->RemoveObserver(this);
  if (select_folder_dialog_)
    select_folder_dialog_->ListenerDestroyed();
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
  state.Set("layout", layout_.Clone());
  for (const char* key : {"apps", "activeAppId", "workspaces", "activeWorkspaceId"}) {
    if (const base::Value* v = service_state_.Find(key))
      state.Set(key, v->Clone());
  }
  TabStripModel* tsm = browser_view_->browser()->tab_strip_model();
  base::ListValue tabs;
  for (int i = 0; i < tsm->count(); ++i) {
    base::DictValue t = TabToDict(tsm, i);
    const std::string id = TabIdOf(tsm->GetWebContentsAt(i));
    for (const auto& [app_id, tab_id] : app_tabs_) {
      if (tab_id == id) t.Set("appId", app_id);  // 应用维度的标签：不进浏览器侧栏
    }
    tabs.Append(base::Value(std::move(t)));
  }
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
  SendContext();
}

void SamoShellView::PushEvent(base::DictValue event) {
  if (!contents_wrapper_)
    return;
  if (auto* ui = contents_wrapper_->GetWebUIController(); ui && ui->handler())
    ui->handler()->PushEvent(std::move(event));
}

base::DictValue SamoShellView::BuildChat() {
  if (!chat_.empty())
    return chat_.Clone();
  return SamoUIHandler::CurrentChatPlaceholder();
}

// 给服务进程的浏览器上下文（对话提示词用）
void SamoShellView::SendContext() {
  if (!service_)
    return;
  TabStripModel* tsm = browser_view_->browser()->tab_strip_model();
  content::WebContents* active = tsm->GetActiveWebContents();
  service_->SendContext(active ? active->GetVisibleURL().spec() : "", active ? base::UTF16ToUTF8(active->GetTitle()) : "", tsm->count());
}

// ---- 服务进程 → 壳 ----
void SamoShellView::OnServiceState(const base::DictValue& state) {
  service_state_ = state.Clone();
  PushState();
}
void SamoShellView::OnServiceChat(const base::DictValue& chat) {
  chat_ = chat.Clone();
  if (!contents_wrapper_)
    return;
  if (auto* ui = contents_wrapper_->GetWebUIController(); ui && ui->handler())
    ui->handler()->PushChat(chat_.Clone());
}
void SamoShellView::OnServiceEvent(const base::DictValue& event) {
  PushEvent(event.Clone());
}
void SamoShellView::OnHostRequest(int id, const base::DictValue& request) {
  const std::string* type = request.FindString("type");
  Browser* browser = browser_view_->browser();
  TabStripModel* tsm = browser->tab_strip_model();
  if (!type) {
    service_->ReplyHost(id, base::Value());
    return;
  }
  if (*type == "openApp") {
    const std::string* url = request.FindString("url");
    const std::string* app_id = request.FindString("appId");
    if (url && app_id) {
      auto it = app_tabs_.find(*app_id);
      int index = it != app_tabs_.end() ? IndexOfTabId(it->second) : -1;
      if (index >= 0) {
        tsm->ActivateTabAt(index, TabStripUserGestureDetails(TabStripUserGestureDetails::GestureType::kNone));
      } else {
        chrome::AddTabAt(browser, GURL(*url), -1, true);
        if (content::WebContents* wc = tsm->GetActiveWebContents())
          app_tabs_[*app_id] = TabIdOf(wc);
      }
      PushState();
    }
    service_->ReplyHost(id, base::Value(true));
  } else if (*type == "closeApp") {
    if (const std::string* app_id = request.FindString("appId")) {
      auto it = app_tabs_.find(*app_id);
      if (it != app_tabs_.end()) {
        const int index = IndexOfTabId(it->second);
        app_tabs_.erase(it);
        if (index >= 0)
          tsm->CloseWebContentsAt(index, TabCloseTypes::CLOSE_NONE);
      }
    }
    service_->ReplyHost(id, base::Value(true));
  } else if (*type == "pickFolder") {
    if (pending_pick_id_ >= 0) {
      service_->ReplyHost(id, base::Value());
      return;
    }
    pending_pick_id_ = id;
    select_folder_dialog_ = ui::SelectFileDialog::Create(this, nullptr);
    select_folder_dialog_->SelectFile(ui::SelectFileDialog::SELECT_FOLDER, u"Add workspace", base::FilePath(), nullptr, 0,
                                      base::FilePath::StringType(), browser_view_->GetNativeWindow());
  } else if (*type == "reveal") {
    if (const std::string* path = request.FindString("path"))
      platform_util::ShowItemInFolder(browser_view_->GetProfile(), base::FilePath(*path));
    service_->ReplyHost(id, base::Value(true));
  } else {
    service_->ReplyHost(id, base::Value());  // setTheme 等：暂不处理
  }
}

void SamoShellView::FileSelected(const ui::SelectedFileInfo& file, int index) {
  if (service_ && pending_pick_id_ >= 0)
    service_->ReplyHost(pending_pick_id_, base::Value(file.path().AsUTF8Unsafe()));
  pending_pick_id_ = -1;
  select_folder_dialog_.reset();
}
void SamoShellView::FileSelectionCanceled() {
  if (service_ && pending_pick_id_ >= 0)
    service_->ReplyHost(pending_pick_id_, base::Value());
  pending_pick_id_ = -1;
  select_folder_dialog_.reset();
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

  // ---- 布局与窗口：壳的这些命令在宿主视图本地落地 ----
  if (*type == "module.activate") {
    if (const std::string* module = command.FindString("module")) {
      layout_.Set("module", *module);
      if (service_) service_->SendLayout(*module);
      PushState();
    }
    return true;
  }
  if (*type == "layout.sidebar") {
    if (std::optional<int> w = command.FindInt("width")) layout_.Set("sidebarWidth", *w);
    if (std::optional<bool> c = command.FindBool("collapsed")) layout_.Set("sidebarCollapsed", *c);
    PushState();
    return true;
  }
  if (*type == "layout.overview") {
    layout_.Set("overview", command.FindBool("open").value_or(false));
    PushState();
    return true;
  }
  if (*type == "window.close") { browser_view_->GetWidget()->Close(); return true; }
  if (*type == "window.minimize") { browser_view_->GetWidget()->Minimize(); return true; }
  if (*type == "window.zoom") {
    views::Widget* w = browser_view_->GetWidget();
    if (command.FindBool("fullscreen").value_or(true)) w->SetFullscreen(!w->IsFullscreen()); else w->Maximize();
    return true;
  }
  if (*type == "palette.open") {
    const std::string* mode = command.FindString("mode");
    content::WebContents* active = tsm->GetActiveWebContents();
    const std::string url = active ? active->GetVisibleURL().spec() : "";
    // 面板：浮在网页容器上方中央（FLOAT = 无箭头、居中于锚点矩形）
    gfx::Rect anchor(bounds().width() / 2, 120, 1, 1);
    OpenOverlay("open=palette&mode=" + base::EscapeQueryParamValue(mode ? *mode : "newTab", false) +
                    "&url=" + base::EscapeQueryParamValue(url, false),
                anchor, views::BubbleBorder::FLOAT);
    return true;
  }
  if (*type == "userMenu.open") {
    // 壳给的是 rail 按钮的 left/bottom（bottom 从窗口底边量）；气泡从该点向右上弹
    const int left = command.FindInt("left").value_or(8);
    const int bottom = command.FindInt("bottom").value_or(60);
    gfx::Rect anchor(left, bounds().height() - bottom, 1, 1);
    std::string query = "open=userMenu";
    // 账号 mock 随命令带给弹层文档（弹层与壳不同源，localStorage 不共享）
    if (const base::DictValue* session = command.FindDict("session")) {
      if (std::optional<std::string> json = base::WriteJson(*session))
        query += "&session=" + base::EscapeQueryParamValue(*json, false);
    }
    OpenOverlay(query, anchor, views::BubbleBorder::LEFT_BOTTOM);
    return true;
  }
  if (*type == "palette.close") {
    if (overlay_)
      overlay_->CloseBubble();
    return true;
  }
  if (*type == "tab.create") {
    const std::string* url = command.FindString("url");
    chrome::AddTabAt(browser, url ? url_formatter::FixupURL(*url) : GURL("chrome://newtab/"), -1,
                     command.FindBool("activate").value_or(true), std::nullopt,
                     command.FindBool("pinned").value_or(false));
    return true;
  }
  if (!wc) {
    if (service_ && type->rfind("tab.", 0) != 0) {
      service_->Invoke(command, base::DoNothing());
      return true;
    }
    return false;
  }
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
  } else if (service_) {
    service_->Invoke(command, base::DoNothing());  // chat.* / apps.* / workspace.* / shell.setTheme…
  } else {
    return false;
  }
  return true;
}

// ---- 弹层：WebUI 气泡承载 chrome://samo-overlay（对应 Electron 时代的 PaletteWindow 子窗口）----
void SamoShellView::OpenOverlay(const std::string& query, const gfx::Rect& anchor_in_view, views::BubbleBorder::Arrow arrow) {
  if (overlay_)
    overlay_->CloseBubble();
  overlay_ = WebUIBubbleManager::Create<SamoOverlayUI>(
      browser_view_->browser(), GURL("chrome://samo-overlay/?" + query), IDS_TASK_MANAGER_OMNIBOX,
      /*force_load_on_create=*/true);
  gfx::Rect screen_anchor(anchor_in_view);
  views::View::ConvertRectToScreen(this, &screen_anchor);
  overlay_->ShowBubble(screen_anchor, arrow);
  if (views::Widget* widget = overlay_->GetBubbleWidget())
    widget->AddObserver(this);
}

void SamoShellView::OnWidgetDestroying(views::Widget* widget) {
  widget->RemoveObserver(this);
  if (contents_wrapper_) {
    if (auto* ui = contents_wrapper_->GetWebUIController(); ui && ui->handler()) {
      base::DictValue ev;
      ev.Set("type", "overlayClosed");
      ui->handler()->PushEvent(std::move(ev));
    }
  }
}

BEGIN_METADATA(SamoShellView)
END_METADATA

}  // namespace samo
