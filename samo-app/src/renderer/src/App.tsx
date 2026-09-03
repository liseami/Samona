/**
 * [INPUT]: 依赖 react，./store/browser 的 useBrowser/selectActiveSpace/selectActiveTab，./components/sidebar/{Sidebar,EdgePeek}，./components/EmptySpace，./components/ui/tooltip 的 TooltipProvider，@shared/model 的 SPACE_COLOR_HEX
 * [OUTPUT]: 对外提供 App 根组件：侧栏（或折叠态的贴边热区 + 顶部拖拽条）+ 内容区占位（真正的网页由主进程的 WebContentsView 叠在其上）；把系统外观写成 html.dark，活动 Space 强调色写入 --space
 * [POS]: renderer 壳的合成层
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect } from 'react';
import { SPACE_COLOR_HEX } from '@shared/model';
import { Sidebar } from './components/sidebar/Sidebar';
import { EdgePeek } from './components/sidebar/EdgePeek';
import { EmptySpace } from './components/EmptySpace';
import { TooltipProvider } from './components/ui/tooltip';
import { cn } from './lib/utils';
import { selectActiveSpace, selectActiveTab, useBrowser } from './store/browser';

export default function App() {
  const snapshot = useBrowser((s) => s.snapshot);
  const space = useBrowser(selectActiveSpace);
  const activeTab = useBrowser(selectActiveTab);

  useEffect(() => {
    document.documentElement.style.setProperty('--space', SPACE_COLOR_HEX[space?.color ?? 'blue']);
  }, [space?.color]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', !!snapshot?.dark);
  }, [snapshot?.dark]);

  if (!snapshot) return <div className="h-full w-full bg-background" />;

  const collapsed = snapshot.layout.sidebarCollapsed && !snapshot.sidebarPeek;
  return (
    <TooltipProvider delayDuration={600} skipDelayDuration={300}>
      <div className="flex h-full w-full bg-background">
        {collapsed ? <EdgePeek /> : <Sidebar />}
        {/* ---- 内容区：与主进程 contentBounds 同几何（四周 GUTTER 10、折叠时顶部 10+32 / 圆角 12）；卡片底与阴影由壳绘制，网页视图叠在其上。z-10 让阴影盖过定位的侧栏而不被切割 ---- */}
        <main className={cn('relative z-10 m-2.5 flex-1', collapsed && 'mt-[42px]')}>
          <div className="panel-shadow h-full w-full rounded-[12px] bg-card">{!activeTab && <EmptySpace spaceName={space?.name ?? ''} />}</div>
        </main>
      </div>
    </TooltipProvider>
  );
}
