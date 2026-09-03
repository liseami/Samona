# agent/
> L2 | 父级: ../CLAUDE.md

让外部 AI agent 驱动 Samo 的网关。ego-browser-v2（ego lite 开源的 harness）以为自己在和一个支持 flatten 会话的 Chromium 对话，并且宿主提供 `globalThis.ego`；这里就是那个宿主的服务端：传输（gateway）→ 语义（session）→ 协议适配（cdp-bridge）→ 页面之眼（snapshot）。设计取自 phi 的 AgentCDP（指针文件发现、会话凭证、ownership、captureWindow）并补上 phi 缺的服务端按 Identity 过滤 target。

数据流：CLI `{cdp}` 帧 → session.handleCdp → CdpBridge：无 sessionId 的 Target.*/Browser.* 在本地仿真（getTargets 只列选中 Identity 的标签），带 sessionId 的命令路由到该标签的 webContents.debugger；debugger 事件回推为 `{event:'cdp'}`。

## 成员清单
gateway.ts: AgentGateway——127.0.0.1 随机端口的 ws 服务；启动时写 userData/agent-gateway.json（url/token/pid，0600），连接需 ?token=（timingSafeEqual）；每连接一个 AgentSession，分发 `{id,method,params}` RPC，错误保留 error_code。
session.ts: AgentSession——ego 宿主方法表（listTabs/createTab/snapshot/listTaskSpaces/createTaskSpace/useTaskSpace/claimTaskSpace/completeTaskSpace/closeTaskSpace/handOffTaskSpace/takeOverTaskSpace/setAgentTaskState/getBrowserVersion…）+ Samo 扩展 captureWindow（壳与当前标签各存 PNG）与 useShell('shell'|'overlay')（仅 SAMO_DEBUG_SHELL=1：把壳或命令面板当 target，用于 agent 驱动 UI 做端到端测试）；按连接持有 selectedSpaceId，所有可见性以它为界；guardSelected 产出 ego 识别的错误码（未选中/用户接管/已交还）。
cdp-bridge.ts: CdpBridge——Target 域仿真与会话铸造：attachToTarget 铸 sessionId 并附着 debugger，子会话（Target.attachedToTarget）按所属附着透传，detach/destroyed 回收并推 detachedFromTarget。
snapshot.ts: buildSnapshot——Accessibility.getFullAXTree 压成缩进文本，可交互/有名节点带 [ref=@backendNodeId]，refs 回填 ego 的 RefMap；是 ego lite 内核级快照的 CDP 近似，可替换。
task-identities.ts: Identity ↔ task identity 线形换算、EGO_CODE 错误码表、egoError（resolved 形）与 EgoRejection（reject 形）。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
