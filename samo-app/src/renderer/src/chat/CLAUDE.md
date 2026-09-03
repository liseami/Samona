# chat/
> L2 | 父级: ../../CLAUDE.md

对话面板本体与浮层外壳，逐 class 复刻 Laper 的 AgentChat / AIFloatingPanelShell 并换成 Samo 的令牌（银灰范式：药丸与极光只用中性灰）。浮层页（chat.html，跑在透明子窗口里）由 ChatShell 承载药丸与面板的同宿变形；壳内停靠卡直接渲染 ChatPanel；状态镜像自主进程 ChatStore。

## 成员清单
ChatPanel.tsx: ChatPanel(variant)——PanelHeader（burger 会话抽屉 / 标题 / 新对话 / Maximize=停靠 或 Minimize=浮出 / Chevron 收起；浮窗态整条 drag）→ MessageList（gap-4 px-4 py-4，贴底跟随阈值 64px、token 增长 ≤1Hz）→ UserBubble（右对齐、primary 6% 淡底 + 10% 边 + 顶部 1px 内高光、bubble-in 入场）/ AssistantMessage（无气泡 prose-samo，react-markdown + gfm，结束后复制工具条）/ ToolBubble（Laper ToolCallBubble：agent 每一步浏览器动作的胶囊——图标 + label + 运行 spinner/完成绿勾/失败红叉，点标签展开脚本输出，Eye 切到 agent 身份围观）/ ThinkingBubble（三点 + 轮换词；工具运行中不叠加）/ HintBubble（warning/info 胶囊）/ KeyCard（无密钥时的接入卡：密钥经 chat.setApiKey 只落主进程）/ WelcomeEmpty（3D 倾斜全息卡 36:9 + 三行文案，无建议芯片；needsKey 时带接入卡）→ Composer（p-2 外距，rounded-[20px] bg-card，hash 种子 xorshift32 每 700ms 的呼吸辉光，field-sizing 自增高上限 280，Enter 发送 / Shift+Enter 换行 / Esc 停止，圆形 primary 发送钮与停止钮模糊互换，回形针占位）→ SessionDrawer（scrim + 85% 宽滑入，3s 内两次点击才删）；生成中底部 1/3 aurora。
ChatShell.tsx: 浮层根——外壳恒以内容尺寸渲染（inset bleed 留给阴影），snapshot.mode 与「窗口已满尺寸」共同决定 scale(sx, sy)（药丸尺寸 / 内容尺寸，锚点右下）；底纹 + 阴影层与内容淡切、Fab 反缩放保形；开 gentle/drawer、关 quick/standard，窗口尺寸突变的那一帧与从停靠回来不播；展开态 ResizeGrips 四边八角热区把屏幕坐标换算成内容矩形交给 chat.setBounds。
Fab.tsx: Laper FAB 药丸的 Samo 版——primary 三段渐变 + PrismaticBurst 银灰光线层 + Kumo 白色受光层 + 悬停光晕脉冲 + 双弧 spinner + 未读角标。
store.ts: useChat 镜像、bindChat()、chatSend()。
main.tsx: 浮层页引导（透明底、同步 html.dark，挂载 ChatShell）。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
