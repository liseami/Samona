// [INPUT]: 依赖 ./samo_ui_handler.h，base::Value，content::WebUI
// [OUTPUT]: SamoUIHandler 的实现：注册四个回调；getState/getChat 先返回最小快照（壳能挂起来），invoke/query 先应答空值——各 Command 逐个接到浏览器进程的 Samo 服务是迁移地图的后续步骤
// [POS]: samo/webui 的消息层实现；快照字段名以 samo-app/src/shared/model.ts 的 BrowserSnapshot 为准（两侧唯一契约）
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#include "samo/webui/samo_ui_handler.h"

#include <utility>

#include "base/functional/bind.h"
#include "content/public/browser/web_ui.h"

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
  // TODO(samo): 按 payload["type"]（Command 联合）分发到浏览器进程的 Samo 服务
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
  ResolveJavascriptCallback(base::Value(callback_id), CurrentChat());
}

// 最小可挂起的快照：与 shared/model.ts BrowserSnapshot **逐字段同形**（缺一个字段壳就会在选择器里崩）；
// 真实数据接入后由 Samo 服务与标签模型填充
base::DictValue SamoUIHandler::CurrentState() {
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
  snapshot.Set("dark", false);
  snapshot.Set("windowFocused", true);
  snapshot.Set("fullscreen", false);
  return snapshot;
}

// 与 shared/chat.ts ChatSnapshot 同形；回答者接上前是 stub
base::DictValue SamoUIHandler::CurrentChat() {
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
