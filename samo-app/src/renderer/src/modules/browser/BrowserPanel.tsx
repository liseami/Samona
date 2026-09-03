/**
 * [INPUT]: 依赖 ../../icons 的 Plus，../../store/browser 的 useBrowser/send/selectActiveIdentity/selectActiveTab，../../components/ui/{button,kbd}，./TabOverview
 * [OUTPUT]: 对外提供 BrowserPanel 组件：浏览器模块的面板体——layout.overview 时渲染标签矩阵；有活动标签时渲染空（网页视图叠在面板上）；否则显示身份空态（New Tab 开命令面板）
 * [POS]: modules/browser 的面板；真正的网页由主进程的 WebContentsView 承载
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Plus } from '../../icons';
import { selectActiveIdentity, selectActiveTab, send, useBrowser } from '../../store/browser';
import { Button } from '../../components/ui/button';
import { Kbd } from '../../components/ui/kbd';
import { TabOverview } from './TabOverview';

export function BrowserPanel() {
  const identity = useBrowser(selectActiveIdentity);
  const activeTab = useBrowser(selectActiveTab);
  const overview = useBrowser((s) => s.snapshot?.layout.overview ?? false);
  if (overview) return <TabOverview />;
  if (activeTab) return null;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-2 text-lg font-medium text-foreground">{identity?.name ?? ''}</div>
      <div className="mb-5 max-w-80 text-sm leading-relaxed text-muted-foreground">This identity is empty. Open something to get started.</div>
      <Button variant="primary" size="medium" onClick={() => send({ type: 'palette.open', mode: 'newTab' })} className="no-drag">
        <Plus size={14} /> New Tab <Kbd className="ml-1 border-primary-foreground/30 bg-transparent text-primary-foreground/80">⌘T</Kbd>
      </Button>
    </div>
  );
}
