/**
 * [INPUT]: 依赖 react，./store/browser 的 useBrowser/selectActiveIdentity/selectActiveTab，./components/sidebar/{Sidebar,EdgePeek}，./components/EmptyState，./components/ui/tooltip 的 TooltipProvider，@shared/model 的 IDENTITY_COLOR_HEX
 * [OUTPUT]: 对外提供 App 根组件：Laper MainLayout 结构——整窗 bg-sidebar，侧栏（或折叠态贴边热区）+ 右侧 py-2 pr-2 的面板（bg-panel + rounded-xl + border/50，真正的网页由主进程的 WebContentsView 内缩 1px 叠在其上）；把系统外观写成 html.dark，活动身份强调色写入 --identity
 * [POS]: renderer 壳的合成层
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect } from 'react';
import { IDENTITY_COLOR_HEX } from '@shared/model';
import { Sidebar } from './components/sidebar/Sidebar';
import { EdgePeek } from './components/sidebar/EdgePeek';
import { EmptyState } from './components/EmptyState';
import { TooltipProvider } from './components/ui/tooltip';
import { cn } from './lib/utils';
import { selectActiveIdentity, selectActiveTab, useBrowser } from './store/browser';

export default function App() {
  const snapshot = useBrowser((s) => s.snapshot);
  const identity = useBrowser(selectActiveIdentity);
  const activeTab = useBrowser(selectActiveTab);

  useEffect(() => {
    document.documentElement.style.setProperty('--identity', IDENTITY_COLOR_HEX[identity?.color ?? 'blue']);
  }, [identity?.color]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', !!snapshot?.dark);
  }, [snapshot?.dark]);

  if (!snapshot) return <div className="h-full w-full bg-background" />;

  const collapsed = snapshot.layout.sidebarCollapsed && !snapshot.sidebarPeek;
  return (
    <TooltipProvider delayDuration={600} skipDelayDuration={300}>
      {/* ---- Laper MainLayout：整窗底色 = sidebar 色，面板（panel）靠色阶与 1px 边线浮起；gutter 是外层的 py-2 pr-2，左侧不留（侧栏自己的 px-2 即间隙） ---- */}
      <div className="flex h-full w-full bg-sidebar">
        {collapsed ? <EdgePeek /> : <Sidebar />}
        <div className={cn('relative z-10 min-w-0 flex-1 py-2 pr-2', collapsed ? 'pl-2 pt-10' : 'pl-0')}>
          {/* 与主进程 contentBounds 同几何：网页视图内缩 1px 叠在面板上，露出面板的边线；圆角 12 = rounded-xl */}
          <div className="h-full w-full overflow-hidden rounded-xl border border-border/50 bg-panel shadow-sm">{!activeTab && <EmptyState identityName={identity?.name ?? ''} />}</div>
        </div>
      </div>
    </TooltipProvider>
  );
}
