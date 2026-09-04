// [INPUT]: 依赖 ./samo_ui_handler.h，base::Value，content::WebUI
// [OUTPUT]: SamoUIHandler 的实现：注册四个回调；getState/getChat 返回同形占位快照；invoke 里 layout.contentBounds 已接到 SamoUI::ShellDelegate（壳→BrowserView 的几何管线），其余 Command 待接 Samo 服务
// [POS]: samo/webui 的消息层实现；快照字段名以 samo-app/src/shared/model.ts 的 BrowserSnapshot 为准（两侧唯一契约）
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#include "samo/webui/samo_ui_handler.h"

#include <utility>

#include "base/functional/bind.h"
#include "content/public/browser/web_ui.h"
#include "chrome/browser/ui/webui/top_chrome/top_chrome_web_ui_controller.h"
#include "content/public/browser/web_contents.h"
#include "samo/webui/samo_overlay_ui.h"
#include "chrome/browser/ui/views/frame/browser_view.h"
#include "samo/webui/samo_ui.h"
#include "ui/views/widget/widget.h"
#include "ui/gfx/geometry/rect.h"
#include "ui/native_theme/native_theme.h"

namespace samo {

SamoUIHandler::SamoUIHandler() = default;
SamoUIHandler::~SamoUIHandler() = default;

void SamoUIHandler::RegisterMessages() {
  web_ui()->RegisterMessageCallback(
      "samo.invoke", base::BindRepeating(&SamoUIHandler::HandleInvoke,
                                         base::Unretained(this)));
  web_ui()->RegisterMessageCallback(
      "samo.query", base::BindRepeating(&SamoUIHandler::HandleQuery,
                                        base::Unretained(this)));
  web_ui()->RegisterMessageCallback(
      "samo.getState", base::BindRepeating(&SamoUIHandler::HandleGetState,
                                           base::Unretained(this)));
  web_ui()->RegisterMessageCallback(
      "samo.getChat", base::BindRepeating(&SamoUIHandler::HandleGetChat,
                                          base::Unretained(this)));
}

void SamoUIHandler::OnJavascriptAllowed() {}
void SamoUIHandler::OnJavascriptDisallowed() {}

void SamoUIHandler::PushState(base::DictValue snapshot) {
  if (IsJavascriptAllowed())
    FireWebUIListener("samo.state", snapshot);
}
void SamoUIHandler::PushChat(base::DictValue snapshot) {
  if (IsJavascriptAllowed())
    FireWebUIListener("samo.chat", snapshot);
}
void SamoUIHandler::PushEvent(base::DictValue event) {
  if (IsJavascriptAllowed())
    FireWebUIListener("samo.event", event);
}

void SamoUIHandler::HandleInvoke(const base::ListValue& args) {
  AllowJavascript();
  const std::string& callback_id = args.front().GetString();
  if (args.size() >= 2 && args[1].is_dict()) {
    const base::DictValue& cmd = args[1].GetDict();
    const std::string* type = cmd.FindString("type");
    SamoUI::ShellDelegate* delegate = ResolveDelegate();
    // 弹层页里的 palette.close：让承载它的气泡关掉（embedder = WebUIContentsWrapper → Host::CloseUI）
    if (type && *type == "palette.close" &&
        web_ui()->GetController()->GetAs<SamoOverlayUI>()) {
      auto* top = static_cast<TopChromeWebUIController*>(web_ui()->GetController());
      std::string path = "none";
      if (top->embedder()) {
        top->embedder()->CloseUI();
        path = "embedder";
      }
      if (content::WebContents* wc = web_ui()->GetWebContents()) {
        // 保险：RenderDocument 下控制器可能是重建的、embedder 未接——直接关承载它的气泡窗口
        if (auto* widget = views::Widget::GetWidgetForNativeWindow(wc->GetTopLevelNativeWindow())) {
          widget->Close();
          path += "+widget";
        } else {
          path += "+nowidget";
        }
      }
      base::DictValue result;
      result.Set("closed", path);
      ResolveJavascriptCallback(base::Value(callback_id), result);
      return;
    }
    // 壳量出的网页洞矩形 → 宿主视图（BrowserView 据此摆放网页容器）
    if (type && *type == "layout.contentBounds") {
      if (delegate) {
        delegate->OnContentBounds(gfx::Rect(
            cmd.FindInt("x").value_or(0), cmd.FindInt("y").value_or(0),
            cmd.FindInt("width").value_or(0), cmd.FindInt("height").value_or(0)));
      }
    } else if (delegate) {
      delegate->HandleCommand(cmd);  // tab.* 等交给宿主视图（Chrome 的标签模型）
    }
    // TODO(samo): 其余 Command 分发到浏览器进程的 Samo 服务
  }
  ResolveJavascriptCallback(base::Value(callback_id), base::Value());
}

void SamoUIHandler::HandleQuery(const base::ListValue& args) {
  AllowJavascript();
  const std::string& callback_id = args.front().GetString();
  // TODO(samo): suggest / thumbnails
  ResolveJavascriptCallback(base::Value(callback_id), base::ListValue());
}

void SamoUIHandler::HandleGetState(const base::ListValue& args) {
  AllowJavascript();
  const std::string& callback_id = args.front().GetString();
  ResolveJavascriptCallback(base::Value(callback_id), CurrentState());
}

void SamoUIHandler::HandleGetChat(const base::ListValue& args) {
  AllowJavascript();
  const std::string& callback_id = args.front().GetString();
  if (SamoUI::ShellDelegate* d = ResolveDelegate()) {
    ResolveJavascriptCallback(base::Value(callback_id), d->BuildChat());
    return;
  }
  ResolveJavascriptCallback(base::Value(callback_id), CurrentChat());
}

// 最小可挂起的快照：与 shared/model.ts BrowserSnapshot **逐字段同形**（缺一个字段壳就会在选择器里崩）；
// 真实数据接入后由 Samo 服务与标签模型填充
// 壳（SamoUI 且有委托）直接用委托；气泡 / 药丸等子 widget 里的 WebUI 顺着顶层窗口找到 BrowserView 的壳视图
SamoUI::ShellDelegate* SamoUIHandler::ResolveDelegate() {
  if (auto* ui = web_ui()->GetController()->GetAs<SamoUI>(); ui && ui->shell_delegate())
    return ui->shell_delegate();
  if (content::WebContents* wc = web_ui()->GetWebContents()) {
    // 子 widget（药丸 TYPE_CONTROL）与气泡都有自己的 NSWindow：沿 Widget::parent() 爬到浏览器窗口
    views::Widget* w = views::Widget::GetWidgetForNativeWindow(wc->GetTopLevelNativeWindow());
    while (w && w->parent()) w = w->parent();
    if (w) {
      if (BrowserView* bv = BrowserView::GetBrowserViewForNativeWindow(w->GetNativeWindow()))
        return bv->samo_shell_delegate();
    }
  }
  return nullptr;
}

base::DictValue SamoUIHandler::CurrentState() {
  if (SamoUI::ShellDelegate* d = ResolveDelegate())
    return d->BuildState();
  return EmptyState();
}

base::DictValue SamoUIHandler::EmptyState() {
  base::DictValue layout;
  layout.Set("module", "browser");
  layout.Set("sidebarWidth", 264);
  layout.Set("sidebarCollapsed", false);
  layout.Set("overview", false);
  base::DictValue identity;  // 唯一的用户身份（Samo 没有 Space：一套登录态）
  identity.Set("id", 1);
  identity.Set("name", "Samo");
  identity.Set("icon", "user");
  identity.Set("color", "gray");
  identity.Set("partition", "persist:samo");
  identity.Set("ownership", "user");
  identity.Set("agentState", base::Value());
  identity.Set("createdAt", 0);
  base::ListValue identities;
  identities.Append(base::Value(std::move(identity)));
  base::DictValue active_tab_by_identity;
  active_tab_by_identity.Set("1", base::Value());
  base::DictValue snapshot;
  snapshot.Set("identities", base::Value(std::move(identities)));
  snapshot.Set("folders", base::Value(base::ListValue()));
  snapshot.Set("tabs", base::Value(base::ListValue()));
  snapshot.Set("downloads", base::Value(base::ListValue()));
  snapshot.Set("activeIdentityId", 1);
  snapshot.Set("activeTabIdByIdentity", base::Value(std::move(active_tab_by_identity)));
  snapshot.Set("layout", base::Value(std::move(layout)));
  snapshot.Set("apps", base::Value(base::ListValue()));
  snapshot.Set("activeAppId", base::Value());
  snapshot.Set("workspaces", base::Value(base::ListValue()));
  snapshot.Set("activeWorkspaceId", base::Value());
  snapshot.Set("hoverUrl", base::Value());
  snapshot.Set("find", base::Value());
  snapshot.Set("sidebarPeek", false);
  snapshot.Set("closedCount", 0);
  snapshot.Set("dark", ui::NativeTheme::GetInstanceForNativeUi()->preferred_color_scheme() == ui::NativeTheme::PreferredColorScheme::kDark);  // 跟随系统外观
  snapshot.Set("windowFocused", true);
  snapshot.Set("fullscreen", false);
  return snapshot;
}

// 与 shared/chat.ts ChatSnapshot 同形；回答者接上前是 stub
base::DictValue SamoUIHandler::CurrentChat() {
  return CurrentChatPlaceholder();
}

base::DictValue SamoUIHandler::CurrentChatPlaceholder() {
  base::DictValue snapshot;
  snapshot.Set("mode", "closed");
  snapshot.Set("activeThreadId", "");
  snapshot.Set("threads", base::Value(base::ListValue()));
  snapshot.Set("messages", base::Value(base::ListValue()));
  snapshot.Set("generating", false);
  snapshot.Set("unread", 0);
  snapshot.Set("dockWidth", 360);
  snapshot.Set("provider", "stub");
  snapshot.Set("needsKey", true);
  snapshot.Set("model", "");
  return snapshot;
}

}  // namespace samo
