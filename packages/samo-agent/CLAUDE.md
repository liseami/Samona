# packages/samo-agent/
> L2 | 父级: ../../CLAUDE.md

`samo-browser` 命令行：让任何 AI agent CLI（Claude Code / Codex / Cursor…）驱动 Samo。它复用 npm 上的 `ego-browser-v2`（ego lite 开源的 CDP harness，MIT）作为全部 helper 运行时，自己只补 ego lite 闭源 app 里那半个 `globalThis.ego` 宿主绑定——一个连向 Samo 主进程 agent 网关的 WebSocket 客户端。依赖方向：samo-app 只 `import type` 本包的 protocol，本包不知道 samo-app 的存在。

用法（与 ego-browser 完全一致）：
```
samo-browser <<'JS'
const task = await useOrCreateTaskSpace('inspect example')
await openOrReuseTab('https://example.com', { wait: true })
console.log(await snapshot())
JS
```

## 成员清单
src/protocol.ts: 网关线形契约——GatewayPointer 指针文件（url/token/pid/version）、RpcRequest（方法调用或 `{cdp}` 透传）、RpcResponse、ServerPush；resolvePointerPath 按平台定位 userData 下的 agent-gateway.json，可用 SAMO_GATEWAY_FILE 覆盖。
src/host.ts: connectHost()——读指针文件、带 token 连上网关、返回 ego 宿主对象：sendCDPMessage 走 `{cdp}` 帧，onCDPMessage 收 `{event:'cdp'}` 推送，其余方法（listTabs/createTab/snapshot/task space 全家桶、Samo 扩展 captureWindow/useShell…）各是一次带 id 的 RPC。错误保留 error_code 供 ego-browser 识别硬停。
src/cli.ts: 可执行入口。定位 ego-browser-v2 的 dist/src/run.js，skill 工作区指向本包 build 生成的 workspace/（EGO_BROWSER_AGENT_WORKSPACE），先连网关再注入 globalThis.ego，最后把 stdin 交给 runMain；兼容 `samo-browser nodejs` 前缀写法。

scripts/sync-workspace.mjs: 从 npm 包复制 learnings/references/SKILL.md 到 workspace/，并重写 agent_helpers.js 为对 npm 包的裸导入（上游相对路径在 npm 布局下断裂）。

法则: 成员完整·一行一文件·父级链接·技术词前置
package.json 的 exports 除 `./protocol`（网关线形类型）外还暴露 `./cli`（dist/cli.js）：samo-app 主进程的 ScriptRunner 用 require.resolve('samo-agent/cli') 定位它，应用内的 Samo AI 与终端里的外部 agent 跑的是同一个入口。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
