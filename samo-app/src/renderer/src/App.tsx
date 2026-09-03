/**
 * [INPUT]: 依赖 react，@shared/model 的 IDENTITY_COLOR_HEX，./store/browser 的 useBrowser/selectActiveIdentity，./chat/store 的 useChat/bindChat，./chat/ChatPanel，./shell/{Header,NavRail,EdgePeek,Resizer,DockResizer}，./modules/registry 的 MODULE_REGISTRY，./components/ui/tooltip 的 TooltipProvider
 * [OUTPUT]: 对外提供 App 根组件：Laper ProjectEditorShell 结构——页面底 bg-sidebar，一行 gap-2 pt-2 pb-2 pl-0 pr-2：NavRail（与底同色）| 侧栏卡（SoftPanel：Header h-10 + 模块侧栏）| 面板卡（SoftPanel：模块的 PanelHeader h-10 + 面板体；浏览器模块时网页视图从头部下方内缩 1px 叠在其上）| 停靠时的对话卡（第四张 SoftPanel）；折叠态侧栏卡消失，控制条横在面板卡之上；写入 html.dark 与 --identity
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
import { ChatPanel } from './chat/ChatPanel';
import { DockResizer } from './shell/DockResizer';
import { bindChat, useChat } from './chat/store';

/** Laper SoftPanel：所有卡片同一质感 */
const SOFT_PANEL = 'rounded-2xl border border-border bg-panel shadow-sm';

export default function App() {
  const snapshot = useBrowser((s) => s.snapshot);
  const identity = useBrowser(selectActiveIdentity);
  const chat = useChat((s) => s.snapshot);
  useEffect(() => bindChat(), []);

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
            <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${SOFT_PANEL}`}>
              {def.PanelHeader && <def.PanelHeader />}
              <div className="relative min-h-0 flex-1">
                <def.Panel />
              </div>
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
            <div className={`relative flex h-full min-w-0 flex-1 flex-col overflow-hidden ${SOFT_PANEL}`}>
              {def.PanelHeader && <def.PanelHeader />}
              <div className="relative min-h-0 flex-1">
                <def.Panel />
              </div>
            </div>
          </>
        )}
        {/* ---- 停靠的 AI 对话：面板卡右侧的第四张同质卡，左缘可拖宽 ---- */}
        {chat?.mode === 'docked' && (
          <div className="relative h-full min-h-0 shrink-0" style={{ width: chat.dockWidth }}>
            <DockResizer width={chat.dockWidth} />
            <div className={`dock-in h-full overflow-hidden ${SOFT_PANEL}`}>
              <ChatPanel variant="docked" />
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
