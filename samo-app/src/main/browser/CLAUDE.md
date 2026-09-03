# browser/
> L2 | 父级: ../CLAUDE.md

浏览器的心脏。store 是纯数据（零 Electron 依赖，可单测），engine 把它与 WebContentsView 的真实世界缝合，view-events 只做事件投影，history/downloads 是两翼，persistence 只认 JSON。

关键决策：
- 分区模型：标签的全局顺序只在同一分区内有意义（收藏 identityId=null / Identity 固定区 / 文件夹 / 散装），placeTab 是唯一的移动原语，pin/favorite/move/进出文件夹都是它的特例。
- 冷标签（discarded）：落盘恢复后不创建 WebContents，首次激活才加载；关闭固定/收藏标签 = 回到冷态，关闭散装标签进入可重开栈（⇧⌘T）。
- Identity 即 task identity：ownership 三值与 ego-browser 逐字对齐，agent Identity 的活动标签由 reconcileBackground 压到壳之下继续绘制。
- 部分补丁经 compact() 剔除 undefined 键，调用方传 { name: undefined } 不会抹掉字段。
- 地址映射：对外永远是 `samo://newtab`，真实加载地址只在 engine 内换算。

## 成员清单
store.ts: BrowserStore——Identity（有序）/Folder/Tab/Download/已关闭栈/活动项/布局/peek/dark 的内存真相；sectionTabs/placeTab/neighborOf/mruTabs；toPersisted/hydrate（v2，兼容 v1）。
engine.ts: BrowserEngine——标签（create/activate/selectTab/close 系列/reopen/navigate/pin/favorite/move/rename/duplicate/mute/switchMru）、文件夹、Identity（create/activate/step/update/reorder/delete/接管/交还）的全部动作；视图生命周期与后台层对账；titleOf/copyUrl。
view-events.ts: wireTabEvents——webContents 事件 → Tab 字段（url/title/favicon/loading/audible/history）、window.open → 同 Identity 新标签。
history.ts: HistoryStore——http(s) 主框架访问记录，search 给地址栏出建议，history.json 落盘，上限 5000。
downloads.ts: DownloadManager——will-download 投影进 store，open/reveal/cancel/clear。
persistence.ts: loadJson / loadState（v3 或 v1/v2 legacy）/ createSaver<T>——400ms 防抖 + tmp→rename 原子写。

法则: 成员完整·一行一文件·父级链接·技术词前置
网页缩放（engine.zoom）作用于当前呈现的视图，Chromium 按站点记住级别。
后台层规则（engine.reconcileBackground）：所有已加载但未呈现的视图都挂在壳之下，未挂窗口的视图视口为 0×0 会让页面布局残缺。
呈现规则（engine.present）：每个维度呈现自己的标签——浏览器 = 身份的活动标签，应用 = 当前应用在本身份里的 appId 标签，其他维度 = 无；activateTab 收到应用标签时切到应用维度而不改浏览器活动标签。

浏览器体验层（phi 靠自家 Chromium 原生壳自带，Electron 默认缺失、Samo 逐项补齐）：
- view-events.ts：window.open 去向（⌘点击后台标签 / 前台标签 / 带尺寸的 OAuth 弹窗放行为真弹窗保住 opener）、HTML5 全屏铺满整窗、悬停链接地址、主框架加载失败换 Samo 错误页（newtab.html?error=）、未知协议交给系统、页内查找结果、网页右键菜单。
- page-context-menu.ts：showPageContextMenu——链接 / 图片 / 选中文字（复制、搜索）/ 可编辑区（拼写建议 + 剪切复制粘贴）/ 页面（后退前进重载、打印）/ 检查元素。
- permissions.ts：installPermissions——无害权限静默放行，摄像头/麦克风/定位/通知/剪贴板读取等首次按站点弹原生询问并落盘 permissions.json。
- view-events.ts 的 window.open 处理：具名或带尺寸的弹窗（OAuth / 微信登录授权窗）放行为真弹窗，**继承开启标签的 session**（登录态/cookie 全程一致，否则授权完主页面不知道已登录），归属壳窗口、居中、保住 window.opener；普通链接落成标签；外部协议交给系统。
- net-trace.ts：开发态诊断（SAMO_TRACE_NET=1）——主/子框架与 xhr 的重定向、响应头（含 XFO/CSP）、失败原因打到主进程日志，专治「网页某块空白却无报错」；生产态零开销。
- engine：findInPage/stopFind/print/zoom/swipe（三指轻扫前进后退），hoverUrl 与 find 结果进快照。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
