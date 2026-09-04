// [INPUT]: 依赖 base（Process/LaunchProcess、SequencedTaskRunner、Value）、content::GetUIThreadTaskRunner
// [OUTPUT]: SamoService：拉起 Node 服务进程（packages/samo-service），stdin/stdout 上跑 JSON 行协议——Invoke/Query/GetState/GetChat 请求-应答，SendLayout/SendContext 单向通知，Observer 收 state/chat/event 推送与 host 请求（并用 ReplyHost 回复）
// [POS]: samo/service 的核心：浏览器进程与 Samo 业务逻辑（对话 / 应用 / 工作区）之间的唯一通道；对应 Electron 时代主进程内的直接调用
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#ifndef SAMO_SERVICE_SAMO_SERVICE_H_
#define SAMO_SERVICE_SAMO_SERVICE_H_

#include <map>
#include <memory>
#include <string>
#include <vector>

#include "base/files/file_path.h"
#include "base/functional/callback.h"
#include "base/memory/scoped_refptr.h"
#include "base/memory/weak_ptr.h"
#include "base/observer_list.h"
#include "base/observer_list_types.h"
#include "base/process/process.h"
#include "base/task/sequenced_task_runner.h"
#include "base/values.h"

namespace samo {

class SamoService {
 public:
  class Observer : public base::CheckedObserver {
   public:
    virtual void OnServiceState(const base::DictValue& state) {}
    virtual void OnServiceChat(const base::DictValue& chat) {}
    virtual void OnServiceEvent(const base::DictValue& event) {}
    // 服务请浏览器做事；实现者处理后必须调用 service->ReplyHost(id, result)
    virtual void OnHostRequest(int id, const base::DictValue& request) {}
  };
  using ResultCallback = base::OnceCallback<void(base::Value result)>;

  // node_path：Node 可执行文件；service_path：dist/index.js；data_dir：apps.json / workspaces.json / chat.json / config.json 所在
  SamoService(const base::FilePath& node_path, const base::FilePath& service_path, const base::FilePath& data_dir, std::vector<std::string> extra_args = {});
  SamoService(const SamoService&) = delete;
  SamoService& operator=(const SamoService&) = delete;
  ~SamoService();

  bool Start();
  bool running() const { return process_.IsValid(); }

  void AddObserver(Observer* observer) { observers_.AddObserver(observer); }
  void RemoveObserver(Observer* observer) { observers_.RemoveObserver(observer); }

  void Invoke(const base::DictValue& command, ResultCallback callback);
  void Query(const base::DictValue& query, ResultCallback callback);
  void GetState(ResultCallback callback);
  void GetChat(ResultCallback callback);
  void SendLayout(const std::string& module);
  void SendContext(const std::string& active_url, const std::string& active_title, int tab_count);
  void ReplyHost(int id, base::Value result);

 private:
  void Send(base::DictValue message);
  void Request(base::DictValue message, ResultCallback callback);
  void OnLine(const std::string& line);  // UI 线程
  static void ReadLoop(int fd, scoped_refptr<base::SequencedTaskRunner> ui, base::WeakPtr<SamoService> self);

  const base::FilePath node_path_;
  const base::FilePath service_path_;
  const base::FilePath data_dir_;
  const std::vector<std::string> extra_args_;  // 如 --cdp-port <port>
  base::Process process_;
  int stdin_fd_ = -1;
  int stdout_fd_ = -1;
  int next_id_ = 1;
  std::map<int, ResultCallback> pending_;
  scoped_refptr<base::SequencedTaskRunner> writer_;
  base::ObserverList<Observer> observers_;
  base::WeakPtrFactory<SamoService> weak_factory_{this};
};

}  // namespace samo

#endif  // SAMO_SERVICE_SAMO_SERVICE_H_
