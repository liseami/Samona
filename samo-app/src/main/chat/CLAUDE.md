# chat/
> L2 | 父级: ../CLAUDE.md

AI 对话——agent 与用户交互的基石。真相在主进程：线程、消息、流式追加、形态（closed / floating / docked）都在 ChatStore；三处 UI（右下角 launcher 视图、独立子窗口的浮窗页、壳内停靠卡）只读同一份快照，切换形态不丢对话。回答者是 ChatProvider 插槽，现在是本地回声 StubProvider，接模型或 agent 网关时只换实现。

形态与承载：
- closed：只显示主窗口右下角的 launcher（透明 WebContentsView 里的 Laper FAB 药丸）。
- floating：ChatWindow——主窗口的子窗口（永远在其上、随其移动、可拖出应用之外、可自由缩放），无边框不透明圆角带系统阴影（Electron 的透明窗口既不能缩放也没有阴影）。默认几何取 Laper：高 = 主窗口 2/3、宽按 9:16、右下角留 1.5rem。
- docked：壳在面板卡右侧渲染第四张 SoftPanel，主进程把内容区右侧让出 dockWidth + gap。

## 成员清单
store.ts: ChatStore——线程/消息/流式/形态/未读/停靠宽度；append/appendDelta/finish；toPersisted/hydrate（chat.json v1）。
provider.ts: ChatProvider 接口（stream(history, signal) 逐段产出）与 StubProvider（逐词回声，18ms/词）。
service.ts: ChatService——send（用户消息 → 流式回答，AbortController 可停）、stop、线程操作、形态切换；ChatStore 的唯一写者。
window.ts: ChatWindow——浮窗子窗口的创建/显示/隐藏/几何记忆；关闭即隐藏并把形态回到 closed。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
