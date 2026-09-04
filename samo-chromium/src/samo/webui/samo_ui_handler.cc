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

// 最小可挂起的快照：与 shared/model.ts BrowserSnapshot 同形；真实数据接入后由 Samo 服务填充
base::DictValue SamoUIHandler::CurrentState() {
  base::DictValue layout;
  layout.Set("module", "browser");
  layout.Set("sidebarWidth", 264);
  layout.Set("sidebarCollapsed", false);
  layout.Set("overview", false);
  base::DictValue snapshot;
  snapshot.Set("identities", base::ListValue());
  snapshot.Set("tabs", base::ListValue());
  snapshot.Set("folders", base::ListValue());
  snapshot.Set("downloads", base::ListValue());
  snapshot.Set("apps", base::ListValue());
  snapshot.Set("workspaces", base::ListValue());
  snapshot.Set("layout", std::move(layout));
  snapshot.Set("dark", false);
  snapshot.Set("hoverUrl", base::Value());
  snapshot.Set("find", base::Value());
  return snapshot;
}

base::DictValue SamoUIHandler::CurrentChat() {
  base::DictValue snapshot;
  snapshot.Set("threads", base::ListValue());
  snapshot.Set("mode", "closed");
  return snapshot;
}

}  // namespace samo
