/**
 * [INPUT]: 依赖 react，@shared/model 的 IDENTITY_COLOR_HEX，./store/browser 的 useBrowser/selectActiveIdentity，./shell/{Header,NavRail,EdgePeek,Resizer}，./modules/registry 的 MODULE_REGISTRY，./components/ui/tooltip 的 TooltipProvider，./lib/utils 的 cn
 * [OUTPUT]: 对外提供 App 根组件：Laper ProjectEditorShell 结构——页面底 bg-sidebar，一行 gap-2 pt-2 pb-2 pl-0 pr-2：NavRail（与底同色）| 侧栏卡（SoftPanel：Header h-12 + 模块侧栏）| 面板卡（SoftPanel，浏览器模块时网页视图内缩 1px 叠在其上）；折叠态侧栏卡消失，控制条横在面板卡之上；写入 html.dark 与 --identity
 * [POS]: renderer 壳的合成层；Samo = 身份 × 模块，浏览器只是 MODULE_REGISTRY 里的一项
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect } from 'react';
import { IDENTITY_COLOR_HEX } from '@shared/model';
import { selectActiveIdentity, useBrowser } from './store/browser';
import { Header } from './shell/Header';
import { NavRail } from './shell/NavRail';
import { EdgePeek } from './shell/EdgePeek';
import { Resizer } from './shell/Resizer';
import { MODULE_REGISTRY } from './modules/registry';
import { TooltipProvider } from './components/ui/tooltip';

/** Laper SoftPanel：所有卡片同一质感 */
const SOFT_PANEL = 'rounded-2xl border border-border bg-panel shadow-sm';

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
      {/* ---- 页面底：bg-sidebar；顶部 pt-2 的空档也是窗口拖拽区 ---- */}
      <div className="drag flex h-full w-full gap-2 bg-sidebar pt-2 pb-2 pl-0 pr-2">
        <NavRail />
        {collapsed ? (
          <div className="relative flex min-w-0 flex-1 flex-col gap-2">
            <Header collapsed />
            <EdgePeek />
            <div className={`min-h-0 flex-1 overflow-hidden ${SOFT_PANEL}`}>
              <def.Panel />
            </div>
          </div>
        ) : (
          <>
            <div className="relative h-full min-h-0 shrink-0" style={{ width: snapshot.layout.sidebarWidth }}>
              <div className={`flex h-full flex-col overflow-hidden ${SOFT_PANEL}`}>
                <Header />
                <def.Sidebar />
              </div>
              <Resizer />
            </div>
            <div className={`relative h-full min-w-0 flex-1 overflow-hidden ${SOFT_PANEL}`}>
              <def.Panel />
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
