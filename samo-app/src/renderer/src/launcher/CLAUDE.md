# launcher/
> L2 | 父级: ../../CLAUDE.md

右下角的对话入口。跑在主进程 LauncherWindow 子窗口里（透明、不可聚焦、钉在主窗口内容区右下角），药丸 130×44 + 24px 阴影呼吸区，只在 closed 形态可见——Laper 里 FAB 与面板是同一个节点，Samo 里由 ChatChoreographer 把「药丸淡出 ↔ 浮窗从药丸长出/缩回」编成一段连续动画。

## 成员清单
Launcher.tsx: Laper FAB 药丸的 Samo 版——底层 primary→agent 渐变、PrismaticBurst 炫彩层（blur 6px，performance high，agent 色系）、Kumo 白色受光层（上亮下透 + 顶部 1px 高光）、悬停光晕脉冲（launcher-pulse）、agent 色 40% 的 20px 投影、ArrowLeftUp 18 + "Samo AI"、AI 忙时双弧 spinner、未读角标；chatPhase 事件驱动 launcher-in/out；点击打开浮窗（⌘I 同）。
main.tsx: 引导（透明底、同步 html.dark）。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
