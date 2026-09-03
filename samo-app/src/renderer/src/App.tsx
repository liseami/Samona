/**
 * [INPUT]: 依赖 react，@shared/model 的 IDENTITY_COLOR_HEX/RAIL_WIDTH，./store/browser 的 useBrowser/selectActiveIdentity，./shell/{Header,NavRail,EdgePeek,Resizer}，./modules/registry 的 MODULE_REGISTRY，./components/ui/tooltip 的 TooltipProvider，./lib/utils 的 cn
 * [OUTPUT]: 对外提供 App 根组件：三层壳——左列（Header → NavRail | 当前模块的侧栏）+ 右侧面板（bg-panel + rounded-xl + border/50，浏览器模块时网页视图内缩 1px 叠在其上）；折叠态 Header 横贯整窗、rail 仍在；写入 html.dark 与 --identity
 * [POS]: renderer 壳的合成层；Samo = 身份 × 模块，浏览器只是 MODULE_REGISTRY 里的一项
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect } from 'react';
import { IDENTITY_COLOR_HEX, RAIL_WIDTH } from '@shared/model';
import { cn } from './lib/utils';
import { selectActiveIdentity, useBrowser } from './store/browser';
import { Header } from './shell/Header';
import { NavRail } from './shell/NavRail';
import { EdgePeek } from './shell/EdgePeek';
import { Resizer } from './shell/Resizer';
import { MODULE_REGISTRY } from './modules/registry';
import { TooltipProvider } from './components/ui/tooltip';

export default function App() {
  const snapshot = useBrowser((s) => s.snapshot);
  const identity = useBrowser(selectActiveIdentity);

  useEffect(() => {
    document.documentElement.style.setProperty('--identity', IDENTITY_COLOR_HEX[identity?.color ?? 'blue']);
  }, [identity?.color]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', !!snapshot?.dark);
  }, [snapshot?.dark]);

  if (!snapshot) return <div className="h-full w-full bg-sidebar" />;

  const collapsed = snapshot.layout.sidebarCollapsed && !snapshot.sidebarPeek;
  const def = MODULE_REGISTRY[snapshot.layout.module];
  return (
    <TooltipProvider delayDuration={600} skipDelayDuration={300}>
      {/* ---- Laper MainLayout：整窗底色 = sidebar 色；左列 = Header + (NavRail | 模块侧栏)；右侧面板靠色阶与 1px 边线浮起 ---- */}
      <div className="flex h-full w-full bg-sidebar">
        {collapsed ? (
          <>
            <Header collapsed />
            <div className="flex h-full w-10 shrink-0 flex-col pt-10">
              <NavRail />
            </div>
            <EdgePeek />
          </>
        ) : (
          <div className="relative flex h-full shrink-0 flex-col" style={{ width: RAIL_WIDTH + snapshot.layout.sidebarWidth }}>
            <Header />
            <div className="flex min-h-0 flex-1">
              <NavRail />
              <def.Sidebar />
            </div>
            <Resizer />
          </div>
        )}
        <div className={cn('relative z-10 min-w-0 flex-1 py-2 pr-2', collapsed ? 'pl-2 pt-10' : 'pl-0')}>
          <div className="h-full w-full overflow-hidden rounded-xl border border-border/50 bg-panel shadow-sm">
            <def.Panel />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
