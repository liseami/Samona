# preload/
> L2 | 父级: ../../CLAUDE.md

沙盒渲染器与主进程之间的窄门。只转发四件事，不含业务逻辑；构建为 CJS（electron.vite.config 强制），因为沙盒 preload 不支持 ESM。

## 成员清单
index.ts: contextBridge.exposeInMainWorld('samo', SamoBridge)——invoke(Command)、getState()、onState()、onEvent()、platform。
index.d.ts: 全局声明 window.samo，供渲染层类型感知。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
