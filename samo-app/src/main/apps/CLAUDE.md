# apps/
> L2 | 父级: ../CLAUDE.md

「应用」维度的主进程侧：Samo 的产品主张是把用户 vibe coding 出来的工作台收进侧栏，这里是第一步——把正在 localhost 上跑的应用找出来、投影成 store 里的 apps/activeAppId。网页本身仍由浏览器引擎承载：一张应用卡 = 当前身份里一个带 appId 的标签——不进浏览器侧栏、不改浏览器的活动标签，只在应用维度由引擎呈现（每个维度呈现自己的标签），登录态、历史、agent 网关全部照用。云端（Samo 部署）列表预留。

## 成员清单
scanner.ts: scanLocalApps(excludePorts)——lsof 枚举监听端口（NAME 列 *:port / 127.0.0.1:port / [::1]:port）→ 并发 HTTP 探测根路径（700ms 超时）→ 只收 text/html，名字取 <title>（无则进程名），logo 取 <link rel=icon> 或 /favicon.ico；按端口排除 Samo 自己的开发服务器与已知非网页端口。
service.ts: AppsService——启动扫描，应用维度里 12s 重扫、其余 60s；固定项落盘 userData/apps.json 并与扫描结果合并（固定在前，没在跑的标 offline）；open(id) 在当前身份复用该应用的标签或新建带 appId 的标签（不进浏览器侧栏），交给引擎在应用维度呈现；openInBrowser(id) 在浏览器维度开普通标签；pin(id, pinned)；进入应用维度且无选中时默认打开第一张。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
