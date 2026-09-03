# chat/
> L2 | 父级: ../CLAUDE.md

AI 对话——agent 与用户交互的基石。真相在主进程：线程、消息（文字 + 工具胶囊）、流式追加、形态（closed / floating / docked）都在 ChatStore；三处 UI（右下角 launcher 子窗口、独立子窗口的浮窗页、壳内停靠卡）只读同一份快照，切换形态不丢对话。回答者是 ChatProvider 插槽：有 Anthropic 密钥时是 AgentProvider（Claude 驱动，唯一工具 = 写一段 ego-browser 脚本交给 samo-browser 运行时，真正驱动浏览器），没有时是 KeylessProvider（引导语 + UI 接入卡），StubProvider 留给链路自测。

形态与承载（切换由 ChatChoreographer 编舞，曲线/时长取 shared/motion）：
- closed：只显示 LauncherWindow——主窗口的透明、不可聚焦子窗口里的 Laper FAB 药丸。用子窗口而非主窗口内的 WebContentsView，因为 Electron 的 NonClientHitTest 会遍历所有网页视图的拖拽区：壳根节点整片 `.drag`，落在药丸上的真实按下会被窗口当作拖标题栏，视图层的 launcher 永远收不到（CDP 注入的点击绕过命中测试，所以自动化测试是假阳性）。
- floating：ChatWindow——主窗口的子窗口（永远在其上、随其移动、可拖出应用之外、可自由缩放），无边框不透明圆角带系统阴影。打开时从药丸矩形长出，收起时缩回药丸。
- docked：壳在面板卡右侧渲染第四张 SoftPanel（dock-in 入场），主进程把内容区右侧让出 dockWidth + gap；浮窗先飞到停靠槽再交给卡片。

## 成员清单
store.ts: ChatStore——线程/消息/流式/形态/未读/停靠宽度/回答者能力（needsKey、model）；append/appendDelta/finish/remove/appendTool/updateTool/stopStreaming；toPersisted/hydrate（chat.json v1，工具字段可选）。
provider.ts: ChatProvider 接口（stream(history, signal, {threadId}) 产出 ChatDelta：text / tool.start / tool.end）、StubProvider（逐词回声）、KeylessProvider（未配密钥的引导语）。
agent-provider.ts: AgentProvider——@anthropic-ai/sdk 流式手写 agent 循环：文字增量即时产出；`browser` 工具（label + script，strict）→ ScriptRunner 子进程执行 → tool_result 回填；thinking adaptive；最多 30 轮；typed error 转人话。
prompt.ts: buildSystemPrompt——Samo AI 的宪法：身份、ego-browser 1.2.5 运行时地图（page/locator/browser/taskSpaces/fetch/cdp）、正确性法则、task space（本线程固定名，默认不 complete，用户可在侧栏看）、控制权交接（用户接管即硬停）、当前浏览器上下文。
config.ts: ChatConfigStore——userData/config.json（0600）里的 anthropicApiKey/model；resolveKey 先文件后 ANTHROPIC_API_KEY；DEFAULT_MODEL claude-opus-5。
service.ts: ChatService——send（用户消息 → ChatDelta 流 → 文字消息与工具胶囊：tool.start 收束当前文字、tool.end 收束胶囊并立刻占位新文字让思考指示不断）、stop、线程操作、形态切换、setProvider 热切换；ChatStore 的唯一写者。
window.ts: ChatWindow——浮窗子窗口：showAt/restBounds/rememberBounds/close/focus/window，关闭即隐藏并把形态回到 closed。
launcher-window.ts: LauncherWindow——药丸子窗口：钉在主窗口内容区右下角随其移动/缩放，透明、不可聚焦（点击不夺网页焦点），setVisible/phase(launcherIn|launcherOut)。
choreographer.ts: ChatChoreographer——apply(snapshot)：形态变化编成窗口几何动画（animateBounds）+ 页内相位事件（chatPhase）；代数计数中止被打断的旧动画。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
