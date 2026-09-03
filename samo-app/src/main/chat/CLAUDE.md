# chat/
> L2 | 父级: ../CLAUDE.md

AI 对话——agent 与用户交互的基石。真相在主进程：线程、消息（文字 + 工具胶囊）、流式追加、形态（closed / floating / docked）都在 ChatStore；两处 UI（透明子窗口里的浮层页——药丸与面板同宿、壳内停靠卡）只读同一份快照，切换形态不丢对话。回答者是 ChatProvider 插槽：有 Anthropic 密钥时是 AgentProvider（Claude 驱动，唯一工具 = 写一段 ego-browser 脚本交给 samo-browser 运行时，真正驱动浏览器），没有时是 KeylessProvider（引导语 + UI 接入卡），StubProvider 留给链路自测。

形态与承载（切换由 ChatChoreographer 指挥，曲线/时长取 shared/motion）：
- closed / floating：同一张 ChatWindow——主窗口的透明、无边框子窗口，页内是 Laper AIFloatingPanelShell 的复刻：外壳恒以内容尺寸渲染，收起走 scaleX/scaleY 到药丸（锚点右下），药丸反缩放保形。窗口 = 内容矩形四周各加阴影呼吸区（面板 bleed 24，药丸 bleedPill 12）：展开前先把窗口放大到面板尺寸（页面看到满尺寸才播变形），收起后页内先变形、窗口缩到药丸再飞回主窗口右下角——药丸永远钉在角落，面板只记尺寸、永远从角落长出；两态都是普通的整窗接收鼠标，不依赖 setIgnoreMouseEvents 的悬停切换。透明窗口没有原生阴影与缩放：阴影页内画，缩放靠页内四边八角热区 → chat.setBounds（内容矩形）。为什么不是主窗口内的 WebContentsView：Electron 的 NonClientHitTest 会遍历所有网页视图的拖拽区，壳根节点整片 `.drag`，落在其上的真实按下会被当作拖标题栏，视图层永远收不到（CDP 注入的点击绕过命中测试，自动化测试是假阳性）。
- docked：壳在面板卡右侧渲染第四张 SoftPanel（dock-in 入场），主进程把内容区右侧让出 dockWidth + gap；浮层先飞到停靠槽再交给卡片，回来时从停靠槽飞回安放位。

## 成员清单
store.ts: ChatStore——线程/消息/流式/形态/未读/停靠宽度/回答者能力（needsKey、model）；append/appendDelta/finish/remove/appendTool/updateTool/stopStreaming；toPersisted/hydrate（chat.json v1，工具字段可选）。
provider.ts: ChatProvider 接口（stream(history, signal, {threadId}) 产出 ChatDelta：text / tool.start / tool.end）、StubProvider（逐词回声）、KeylessProvider（未配密钥的引导语）。
agent-provider.ts: AgentProvider——@anthropic-ai/sdk 流式手写 agent 循环：文字增量即时产出；`browser` 工具（label + script，strict）→ ScriptRunner 子进程执行 → tool_result 回填；thinking adaptive；最多 30 轮；typed error 转人话。
prompt.ts: buildSystemPrompt——Samo AI 的宪法：身份、ego-browser 1.2.5 运行时地图（page/locator/browser/taskSpaces/fetch/cdp）、正确性法则、task space（本线程固定名，默认不 complete，用户可在侧栏看）、控制权交接（用户接管即硬停）、当前浏览器上下文。
config.ts: ChatConfigStore——userData/config.json（0600）里的 anthropicApiKey/model；resolveKey 先文件后 ANTHROPIC_API_KEY；DEFAULT_MODEL claude-opus-5。
service.ts: ChatService——send（用户消息 → ChatDelta 流 → 文字消息与工具胶囊：tool.start 收束当前文字、tool.end 收束胶囊并立刻占位新文字让思考指示不断）、stop、线程操作、形态切换、setProvider 热切换；ChatStore 的唯一写者。
window.ts: ChatWindow——透明子窗口：expand()/shrink() 内容矩形 ↔ 窗口矩形（按态取 bleed）；ensure/fitExpanded/fitCollapsed/setContentBounds/restBounds（尺寸记住、锚在角落）/pillBounds/currentPillBounds/bounds/defaultBounds/rememberBounds/hide/showAt/focus/send/window；主窗口 resize 时药丸跟着右下角走。
choreographer.ts: ChatChoreographer——init 在壳就绪后放出药丸；apply(snapshot)：closed → floating 先 fitExpanded 再聚焦，floating → closed 等页内变形（DUR.quick）后 clampIntoParent 缩窗，floating ↔ docked 用 animateBounds（窗口矩形 = expand(内容)）飞向/飞出停靠槽；代数计数中止被打断的旧动画。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
