/**
 * [INPUT]: 依赖 ./boot（先装桥），./session-prelude（session 落本地），./bridge 的 emitLocalEvent，../overlay/main（弹层页的启动引导）
 * [OUTPUT]: 无导出；chrome://samo-overlay 的入口——装桥、挂页，然后按 URL 查询串（?open=palette&mode=…&url=… / ?open=userMenu）自触发 openPalette / openUserMenu；文档尺寸随内容（气泡 ShouldAutoResizeHost）
 * [POS]: WebUI 宿主的弹层入口：Electron 里意图由主进程事件投递，fork 里气泡每次新建、意图随 URL 来
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import './boot';
import './session-prelude';
import { emitLocalEvent } from './bridge';
import '../overlay/main';

// 气泡按文档首选尺寸自动调整：html/body/#root 不能是 100% 高（否则永远报告视口的 1px），一律随内容
for (const el of [document.documentElement, document.body, document.getElementById('root')]) {
  if (!el) continue;
  el.style.width = 'max-content';
  el.style.height = 'auto';
  el.style.minHeight = '0';
}
const q = new URLSearchParams(location.search);
const open = q.get('open');
// 同步发出：监听者未就绪时由 bridge 排队，React mount 后冲掉（不能靠 rAF——气泡未显示时它不跑）
if (open === 'palette') emitLocalEvent({ type: 'openPalette', mode: (q.get('mode') as 'newTab' | 'editUrl' | 'searchTabs') ?? 'newTab', url: q.get('url') ?? '' });
if (open === 'userMenu') emitLocalEvent({ type: 'openUserMenu', left: 0, bottom: 0 });
