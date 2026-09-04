// [INPUT]: 依赖 ./samo_ui_dev.h，base::CommandLine，base::FilePath，base::ReadFileToString，base::ThreadPool，base::RefCountedString，content::WebUIDataSource
// [OUTPUT]: MaybeServeShellFromDisk 的实现：ShouldHandle 对所有路径返回 true；Handle 在线程池读 <dir>/<path>（空路径→webui.html），读到就回 RefCountedString，读不到回空（浏览器给 404）
// [POS]: samo/webui 的开发态旁路实现
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
#include "samo/webui/samo_ui_dev.h"

#include <string>

#include "base/command_line.h"
#include "base/files/file_path.h"
#include "base/files/file_util.h"
#include "base/functional/bind.h"
#include "base/memory/ref_counted_memory.h"
#include "base/task/thread_pool.h"
#include "content/public/browser/web_ui_data_source.h"

namespace samo {

namespace {

scoped_refptr<base::RefCountedMemory> ReadShellFile(const base::FilePath& dir,
                                                    const std::string& path) {
  const std::string rel = path.empty() ? "webui.html" : path;
  std::string data;
  if (!base::ReadFileToString(dir.AppendASCII(rel), &data))
    return nullptr;
  return base::MakeRefCounted<base::RefCountedString>(std::move(data));
}

void HandleShellRequest(const base::FilePath& dir,
                        const std::string& path,
                        content::WebUIDataSource::GotDataCallback callback) {
  base::ThreadPool::PostTaskAndReplyWithResult(
      FROM_HERE, {base::MayBlock(), base::TaskPriority::USER_VISIBLE},
      base::BindOnce(&ReadShellFile, dir, path), std::move(callback));
}

}  // namespace

bool MaybeServeShellFromDisk(content::WebUIDataSource* source) {
  const base::CommandLine* cl = base::CommandLine::ForCurrentProcess();
  if (!cl->HasSwitch(kSamoWebUIDirSwitch))
    return false;
  const base::FilePath dir = cl->GetSwitchValuePath(kSamoWebUIDirSwitch);
  source->SetRequestFilter(
      base::BindRepeating([](const std::string&) { return true; }),
      base::BindRepeating(&HandleShellRequest, dir));
  return true;
}

}  // namespace samo
