# launcher/
> L2 | 父级: ../../CLAUDE.md

右下角的对话入口。跑在主进程 LauncherWindow 的透明子窗口里（药丸 130×44 + 12px 呼吸区），钉在主窗口内容区右下角，只在 closed 形态可见；点击即切到 floating，面板窗口在同一个角落出现。

## 成员清单
Launcher.tsx: 药丸页根——Fab 居于呼吸区之内；AI 忙态与未读来自对话快照。
main.tsx: 引导（透明底、同步 html.dark）。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
