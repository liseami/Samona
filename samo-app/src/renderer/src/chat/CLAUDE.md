# chat/
> L2 | 父级: ../../CLAUDE.md

对话面板本体，逐 class 复刻 Laper 的 AgentChat 并换成 Samo 的令牌。浮窗页（chat.html，跑在子窗口里）与壳内停靠卡共用同一份 ChatPanel，只有头部动作与拖拽区随形态变化；状态镜像自主进程 ChatStore。

## 成员清单
ChatPanel.tsx: ChatPanel(variant)——PanelHeader（burger 会话抽屉 / 标题 / 新对话 / Maximize=停靠 或 Minimize=浮出 / Chevron 收起；浮窗态整条 drag）→ MessageList（gap-4 px-4 py-4，贴底跟随阈值 64px、token 增长 ≤1Hz）→ UserBubble（右对齐、primary 6% 淡底 + 10% 边 + 顶部 1px 内高光、bubble-in 入场）/ AssistantMessage（无气泡 prose-samo，react-markdown + gfm，结束后复制工具条）/ ThinkingBubble（三点 + 轮换词）/ HintBubble（warning/info 胶囊）/ WelcomeEmpty（3D 倾斜全息卡 36:9 + 三行文案，无建议芯片）→ Composer（p-2 外距，rounded-[20px] bg-card，hash 种子 xorshift32 每 700ms 的呼吸辉光，field-sizing 自增高上限 280，Enter 发送 / Shift+Enter 换行 / Esc 停止，圆形 primary 发送钮与停止钮模糊互换，回形针占位）→ SessionDrawer（scrim + 85% 宽滑入，3s 内两次点击才删）；生成中底部 1/3 aurora。
store.ts: useChat 镜像、bindChat()、chatSend()。
main.tsx: 浮窗页引导（同步 html.dark）。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
