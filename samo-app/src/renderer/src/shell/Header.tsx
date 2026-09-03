/**
 * [INPUT]: 依赖 @shared/model 的 HEADER_HEIGHT，../icons 的 SidebarClose/SidebarOpen，../store/browser 的 send，../components/ui/{button,tooltip}，../lib/utils 的 cn，./WindowControls
 * [OUTPUT]: 对外提供 Header 组件：侧栏卡的 h-10 头部行（Laper PanelHeader：border-b）——自绘红绿灯（左）+ 侧栏折叠/展开（右）；双击空白处缩放窗口；折叠态成为面板卡之上的独立控制条。模块的导航/地址/工具在面板卡自己的 PanelHeader 里
 * [POS]: shell 的顶行；红绿灯、侧栏图标与面板头部在同一条 40px 基线上
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { HEADER_HEIGHT } from '@shared/model';
import { SidebarClose, SidebarOpen } from '../icons';
import { cn } from '../lib/utils';
import { send } from '../store/browser';
import { Button } from '../components/ui/button';
import { Tip } from '../components/ui/tooltip';
import { WindowControls } from './WindowControls';

export function Header({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      className={cn('drag flex shrink-0 items-center gap-0.5 pr-2 pl-3', collapsed ? 'rounded-2xl' : 'border-b border-border')}
      style={{ height: HEADER_HEIGHT }}
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) send({ type: 'window.zoom', fullscreen: false });
      }}
    >
      <WindowControls />
      <div className="flex-1" />
      <Tip label={collapsed ? 'Show sidebar ⌘S' : 'Hide sidebar ⌘S'}>
        <Button variant="icon" className="no-drag text-muted-foreground" onClick={() => send({ type: 'layout.sidebar', collapsed: !collapsed })}>
          {collapsed ? <SidebarOpen size={15} /> : <SidebarClose size={15} />}
        </Button>
      </Tip>
    </div>
  );
}
