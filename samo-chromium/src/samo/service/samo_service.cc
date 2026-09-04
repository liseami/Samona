// [INPUT]: 依赖 ./samo_service.h，base（CommandLine/LaunchProcess/JSON reader-writer/ThreadPool/BindPostTask），content/public/browser/browser_thread.h，POSIX pipe/read/write
// [OUTPUT]: SamoService 的实现：pipe() 两对管道重映射为子进程的 stdin/stdout；ThreadPool 上阻塞读 stdout、按行投回 UI 线程解析；写入走一条串行 ThreadPool 序列；请求带自增 id 与回调表
// [POS]: samo/service 的核心实现；协议细节以 packages/samo-service/src/protocol.ts 为准
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#include "samo/service/samo_service.h"

#include <fcntl.h>
#include <unistd.h>

#include <string>
#include <utility>
#include <vector>

#include "base/command_line.h"
#include "base/functional/bind.h"
#include "base/json/json_reader.h"
#include "base/json/json_writer.h"
#include "base/logging.h"
#include "base/process/launch.h"
#include "base/task/bind_post_task.h"
#include "base/task/thread_pool.h"
#include "content/public/browser/browser_thread.h"

namespace samo {

SamoService::SamoService(const base::FilePath& node_path, const base::FilePath& service_path, const base::FilePath& data_dir, std::vector<std::string> extra_args)
    : node_path_(node_path), service_path_(service_path), data_dir_(data_dir), extra_args_(std::move(extra_args)) {}

SamoService::~SamoService() {
  if (stdin_fd_ >= 0)
    close(stdin_fd_);
  if (process_.IsValid())
    process_.Terminate(0, /*wait=*/false);
  // stdout 读线程在 read() 返回 0/-1 后自行结束
}

bool SamoService::Start() {
  int in_pipe[2];   // 父写 → 子读（子的 stdin）
  int out_pipe[2];  // 子写 → 父读（子的 stdout）
  if (pipe(in_pipe) != 0 || pipe(out_pipe) != 0) {
    LOG(ERROR) << "[samo-service] pipe() failed";
    return false;
  }
  base::CommandLine cmd(node_path_);
  cmd.AppendArgPath(service_path_);
  cmd.AppendArg("--data-dir");
  cmd.AppendArgPath(data_dir_);
  for (const std::string& a : extra_args_) cmd.AppendArg(a);
  base::LaunchOptions options;
  options.fds_to_remap.emplace_back(in_pipe[0], STDIN_FILENO);
  options.fds_to_remap.emplace_back(out_pipe[1], STDOUT_FILENO);
  process_ = base::LaunchProcess(cmd, options);
  close(in_pipe[0]);
  close(out_pipe[1]);
  if (!process_.IsValid()) {
    LOG(ERROR) << "[samo-service] failed to launch " << service_path_;
    close(in_pipe[1]);
    close(out_pipe[0]);
    return false;
  }
  stdin_fd_ = in_pipe[1];
  stdout_fd_ = out_pipe[0];
  writer_ = base::ThreadPool::CreateSequencedTaskRunner({base::MayBlock(), base::TaskPriority::USER_VISIBLE});
  base::ThreadPool::PostTask(
      FROM_HERE, {base::MayBlock(), base::TaskPriority::USER_VISIBLE, base::WithBaseSyncPrimitives()},
      base::BindOnce(&SamoService::ReadLoop, stdout_fd_, content::GetUIThreadTaskRunner({}), weak_factory_.GetWeakPtr()));
  LOG(INFO) << "[samo-service] started pid=" << process_.Pid();
  return true;
}

// 阻塞读循环（ThreadPool）：按行切分，逐行投回 UI 线程
void SamoService::ReadLoop(int fd, scoped_refptr<base::SequencedTaskRunner> ui, base::WeakPtr<SamoService> self) {
  std::string buffer;
  char chunk[4096];
  while (true) {
    const ssize_t n = read(fd, chunk, sizeof(chunk));
    if (n <= 0)
      break;
    buffer.append(chunk, static_cast<size_t>(n));
    size_t pos;
    while ((pos = buffer.find('\n')) != std::string::npos) {
      std::string line = buffer.substr(0, pos);
      buffer.erase(0, pos + 1);
      ui->PostTask(FROM_HERE, base::BindOnce(&SamoService::OnLine, self, std::move(line)));
    }
  }
  close(fd);
}

void SamoService::Send(base::DictValue message) {
  if (stdin_fd_ < 0 || !writer_)
    return;
  std::optional<std::string> json = base::WriteJson(message);
  if (!json)
    return;
  *json += '\n';
  writer_->PostTask(FROM_HERE, base::BindOnce(
                                   [](int fd, std::string data) {
                                     size_t off = 0;
                                     while (off < data.size()) {
                                       const ssize_t n = write(fd, data.data() + off, data.size() - off);
                                       if (n <= 0)
                                         return;
                                       off += static_cast<size_t>(n);
                                     }
                                   },
                                   stdin_fd_, std::move(*json)));
}

void SamoService::Request(base::DictValue message, ResultCallback callback) {
  const int id = next_id_++;
  message.Set("id", id);
  pending_[id] = std::move(callback);
  Send(std::move(message));
}

void SamoService::Invoke(const base::DictValue& command, ResultCallback callback) {
  base::DictValue m;
  m.Set("kind", "invoke");
  m.Set("command", command.Clone());
  Request(std::move(m), std::move(callback));
}
void SamoService::Query(const base::DictValue& query, ResultCallback callback) {
  base::DictValue m;
  m.Set("kind", "query");
  m.Set("query", query.Clone());
  Request(std::move(m), std::move(callback));
}
void SamoService::GetState(ResultCallback callback) {
  base::DictValue m;
  m.Set("kind", "getState");
  Request(std::move(m), std::move(callback));
}
void SamoService::GetChat(ResultCallback callback) {
  base::DictValue m;
  m.Set("kind", "getChat");
  Request(std::move(m), std::move(callback));
}
void SamoService::SendLayout(const std::string& module) {
  base::DictValue m;
  m.Set("kind", "layout");
  m.Set("module", module);
  Send(std::move(m));
}
void SamoService::SendContext(const std::string& active_url, const std::string& active_title, int tab_count) {
  base::DictValue ctx;
  ctx.Set("activeUrl", active_url);
  ctx.Set("activeTitle", active_title);
  ctx.Set("tabCount", tab_count);
  base::DictValue m;
  m.Set("kind", "context");
  m.Set("context", std::move(ctx));
  Send(std::move(m));
}
void SamoService::ReplyHost(int id, base::Value result) {
  base::DictValue m;
  m.Set("kind", "hostReply");
  m.Set("id", id);
  m.Set("result", std::move(result));
  Send(std::move(m));
}

void SamoService::OnLine(const std::string& line) {
  std::optional<base::Value> parsed = base::JSONReader::Read(line, base::JSON_PARSE_RFC);
  if (!parsed || !parsed->is_dict())
    return;
  base::DictValue& msg = parsed->GetDict();
  if (std::optional<int> id = msg.FindInt("id"); id && !msg.FindString("kind")) {
    auto it = pending_.find(*id);
    if (it != pending_.end()) {
      ResultCallback cb = std::move(it->second);
      pending_.erase(it);
      base::Value* result = msg.Find("result");
      std::move(cb).Run(result ? std::move(*result) : base::Value());
    }
    return;
  }
  const std::string* kind = msg.FindString("kind");
  if (!kind)
    return;
  if (*kind == "state") {
    if (const base::DictValue* s = msg.FindDict("state"))
      for (Observer& o : observers_) o.OnServiceState(*s);
  } else if (*kind == "chat") {
    if (const base::DictValue* c = msg.FindDict("chat"))
      for (Observer& o : observers_) o.OnServiceChat(*c);
  } else if (*kind == "event") {
    if (const base::DictValue* e = msg.FindDict("event"))
      for (Observer& o : observers_) o.OnServiceEvent(*e);
  } else if (*kind == "host") {
    const base::DictValue* r = msg.FindDict("request");
    std::optional<int> id = msg.FindInt("id");
    if (r && id)
      for (Observer& o : observers_) o.OnHostRequest(*id, *r);
  }
}

}  // namespace samo
