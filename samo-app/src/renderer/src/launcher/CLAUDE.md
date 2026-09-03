# launcher/
> L2 | 父级: ../../CLAUDE.md

右下角的对话入口。主窗口里一块透明的 WebContentsView（药丸 130×44 + 24px 阴影呼吸区），只在 closed 形态可见——Laper 里 FAB 与面板是同一个节点，展开后 FAB 即面板，所以浮窗/停靠时它隐藏。

## 成员清单
Launcher.tsx: Laper FAB 药丸——rounded-3xl、primary 受光渐变底、跟手高光、顶部 1px 内高光、primary 40% 的 20px 投影、ArrowLeftUp 18 + "Samo AI" text-sm font-semibold、AI 忙时双弧 spinner、未读角标；点击打开浮窗（⌘I 同）。
main.tsx: 引导（透明底、同步 html.dark）。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
