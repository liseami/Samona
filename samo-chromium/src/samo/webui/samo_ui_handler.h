// [INPUT]: 依赖 content/public/browser 的 WebUIMessageHandler，base::Value
// [OUTPUT]: SamoUIHandler：与 samo-app/src/renderer/src/webui/bridge.ts 对称的四个请求（samo.invoke / samo.query / samo.getState / samo.getChat）与三个推送（samo.state / samo.event / samo.chat）
// [POS]: samo/webui 的消息层——Electron 时代 main/ipc/handlers.ts 的对应物；真相未来在浏览器进程的 Samo 服务（标签/应用/工作区/对话），这里只做 JSON 出入口
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#ifndef SAMO_WEBUI_SAMO_UI_HANDLER_H_
#define SAMO_WEBUI_SAMO_UI_HANDLER_H_

#include "base/values.h"
#include "content/public/browser/web_ui_message_handler.h"

namespace samo {

class SamoUIHandler : public content::WebUIMessageHandler {
 public:
  SamoUIHandler();
  SamoUIHandler(const SamoUIHandler&) = delete;
  SamoUIHandler& operator=(const SamoUIHandler&) = delete;
  ~SamoUIHandler() override;

  // content::WebUIMessageHandler
  void RegisterMessages() override;
  void OnJavascriptAllowed() override;
  void OnJavascriptDisallowed() override;

  // 浏览器进程侧状态变化时调用：推快照给壳（对应 bridge.onState / onChat / onEvent）
  void PushState(base::Value::Dict snapshot);
  void PushChat(base::Value::Dict snapshot);
  void PushEvent(base::Value::Dict event);

 private:
  // args[0] = callback id（sendWithPromise 约定），args[1] = 负载（Command / Query）
  void HandleInvoke(const base::Value::List& args);
  void HandleQuery(const base::Value::List& args);
  void HandleGetState(const base::Value::List& args);
  void HandleGetChat(const base::Value::List& args);

  base::Value::Dict CurrentState();
  base::Value::Dict CurrentChat();
};

}  // namespace samo

#endif  // SAMO_WEBUI_SAMO_UI_HANDLER_H_
