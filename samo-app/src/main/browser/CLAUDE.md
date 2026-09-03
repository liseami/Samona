# browser/
> L2 | 父级: ../CLAUDE.md

浏览器的心脏。store 是纯数据（零 Electron 依赖，可单测），engine 把它与 WebContentsView 的真实世界缝合，view-events 只做事件投影，history/downloads 是两翼，persistence 只认 JSON。

关键决策：
- 分区模型：标签的全局顺序只在同一分区内有意义（收藏 spaceId=null / Space 固定区 / 文件夹 / 散装），placeTab 是唯一的移动原语，pin/favorite/move/进出文件夹都是它的特例。
- 冷标签（discarded）：落盘恢复后不创建 WebContents，首次激活才加载；关闭固定/收藏标签 = 回到冷态，关闭散装标签进入可重开栈（⇧⌘T）。
- Space 即 task space：ownership 三值与 ego-browser 逐字对齐，agent Space 的活动标签由 reconcileBackground 压到壳之下继续绘制。
- 部分补丁经 compact() 剔除 undefined 键，调用方传 { name: undefined } 不会抹掉字段。
- 地址映射：对外永远是 `samo://newtab`，真实加载地址只在 engine 内换算。

## 成员清单
store.ts: BrowserStore——Space（有序）/Folder/Tab/Download/已关闭栈/活动项/布局/peek/dark 的内存真相；sectionTabs/placeTab/neighborOf/mruTabs；toPersisted/hydrate（v2，兼容 v1）。
engine.ts: BrowserEngine——标签（create/activate/selectTab/close 系列/reopen/navigate/pin/favorite/move/rename/duplicate/mute/switchMru）、文件夹、Space（create/activate/step/update/reorder/delete/接管/交还）的全部动作；视图生命周期与后台层对账；titleOf/copyUrl。
view-events.ts: wireTabEvents——webContents 事件 → Tab 字段（url/title/favicon/loading/audible/history）、window.open → 同 Space 新标签。
history.ts: HistoryStore——http(s) 主框架访问记录，search 给地址栏出建议，history.json 落盘，上限 5000。
downloads.ts: DownloadManager——will-download 投影进 store，open/reveal/cancel/clear。
persistence.ts: loadJson / loadState / createSaver<T>——400ms 防抖 + tmp→rename 原子写。

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
