# chat/
> L2 | 父级: ../CLAUDE.md

AI 对话——agent 与用户交互的基石。真相在主进程：线程、消息（文字 + 工具胶囊）、流式追加、形态（closed / floating / docked）都在 ChatStore；三处 UI（药丸子窗口、面板子窗口、壳内停靠卡）只读同一份快照，切换形态不丢对话。回答者是 ChatProvider 插槽：有 Anthropic 密钥时是 AgentProvider（Claude 驱动，唯一工具 = 写一段 ego-browser 脚本交给 samo-browser 运行时，真正驱动浏览器），没有时是 KeylessProvider（引导语 + UI 接入卡），StubProvider 留给链路自测。

形态与承载（由 ChatChoreographer 一一对应，无开合动画，切换即到位）：
- closed：LauncherWindow——主窗口的透明子窗口，只有药丸 + 12px 呼吸区那么大，钉在主窗口内容区右下角。为什么是子窗口而不是主窗口内的视图：macOS 上鼠标命中按 NSView 挂载顺序、不按 Electron 的 z 顺序，压在网页之上的视图收不到真实点击；为什么这么小：透明区域也会挡住网页的鼠标。
- floating：ChatWindow——主窗口的不透明子窗口（永远在其上、随其移动、可拖出应用之外、原生拖边缩放、原生圆角与阴影）。大面积浮层一律不透明；位置永远锚在右下角（药丸处），只记住用户调过的尺寸。关闭即隐藏并把焦点还给主窗口。
- docked：壳在面板卡右侧渲染第四张 SoftPanel（dock-in 入场），主进程把内容区右侧让出 dockWidth + gap。
曾走过的弯路：透明大窗口 + 页内 scaleX/scaleY 变形（Laper 复刻）——bleed/尺寸状态/resize 事件/焦点归还处处脆弱，用户看到的是压扁的面板与失焦的壳；已废。

## 成员清单
store.ts: ChatStore——线程/消息/流式/形态/未读/停靠宽度/回答者能力（needsKey、model）；append/appendDelta/finish/remove/appendTool/updateTool/stopStreaming；toPersisted/hydrate（chat.json v1，工具字段可选）。
provider.ts: ChatProvider 接口（stream(history, signal, {threadId}) 产出 ChatDelta：text / tool.start / tool.end）、StubProvider（逐词回声）、KeylessProvider（未配密钥的引导语）。
agent-provider.ts: AgentProvider——@anthropic-ai/sdk 流式手写 agent 循环：文字增量即时产出；`browser` 工具（label + script，strict）→ ScriptRunner 子进程执行 → tool_result 回填；thinking adaptive；最多 30 轮；typed error 转人话。
prompt.ts: buildSystemPrompt——Samo AI 的宪法：身份、ego-browser 1.2.5 运行时地图（page/locator/browser/taskSpaces/fetch/cdp）、正确性法则、task space（本线程固定名，默认不 complete，用户可在侧栏看）、控制权交接（用户接管即硬停）、当前浏览器上下文。
config.ts: ChatConfigStore——userData/config.json（0600）里的 anthropicApiKey/model；resolveKey 先文件后 ANTHROPIC_API_KEY；DEFAULT_MODEL claude-opus-5。
service.ts: ChatService——send（用户消息 → ChatDelta 流 → 文字消息与工具胶囊：tool.start 收束当前文字、tool.end 收束胶囊并立刻占位新文字让思考指示不断）、stop、线程操作、形态切换、setProvider 热切换；ChatStore 的唯一写者。
window.ts: ChatWindow——不透明子窗口：showAt/restBounds（尺寸记住、锚在角落）/defaultBounds/rememberSize/close（隐藏 + 焦点归还主窗口）/focus/send/window/isOpen；关闭事件即隐藏并把形态回到 closed。
launcher-window.ts: LauncherWindow——药丸子窗口：pillBounds 钉在主窗口内容区右下角，随其 resize/show/focus 同步；setVisible/webContents/send。
choreographer.ts: ChatChoreographer——init 在壳就绪后按形态放出；apply(snapshot)：closed = 药丸；floating = 面板窗口在安放位并聚焦；docked = 停靠卡；同形态重复快照只同步停靠宽度并兜底药丸可见。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
